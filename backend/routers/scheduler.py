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

    result = process_due_inactivity_reminders(db)

    return {
        "success": True,
        "message": "Inactivity reminder processing completed.",
        "results": result,
    }
