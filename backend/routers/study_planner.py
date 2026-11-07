from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
from models import User, StudyPlan, StudySession, Collection, Document, Flashcard, Quiz, QuizQuestion
from schemas import (
    StudyPlanRequest, StudyPlanResponse, StudyPlanListResponse, StudyPlanUpdateRequest,
    StudySessionRequest, StudySessionResponse, StudySessionListResponse,
    RecommendationsResponse, WeakTopicItem, FocusQuizRequest, QuizResponse,
)
from utils.auth import get_current_user
from services.ai_service import generate_quiz
from routers.ai_quiz import get_quiz_by_id

router = APIRouter(prefix="/study-plan", tags=["Study Planner"])


def _validate_collection(db: Session, current_user: User, collection_id: int) -> Collection:
    collection = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == current_user.id,
    ).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


def _collection_document_ids(db: Session, current_user: User, collection_id: int) -> list[int]:
    return [
        row[0] for row in db.query(Document.id).filter(
            Document.collection_id == collection_id,
            Document.user_id == current_user.id,
        ).all()
    ]


def _due_flashcards_for_documents(db: Session, doc_ids: list[int], limit: int = 20):
    if not doc_ids:
        return []
    now = datetime.now(timezone.utc)
    return (
        db.query(Flashcard)
        .filter(Flashcard.document_id.in_(doc_ids))
        .filter(or_(Flashcard.next_review_at.is_(None), Flashcard.next_review_at <= now))
        .order_by(Flashcard.next_review_at.is_(None).desc(), Flashcard.next_review_at.asc())
        .limit(limit)
        .all()
    )


def _missed_questions_for_documents(db: Session, doc_ids: list[int], limit: int = 15):
    if not doc_ids:
        return []
    rows = (
        db.query(QuizQuestion, Document.id, Document.title)
        .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
        .join(Document, Quiz.document_id == Document.id)
        .filter(Document.id.in_(doc_ids), QuizQuestion.is_correct == False)  # noqa: E712
        .all()
    )
    grouped = {}
    for question, doc_id, doc_title in rows:
        key = question.question.strip().lower()
        if key not in grouped:
            grouped[key] = {
                "question_id": question.id,
                "question": question.question,
                "correct_answer": question.correct_answer,
                "document_id": doc_id,
                "document_title": doc_title,
                "missed_count": 0,
            }
        grouped[key]["missed_count"] += 1

    return sorted(grouped.values(), key=lambda x: -x["missed_count"])[:limit]


@router.get("", response_model=StudyPlanListResponse)
def get_study_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plans = db.query(StudyPlan).filter(StudyPlan.user_id == current_user.id).all()
    return {"plans": plans, "total": len(plans)}

@router.post("", response_model=StudyPlanResponse)
def create_study_plan(
    request: StudyPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if request.collection_id is not None:
        _validate_collection(db, current_user, request.collection_id)

    plan = StudyPlan(
        user_id=current_user.id,
        collection_id=request.collection_id,
        subject=request.subject,
        exam_date=request.exam_date,
        daily_hours=request.daily_hours,
        status="active",
        progress=0.0
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.put("/{plan_id}", response_model=StudyPlanResponse)
def update_study_plan(
    plan_id: int,
    request: StudyPlanUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")

    if request.collection_id is not None:
        _validate_collection(db, current_user, request.collection_id)

    for field in ("subject", "exam_date", "daily_hours", "status", "collection_id"):
        value = getattr(request, field)
        if value is not None:
            setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return plan

@router.delete("/{plan_id}")
def delete_study_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")

    db.delete(plan)
    db.commit()
    return {"status": "success"}

@router.get("/{plan_id}/sessions", response_model=StudySessionListResponse)
def get_study_sessions(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")

    sessions = db.query(StudySession).filter(StudySession.plan_id == plan_id).order_by(StudySession.date.desc()).all()
    return {"sessions": sessions, "total": len(sessions)}


@router.get("/{plan_id}/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Surface due flashcards and previously-missed quiz questions for a plan's linked collection."""
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")

    if plan.collection_id is None:
        return RecommendationsResponse(plan_id=plan_id, due_flashcards=[], weak_topics=[], recommended_quiz_available=False)

    doc_ids = _collection_document_ids(db, current_user, plan.collection_id)
    due = _due_flashcards_for_documents(db, doc_ids)
    weak = _missed_questions_for_documents(db, doc_ids)

    weak_items = [
        WeakTopicItem(
            question_id=w["question_id"],
            question=w["question"],
            document_id=w["document_id"],
            document_title=w["document_title"],
            missed_count=w["missed_count"],
        )
        for w in weak
    ]

    return RecommendationsResponse(
        plan_id=plan_id,
        due_flashcards=due,
        weak_topics=weak_items,
        recommended_quiz_available=bool(due) or bool(weak_items),
    )


@router.post("/{plan_id}/focus-quiz", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def create_focus_quiz(
    plan_id: int,
    request: FocusQuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a quiz targeting this plan's due flashcards and previously-missed questions."""
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")

    if plan.collection_id is None:
        raise HTTPException(status_code=400, detail="This plan isn't linked to a collection yet")

    doc_ids = _collection_document_ids(db, current_user, plan.collection_id)
    due = _due_flashcards_for_documents(db, doc_ids)
    weak = _missed_questions_for_documents(db, doc_ids)

    if not due and not weak:
        raise HTTPException(
            status_code=400,
            detail="No weak content yet — review some flashcards or take a quiz first",
        )

    blob_parts = [f"Q: {f.front}\nA: {f.back}" for f in due]
    blob_parts += [f"Q: {w['question']}\nA: {w['correct_answer']}" for w in weak]
    blob = "\n\n".join(blob_parts)

    try:
        questions_data = generate_quiz(blob, "mixed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

    target_document = (
        db.query(Document)
        .filter(Document.id.in_(doc_ids))
        .order_by(Document.created_at.desc())
        .first()
    )
    if not target_document:
        raise HTTPException(status_code=400, detail="No documents in this plan's collection")

    questions_data = questions_data[:request.max_questions]

    quiz = Quiz(
        document_id=target_document.id,
        title=f"Focus Quiz: {plan.subject}",
        total_questions=len(questions_data),
        is_focus_quiz=True,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    for q_data in questions_data:
        db.add(QuizQuestion(
            quiz_id=quiz.id,
            question=q_data.get("question", ""),
            question_type=q_data.get("question_type", "multiple_choice"),
            option_a=q_data.get("option_a", ""),
            option_b=q_data.get("option_b", ""),
            option_c=q_data.get("option_c", ""),
            option_d=q_data.get("option_d", ""),
            correct_answer=q_data.get("correct_answer", ""),
        ))
    db.commit()

    return get_quiz_by_id(quiz.id, db)


@router.post("/session", response_model=StudySessionResponse)
def log_study_session(
    request: StudySessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(StudyPlan).filter(StudyPlan.id == request.plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")

    session = StudySession(
        plan_id=request.plan_id,
        date=request.date,
        topic=request.topic,
        hours_spent=request.hours_spent,
        completed=request.completed
    )
    db.add(session)
    db.flush()

    # Progress tracks logged hours against hours planned so far (daily_hours x days elapsed
    # since the plan was created, capped at the exam date), not a flat per-session increment.
    total_hours_logged = db.query(
        func.coalesce(func.sum(StudySession.hours_spent), 0.0)
    ).filter(StudySession.plan_id == plan.id).scalar()

    plan_start = plan.created_at.date()
    today = date.today()
    total_days = max(1, (plan.exam_date - plan_start).days + 1)
    elapsed_days = max(1, min((today - plan_start).days + 1, total_days))
    planned_hours_to_date = elapsed_days * plan.daily_hours

    plan.progress = min(100.0, round((total_hours_logged / planned_hours_to_date) * 100, 1))

    db.commit()
    db.refresh(session)
    return session
