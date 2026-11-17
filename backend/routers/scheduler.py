"""
Protected internal scheduler endpoints.
"""

import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from services.study_session_notifications import (
    process_due_study_session_notifications,
)

router = APIRouter(tags=["Internal Scheduler"])


@router.post("/internal/scheduler/study-session-notifications")
def run_study_session_notifications(
    scheduler_secret: str | None = Header(
        default=None,
        alias="X-StudyCraft-Scheduler-Secret",
    ),
    db: Session = Depends(get_db),
):
    """Process due study-session notifications for the external scheduler."""

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

    result = process_due_study_session_notifications(db)

    return {
        "success": True,
        "message": "Study-session notification processing completed.",
        "results": result,
    }
