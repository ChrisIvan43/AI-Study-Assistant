"""
StudyCraft inactivity email reminders.

Sends one reminder after one day and another after five days
without a successful login. Reminder delivery is independent
of email verification status.
"""

import html
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from models import User
from services.email_service import EmailDeliveryError, send_email


logger = logging.getLogger(__name__)

BATCH_SIZE = 500


def _as_utc(value: datetime) -> datetime:
    """Normalize database datetimes to timezone-aware UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _send_reminder(
    db: Session,
    user_id: int,
    reminder_days: int,
    now: datetime,
) -> str:
    """
    Lock and process one user's reminder threshold.

    The marker is committed only after the email service confirms
    successful delivery. A failed delivery remains eligible for retry.
    """
    marker_column = (
        User.last_1_day_reminder_at
        if reminder_days == 1
        else User.last_5_day_reminder_at
    )

    try:
        user = (
            db.query(User)
            .filter(
                User.id == user_id,
                func.lower(User.role) == "student",
            )
            .with_for_update(skip_locked=True)
            .first()
        )

        if not user or not user.last_login_at:
            return "skipped"

        last_login = _as_utc(user.last_login_at)
        marker = getattr(user, marker_column.key)

        # A marker from an older inactivity period must not block
        # a reminder for the current period.
        if marker is not None and _as_utc(marker) >= last_login:
            return "skipped"

        if now < last_login + timedelta(days=reminder_days):
            return "skipped"

        safe_name = html.escape(user.name or "there")
        subject = (
            "Your StudyCraft study journey is waiting"
            if reminder_days == 1
            else "It's been 5 days — let's get back to studying"
        )

        if reminder_days == 1:
            body = (
                f"Hi {user.name or 'there'},\n\n"
                "It's been a day since your last StudyCraft login. "
                "A short study session today can help you keep your "
                "learning momentum going.\n\n"
                "Log in to StudyCraft and continue where you left off.\n\n"
                "Keep learning,\nThe StudyCraft Team"
            )
            heading = "Your learning momentum matters"
            message = (
                "It's been one day since your last StudyCraft login. "
                "Even a short study session can help you stay on track."
            )
        else:
            body = (
                f"Hi {user.name or 'there'},\n\n"
                "It's been five days since your last StudyCraft login. "
                "Your study goals are still waiting for you. Come back "
                "and take one small step toward them today.\n\n"
                "Log in to StudyCraft to continue learning.\n\n"
                "We're cheering you on,\nThe StudyCraft Team"
            )
            heading = "Ready to get back on track?"
            message = (
                "It's been five days since your last StudyCraft login. "
                "Your study goals are still waiting for you."
            )

        html_body = f"""
        <!DOCTYPE html>
        <html lang="en">
          <body style="margin:0;padding:32px;background:#f4f6fb;
                       font-family:Arial,sans-serif;color:#172033;">
            <div style="max-width:560px;margin:0 auto;background:#fff;
                        padding:32px;border-radius:16px;">
              <h2 style="margin-top:0;color:#2457d6;">StudyCraft</h2>
              <h3>{heading}</h3>
              <p>Hi {safe_name},</p>
              <p>{message}</p>
              <p>
                <a href="https://ai-study-assistant-9tp.pages.dev"
                   style="display:inline-block;padding:12px 20px;
                          background:#2457d6;color:#fff;
                          text-decoration:none;border-radius:8px;">
                  Continue studying
                </a>
              </p>
              <p style="color:#64748b;font-size:13px;">
                Keep learning,<br>The StudyCraft Team
              </p>
            </div>
          </body>
        </html>
        """

        send_email(
            to=user.email,
            subject=subject,
            body=body,
            html_body=html_body,
        )

        setattr(user, marker_column.key, now)
        db.commit()
        return "sent"

    except EmailDeliveryError:
        db.rollback()
        logger.warning(
            "Inactivity reminder delivery failed for user_id=%s "
            "at %s-day threshold.",
            user_id,
            reminder_days,
        )
        return "failed"

    except Exception:
        db.rollback()
        logger.exception(
            "Unexpected inactivity reminder error for user_id=%s "
            "at %s-day threshold.",
            user_id,
            reminder_days,
        )
        return "failed"




def process_hourly_inactivity_test_reminder(
    db: Session,
    test_email: str,
    now: datetime | None = None,
) -> dict:
    """
    Send an hourly inactivity TEST reminder to exactly one configured student.

    Uses last_1_day_reminder_at as the hourly test marker. This marker
    must be reset for the test account after hourly testing is disabled.
    Email verification status is deliberately not consulted.
    """
    normalized_email = (test_email or "").strip().lower()
    if not normalized_email:
        raise ValueError("A dedicated test email address is required.")

    now = _as_utc(now or datetime.now(timezone.utc))
    results = {
        "checked": 0,
        "sent": 0,
        "failed": 0,
        "skipped": 0,
    }

    try:
        user = (
            db.query(User)
            .filter(
                func.lower(User.email) == normalized_email,
                func.lower(User.role) == "student",
            )
            .with_for_update(skip_locked=True)
            .first()
        )

        if user is None:
            return results

        results["checked"] = 1

        if not user.last_login_at:
            results["skipped"] = 1
            return results

        last_login = _as_utc(user.last_login_at)
        if now < last_login + timedelta(hours=1):
            results["skipped"] = 1
            return results

        marker = user.last_1_day_reminder_at
        if marker is not None:
            marker = _as_utc(marker)
            if marker >= last_login and now < marker + timedelta(hours=1):
                results["skipped"] = 1
                return results

        safe_name = html.escape(user.name or "there")
        subject = "StudyCraft hourly inactivity TEST reminder"
        body = (
            f"Hi {user.name or 'there'},\n\n"
            "This is an hourly TEST reminder from StudyCraft. "
            "Your account has been inactive for at least one hour.\n\n"
            "Log in to StudyCraft to reset the inactivity timer.\n\n"
            "This is a temporary test message.\n"
            "The StudyCraft Team"
        )
        html_body = f"""
        <!DOCTYPE html>
        <html lang="en">
          <body style="margin:0;padding:32px;background:#f4f6fb;
                       font-family:Arial,sans-serif;color:#172033;">
            <div style="max-width:560px;margin:0 auto;background:#fff;
                        padding:32px;border-radius:16px;">
              <h2 style="margin-top:0;color:#2457d6;">StudyCraft</h2>
              <h3>Hourly inactivity TEST reminder</h3>
              <p>Hi {safe_name},</p>
              <p>
                This is a temporary test reminder. Your account has been
                inactive for at least one hour.
              </p>
              <p>
                Log in to StudyCraft to reset the inactivity timer.
              </p>
              <p style="color:#64748b;font-size:13px;">
                The StudyCraft Team
              </p>
            </div>
          </body>
        </html>
        """

        send_email(
            to=user.email,
            subject=subject,
            body=body,
            html_body=html_body,
        )

        user.last_1_day_reminder_at = now
        db.commit()
        results["sent"] = 1
        return results

    except EmailDeliveryError:
        db.rollback()
        logger.warning(
            "Hourly inactivity TEST email delivery failed for the configured test account."
        )
        results["failed"] = 1
        return results

    except Exception:
        db.rollback()
        logger.exception(
            "Unexpected hourly inactivity TEST reminder error."
        )
        results["failed"] = 1
        return results

def process_due_inactivity_reminders(
    db: Session,
    now: datetime | None = None,
) -> dict:
    """
    Process due one-day and five-day reminders for student accounts.

    Each reminder threshold has its own sent marker. If a student is
    already inactive for five days when this job runs, both overdue
    reminders can be sent once during the same run.

    Email verification status is deliberately not consulted.
    """
    now = _as_utc(now or datetime.now(timezone.utc))
    one_day_cutoff = now - timedelta(days=1)
    five_day_cutoff = now - timedelta(days=5)

    one_day_due = (
        (User.last_1_day_reminder_at.is_(None))
        | (User.last_1_day_reminder_at < User.last_login_at)
    )
    five_day_due = (
        (User.last_5_day_reminder_at.is_(None))
        | (User.last_5_day_reminder_at < User.last_login_at)
    )

    candidate_ids = [
        row[0]
        for row in (
            db.query(User.id)
            .filter(
                func.lower(User.role) == "student",
                User.last_login_at.isnot(None),
                or_(
                    (User.last_login_at <= one_day_cutoff) & one_day_due,
                    (User.last_login_at <= five_day_cutoff) & five_day_due,
                ),
            )
            .order_by(User.last_login_at.asc())
            .limit(BATCH_SIZE)
            .all()
        )
    ]

    results = {
        "checked": len(candidate_ids),
        "one_day_sent": 0,
        "five_day_sent": 0,
        "failed": 0,
        "skipped": 0,
    }

    for user_id in candidate_ids:
        for reminder_days, result_key in (
            (1, "one_day_sent"),
            (5, "five_day_sent"),
        ):
            result = _send_reminder(
                db=db,
                user_id=user_id,
                reminder_days=reminder_days,
                now=now,
            )

            if result == "sent":
                results[result_key] += 1
            elif result == "failed":
                results["failed"] += 1
            else:
                results["skipped"] += 1

    return results

