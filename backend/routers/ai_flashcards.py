from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import User, Document, Flashcard
from schemas import (
    FlashcardRequest, FlashcardResponse, FlashcardListResponse,
    FlashcardUpdateRequest, FlashcardReviewRequest,
)
from utils.auth import get_current_user
from services.ai_service import generate_flashcards

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])

# SM-2 mastery thresholds: a card is considered "mastered" once it's been
# reviewed successfully enough times with a long enough interval.
MASTERED_MIN_REPETITIONS = 3
MASTERED_MIN_INTERVAL_DAYS = 21


@router.post("", response_model=FlashcardListResponse, status_code=status.HTTP_201_CREATED)
def create_flashcards(
    request: FlashcardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate flashcards for a document."""
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

    # Check if flashcards already exist
    if getattr(request, 'regenerate', False):
        db.query(Flashcard).filter(Flashcard.document_id == request.document_id).delete()
        db.commit()
    else:
        existing = db.query(Flashcard).filter(Flashcard.document_id == request.document_id).count()
        if existing > 0:
            # Return existing flashcards
            flashcards = db.query(Flashcard).filter(
                Flashcard.document_id == request.document_id
            ).all()
            return FlashcardListResponse(flashcards=flashcards, total=len(flashcards))

    # Generate flashcards via AI
    try:
        cards_data = generate_flashcards(document.document_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}",
        )

    # Save to database
    db_cards = []
    for card_data in cards_data:
        front_text = str(card_data.get("front") or card_data.get("question") or card_data.get("concept") or "")
        back_text = str(card_data.get("back") or card_data.get("answer") or card_data.get("definition") or "")
        
        # Don't save completely blank cards
        if not front_text.strip() and not back_text.strip():
            continue
            
        card = Flashcard(
            document_id=request.document_id,
            front=front_text.strip(),
            back=back_text.strip(),
        )
        db.add(card)
        db_cards.append(card)

    db.commit()
    for card in db_cards:
        db.refresh(card)

    return FlashcardListResponse(flashcards=db_cards, total=len(db_cards))


@router.get("/due", response_model=FlashcardListResponse)
def get_due_flashcards(
    document_id: Optional[int] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get flashcards that are due for spaced-repetition review."""
    now = datetime.now(timezone.utc)
    query = (
        db.query(Flashcard)
        .join(Document, Flashcard.document_id == Document.id)
        .filter(Document.user_id == current_user.id)
        .filter(or_(Flashcard.next_review_at.is_(None), Flashcard.next_review_at <= now))
    )
    if document_id is not None:
        query = query.filter(Flashcard.document_id == document_id)

    flashcards = (
        query.order_by(Flashcard.next_review_at.is_(None).desc(), Flashcard.next_review_at.asc())
        .limit(limit)
        .all()
    )

    return FlashcardListResponse(flashcards=flashcards, total=len(flashcards))


@router.post("/{flashcard_id}/review", response_model=FlashcardResponse)
def review_flashcard(
    flashcard_id: int,
    request: FlashcardReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a spaced-repetition review (SM-2) for a flashcard."""
    flashcard = db.query(Flashcard).filter(Flashcard.id == flashcard_id).first()

    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )

    # Verify document belongs to user
    document = db.query(Document).filter(
        Document.id == flashcard.document_id,
        Document.user_id == current_user.id,
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )

    quality = request.quality

    if quality < 3:
        flashcard.repetitions = 0
        flashcard.interval_days = 1
    else:
        flashcard.repetitions += 1
        if flashcard.repetitions == 1:
            flashcard.interval_days = 1
        elif flashcard.repetitions == 2:
            flashcard.interval_days = 6
        else:
            flashcard.interval_days = round(flashcard.interval_days * flashcard.ease_factor)

    flashcard.ease_factor = max(
        1.3,
        flashcard.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    )

    now = datetime.now(timezone.utc)
    flashcard.last_reviewed_at = now
    flashcard.next_review_at = now + timedelta(days=flashcard.interval_days)
    flashcard.mastered = (
        flashcard.repetitions >= MASTERED_MIN_REPETITIONS
        and flashcard.interval_days >= MASTERED_MIN_INTERVAL_DAYS
    )

    db.commit()
    db.refresh(flashcard)

    return flashcard


@router.get("/{document_id}", response_model=FlashcardListResponse)
def get_flashcards(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all flashcards for a document."""
    # Verify document exists and belongs to user
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    flashcards = db.query(Flashcard).filter(
        Flashcard.document_id == document_id
    ).all()

    return FlashcardListResponse(flashcards=flashcards, total=len(flashcards))


@router.put("/{flashcard_id}/mastered", response_model=FlashcardResponse)
def toggle_mastered(
    flashcard_id: int,
    request: FlashcardUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a flashcard as mastered or not mastered."""
    flashcard = db.query(Flashcard).filter(Flashcard.id == flashcard_id).first()

    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )

    # Verify document belongs to user
    document = db.query(Document).filter(
        Document.id == flashcard.document_id,
        Document.user_id == current_user.id,
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )

    flashcard.mastered = request.mastered
    db.commit()
    db.refresh(flashcard)

    return flashcard
