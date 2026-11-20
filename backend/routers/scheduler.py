"""
Protected internal scheduler endpoints.
"""

import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from services.inactivity_reminders import (
    process_due_inactivity_reminders,
    process_hourly_inactivity_test_reminder,
)
from services.study_session_notifications import (
    process_due_study_session_notifications,
)

router = APIRouter(tags=["Internal Scheduler"])


def _verify_scheduler_secret(scheduler_secret: str | None) -> None:
    expected_secret = os.getenv("STUDYCRAFT_SCHEDULER_SECRET", "")

    if not expected_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Scheduler authentication is not configured.",
        )

    if not scheduler_secret or not hmac.compare_digest(
        scheduler_secret,
        expected_secret,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid scheduler credentials.",
        )


@router.post("/internal/scheduler/study-session-notifications")
def run_study_session_notifications(
    scheduler_secret: str | None = Header(
        default=None,
        alias="X-StudyCraft-Scheduler-Secret",
    ),
    db: Session = Depends(get_db),
):
    """Process due study-session email notifications."""

    _verify_scheduler_secret(scheduler_secret)

    result = process_due_study_session_notifications(db)

    return {
        "success": True,
        "message": "Study-session notification processing completed.",
        "results": result,
    }


@router.post("/internal/scheduler/inactivity-reminders")
def run_inactivity_reminders(
    scheduler_secret: str | None = Header(
        default=None,
        alias="X-StudyCraft-Scheduler-Secret",
    ),
    db: Session = Depends(get_db),
):
    """Process due student inactivity email reminders."""

    _verify_scheduler_secret(scheduler_secret)

    hourly_test_mode = (
        os.getenv("STUDYCRAFT_INACTIVITY_TEST_MODE", "").strip().lower()
        == "true"
    )

    if hourly_test_mode:
        test_email = os.getenv(
            "STUDYCRAFT_INACTIVITY_TEST_EMAIL", ""
        ).strip().lower()

        if not test_email:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Hourly test mode requires a configured test email.",
            )

        result = process_hourly_inactivity_test_reminder(
            db=db,
            test_email=test_email,
        )

        return {
            "success": True,
            "message": "Hourly inactivity TEST processing completed.",
            "test_recipient": test_email,
            "interval_minutes": 60,
            "results": result,
        }

    result = process_due_inactivity_reminders(db)

    return {
        "success": True,
        "message": "Inactivity reminder processing completed.",
        "results": result,
    }
