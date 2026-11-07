from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Document, Quiz, QuizQuestion
from schemas import (
    QuizRequest, QuizResponse, QuizQuestionResponse,
    QuizSubmitRequest, QuizResultResponse,
)
from utils.auth import get_current_user
from services.ai_service import generate_quiz

router = APIRouter(prefix="/quiz", tags=["AI Quiz"])


@router.post("", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def create_quiz(
    request: QuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a quiz for a document."""
    # Verify document exists and belongs to user
    document = db.query(Document).filter(
        Document.id == request.document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if not document.document_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no extractable text",
        )

    # Generate quiz via AI
    try:
        questions_data = generate_quiz(document.document_text, request.quiz_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}",
        )

    # Create quiz in database
    db_quiz = Quiz(
        document_id=request.document_id,
        title=f"Quiz: {document.title}",
        total_questions=len(questions_data),
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)

    # Create questions
    for q_data in questions_data:
        question = QuizQuestion(
            quiz_id=db_quiz.id,
            question=q_data.get("question", ""),
            question_type=q_data.get("question_type", "multiple_choice"),
            option_a=q_data.get("option_a", ""),
            option_b=q_data.get("option_b", ""),
            option_c=q_data.get("option_c", ""),
            option_d=q_data.get("option_d", ""),
            correct_answer=q_data.get("correct_answer", ""),
        )
        db.add(question)

    db.commit()

    # Return the quiz with questions
    return get_quiz_by_id(db_quiz.id, db)


def get_quiz_by_id(quiz_id: int, db: Session) -> QuizResponse:
    """Helper to build quiz response with questions."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()

    return QuizResponse(
        id=quiz.id,
        document_id=quiz.document_id,
        title=quiz.title,
        score=quiz.score,
        total_questions=quiz.total_questions,
        is_focus_quiz=quiz.is_focus_quiz,
        questions=[
            QuizQuestionResponse(
                id=q.id,
                quiz_id=q.quiz_id,
                question=q.question,
                question_type=q.question_type,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                correct_answer=None,  # Don't expose correct answers before submission
            )
            for q in questions
        ],
        created_at=quiz.created_at,
    )


@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a quiz by ID."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    # Verify the quiz document belongs to the user
    document = db.query(Document).filter(
        Document.id == quiz.document_id,
        Document.user_id == current_user.id,
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    return get_quiz_by_id(quiz_id, db)


@router.post("/{quiz_id}/submit", response_model=QuizResultResponse)
def submit_quiz(
    quiz_id: int,
    request: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit answers for a quiz and get the score."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    # Verify the quiz document belongs to the user
    document = db.query(Document).filter(
        Document.id == quiz.document_id,
        Document.user_id == current_user.id,
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    # Grade the answers
    score = 0
    total = len(request.answers)
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id,
        QuizQuestion.id.in_([a.question_id for a in request.answers]),
    ).all()

    questions_dict = {q.id: q for q in questions}
    graded_questions = []

    for answer in request.answers:
        question = questions_dict.get(answer.question_id)
        if question:
            is_correct = question.correct_answer.strip().lower() == answer.user_answer.strip().lower()
            if is_correct:
                score += 1
            question.user_answer = answer.user_answer
            question.is_correct = is_correct

            graded_questions.append(QuizQuestionResponse(
                id=question.id,
                quiz_id=question.quiz_id,
                question=question.question,
                question_type=question.question_type,
                option_a=question.option_a,
                option_b=question.option_b,
                option_c=question.option_c,
                option_d=question.option_d,
                correct_answer=question.correct_answer,
            ))

    # Update quiz score
    quiz.score = score
    quiz.total_questions = total
    db.commit()

    percentage = (score / total * 100) if total > 0 else 0

    return QuizResultResponse(
        quiz_id=quiz_id,
        score=score,
        total=total,
        percentage=round(percentage, 1),
        questions=graded_questions,
    )
