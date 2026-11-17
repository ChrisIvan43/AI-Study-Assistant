from datetime import datetime, timedelta, timezone
from html import escape
from zoneinfo import ZoneInfo

from sqlalchemy import and_, or_, update
from sqlalchemy.orm import Session, joinedload

from models import ScheduledStudySession, StudyPlan, User
from services.email_service import EmailDeliveryError, send_email


MANILA_TIMEZONE = ZoneInfo("Asia/Manila")
MAX_NOTIFICATION_ATTEMPTS = 3
CLAIM_TIMEOUT_MINUTES = 10
DEFAULT_BATCH_SIZE = 50


def _database_datetime(value: datetime, db: Session) -> datetime:
    """Use naive UTC values for SQLite and aware UTC values elsewhere."""
    value = value.astimezone(timezone.utc)

    if db.bind is not None and db.bind.dialect.name == "sqlite":
        return value.replace(tzinfo=None)

    return value


def _as_utc(value: datetime) -> datetime:
    """Interpret naive database datetimes as UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _format_manila_datetime(value: datetime) -> str:
    return _as_utc(value).astimezone(MANILA_TIMEZONE).strftime(
        "%B %d, %Y at %I:%M %p"
    )


def _notification_eligibility(now_db: datetime, stale_before: datetime):
    return or_(
        ScheduledStudySession.notification_status == "pending",
        and_(
            ScheduledStudySession.notification_status == "failed",
            ScheduledStudySession.notification_attempts
            < MAX_NOTIFICATION_ATTEMPTS,
        ),
        and_(
            ScheduledStudySession.notification_status == "processing",
            ScheduledStudySession.notification_attempts
            < MAX_NOTIFICATION_ATTEMPTS,
            or_(
                ScheduledStudySession.notification_claimed_at.is_(None),
                ScheduledStudySession.notification_claimed_at
                <= stale_before,
            ),
        ),
    )


def _build_email(session: ScheduledStudySession, plan: StudyPlan):
    start_text = _format_manila_datetime(session.start_at)
    end_text = _format_manila_datetime(session.end_at)

    subject = "Your StudyCraft study session has ended!"

    body = (
        "Hello!\n\n"
        "Your scheduled StudyCraft study session has ended.\n\n"
        f"Topic: {session.topic}\n"
        f"Study plan: {plan.subject}\n"
        f"Start: {start_text} (Asia/Manila)\n"
        f"End: {end_text} (Asia/Manila)\n\n"
        "Great job making time for your studies. Keep up the progress!\n\n"
        "StudyCraft"
    )

    safe_topic = escape(session.topic)
    safe_subject = escape(plan.subject)

    html_body = f"""
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;">
        <h2>Your study session has ended!</h2>
        <p>Your scheduled StudyCraft study session is complete.</p>
        <div style="padding:16px;background:#f3f6fc;border-radius:10px;">
            <p><strong>Topic:</strong> {safe_topic}</p>
            <p><strong>Study plan:</strong> {safe_subject}</p>
            <p><strong>Start:</strong> {escape(start_text)} (Asia/Manila)</p>
            <p><strong>End:</strong> {escape(end_text)} (Asia/Manila)</p>
        </div>
        <p>Great job making time for your studies. Keep up the progress!</p>
        <p>StudyCraft</p>
    </div>
    """

    return subject, body, html_body


def process_due_study_session_notifications(
    db: Session,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> dict:
    """
    Process due, verified-user notifications using atomic database claims.

    Failed deliveries can be retried up to three total attempts.
    Processing claims older than ten minutes can be reclaimed.
    """

    if batch_size < 1 or batch_size > 500:
        raise ValueError("Batch size must be between 1 and 500.")

    now_utc = datetime.now(timezone.utc)
    stale_utc = now_utc - timedelta(minutes=CLAIM_TIMEOUT_MINUTES)

    now_db = _database_datetime(now_utc, db)
    stale_before = _database_datetime(stale_utc, db)

    eligibility = _notification_eligibility(now_db, stale_before)

    candidate_ids = (
        db.query(ScheduledStudySession.id)
        .join(
            StudyPlan,
            StudyPlan.id == ScheduledStudySession.plan_id,
        )
        .join(User, User.id == StudyPlan.user_id)
        .filter(
            ScheduledStudySession.status == "scheduled",
            ScheduledStudySession.notify_email.is_(True),
            ScheduledStudySession.end_at <= now_db,
            User.email_verified_at.isnot(None),
            eligibility,
        )
        .order_by(
            ScheduledStudySession.end_at.asc(),
            ScheduledStudySession.id.asc(),
        )
        .limit(batch_size)
        .all()
    )

    counts = {
        "selected": len(candidate_ids),
        "claimed": 0,
        "sent": 0,
        "failed": 0,
        "skipped": 0,
    }

    for (session_id,) in candidate_ids:
        claim_time = datetime.now(timezone.utc)
        claim_db = _database_datetime(claim_time, db)
        claim_stale_before = _database_datetime(
            claim_time - timedelta(minutes=CLAIM_TIMEOUT_MINUTES),
            db,
        )

        claim_result = db.execute(
            update(ScheduledStudySession)
            .where(
                ScheduledStudySession.id == session_id,
                ScheduledStudySession.status == "scheduled",
                ScheduledStudySession.notify_email.is_(True),
                ScheduledStudySession.end_at <= claim_db,
                _notification_eligibility(
                    claim_db,
                    claim_stale_before,
                ),
            )
            .values(
                notification_status="processing",
                notification_claimed_at=claim_db,
                notification_attempts=(
                    ScheduledStudySession.notification_attempts + 1
                ),
                notification_last_error=None,
            )
        )

        if claim_result.rowcount != 1:
            db.rollback()
            counts["skipped"] += 1
            continue

        db.commit()
        counts["claimed"] += 1

        scheduled = (
            db.query(ScheduledStudySession)
            .options(
                joinedload(ScheduledStudySession.plan).joinedload(
                    StudyPlan.user
                )
            )
            .filter(ScheduledStudySession.id == session_id)
            .first()
        )

        if (
            scheduled is None
            or scheduled.status != "scheduled"
            or not scheduled.notify_email
            or scheduled.plan is None
            or scheduled.plan.user is None
            or scheduled.plan.user.email_verified_at is None
        ):
            if scheduled is not None:
                scheduled.notification_status = "disabled"
                scheduled.notification_claimed_at = None
                scheduled.notification_last_error = None
                db.commit()

            counts["skipped"] += 1
            continue

        try:
            subject, body, html_body = _build_email(
                scheduled,
                scheduled.plan,
            )

            send_email(
                to=scheduled.plan.user.email,
                subject=subject,
                body=body,
                html_body=html_body,
            )

            scheduled.notification_status = "sent"
            scheduled.notification_sent_at = _database_datetime(
                datetime.now(timezone.utc),
                db,
            )
            scheduled.notification_claimed_at = None
            scheduled.notification_last_error = None

            db.commit()
            counts["sent"] += 1

        except EmailDeliveryError as exc:
            db.rollback()

            failed_session = (
                db.query(ScheduledStudySession)
                .filter(ScheduledStudySession.id == session_id)
                .first()
            )

            if failed_session is not None:
                failed_session.notification_status = "failed"
                failed_session.notification_claimed_at = None
                failed_session.notification_last_error = str(exc)[:1000]
                db.commit()

            counts["failed"] += 1

        except Exception:
            db.rollback()

            failed_session = (
                db.query(ScheduledStudySession)
                .filter(ScheduledStudySession.id == session_id)
                .first()
            )

            if failed_session is not None:
                failed_session.notification_status = "failed"
                failed_session.notification_claimed_at = None
                failed_session.notification_last_error = (
                    "Unexpected notification processing error."
                )
                db.commit()

            counts["failed"] += 1

    return counts
