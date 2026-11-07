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

    # Load existing cards without deleting them.
    existing_cards = db.query(Flashcard).filter(
        Flashcard.document_id == request.document_id
    ).order_by(Flashcard.id.asc()).all()

    if not getattr(request, "regenerate", False):
        if len(existing_cards) == 10:
            return FlashcardListResponse(
                flashcards=existing_cards,
                total=10,
            )

        if len(existing_cards) > 10:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="More than 10 cards already exist. Use Regenerate to create exactly 10.",
            )

    # Generate and validate before changing any saved cards.
    try:
        cards_data = generate_flashcards(document.document_text)

        if not isinstance(cards_data, list) or len(cards_data) != 10:
            raise RuntimeError("AI service did not return exactly 10 cards.")

        normalized_cards = []

        for card_data in cards_data:
            front_text = str(
                card_data.get("front")
                or card_data.get("question")
                or card_data.get("concept")
                or ""
            ).strip()

            back_text = str(
                card_data.get("back")
                or card_data.get("answer")
                or card_data.get("definition")
                or ""
            ).strip()

            if not front_text or not back_text:
                raise RuntimeError("AI returned an incomplete flashcard.")

            normalized_cards.append({
                "front": front_text,
                "back": back_text,
            })

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}",
        )

    # Keep existing cards and fill only the missing slots,
    # unless the user explicitly requested regeneration.
    if getattr(request, "regenerate", False):
        cards_to_save = normalized_cards
    else:
        existing_fronts = {
            " ".join(card.front.lower().split())
            for card in existing_cards
        }

        additional_cards = []

        for card in normalized_cards:
            normalized_front = " ".join(card["front"].lower().split())

            if normalized_front in existing_fronts:
                continue

            existing_fronts.add(normalized_front)
            additional_cards.append(card)

            if len(existing_cards) + len(additional_cards) == 10:
                break

        needed = 10 - len(existing_cards)

        if len(additional_cards) < needed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "The AI could not generate enough new, distinct cards "
                    "to complete the set. Your existing cards were preserved. "
                    "Try Regenerate to create a fresh set of 10."
                ),
            )

        cards_to_save = additional_cards[:needed]

    # Save atomically. Existing cards are deleted only for explicit regeneration.
    try:
        if getattr(request, "regenerate", False):
            db.query(Flashcard).filter(
                Flashcard.document_id == request.document_id
            ).delete(synchronize_session=False)

        for card_data in cards_to_save:
            db.add(Flashcard(
                document_id=request.document_id,
                front=card_data["front"],
                back=card_data["back"],
            ))

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save flashcards: {str(e)}",
        )

    saved_cards = db.query(Flashcard).filter(
        Flashcard.document_id == request.document_id
    ).order_by(Flashcard.id.asc()).all()

    return FlashcardListResponse(
        flashcards=saved_cards,
        total=len(saved_cards),
    )

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
