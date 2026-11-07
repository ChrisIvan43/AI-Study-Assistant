from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document, Quiz, Flashcard, StudyPlan, StudySession
from utils.auth import get_current_user
from schemas import ProgressResponse

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("", response_model=ProgressResponse)
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get aggregated progress statistics for the current user."""
    user_id = current_user.id

    # Documents
    total_documents = db.query(Document).filter(Document.user_id == user_id).count()

    # Quizzes
    quizzes = db.query(Quiz).filter(
        Quiz.document_id.in_(
            db.query(Document.id).filter(Document.user_id == user_id)
        )
    ).all()
    total_quizzes = len(quizzes)
    average_quiz_score = 0.0
    if total_quizzes > 0:
        scored_quizzes = [q for q in quizzes if q.score is not None]
        if scored_quizzes:
            average_quiz_score = round(
                sum(q.score for q in scored_quizzes) / len(scored_quizzes), 1
            )

    # Flashcards
    flashcards = db.query(Flashcard).filter(
        Flashcard.document_id.in_(
            db.query(Document.id).filter(Document.user_id == user_id)
        )
    ).all()
    total_flashcards = len(flashcards)
    mastered_flashcards = sum(1 for f in flashcards if f.mastered)

    # Study Plans & Sessions
    plans = db.query(StudyPlan).filter(StudyPlan.user_id == user_id).all()
    active_plans = sum(1 for p in plans if p.status == "active")

    # Sessions via plan
    plan_ids = [p.id for p in plans]
    sessions = []
    if plan_ids:
        sessions = db.query(StudySession).filter(
            StudySession.plan_id.in_(plan_ids)
        ).all()
    total_study_hours = round(sum(s.hours_spent for s in sessions), 1)
    completed_sessions = sum(1 for s in sessions if s.completed)

    return ProgressResponse(
        total_documents=total_documents,
        total_quizzes=total_quizzes,
        average_quiz_score=average_quiz_score,
        total_flashcards=total_flashcards,
        mastered_flashcards=mastered_flashcards,
        total_study_hours=total_study_hours,
        completed_sessions=completed_sessions,
        active_plans=active_plans,
    )
