from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Document, Summary
from schemas import SummaryRequest, SummaryResponse
from utils.auth import get_current_user
from services.ai_service import generate_summary

router = APIRouter(prefix="/summary", tags=["AI Summary"])


@router.post("", response_model=SummaryResponse)
def create_summary(
    request: SummaryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an AI summary for a document."""
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

    # Check if summary already exists for this document
    existing_summary = db.query(Summary).filter(
        Summary.document_id == request.document_id
    ).first()
    if existing_summary:
        return existing_summary

    # Generate summary via AI
    try:
        result = generate_summary(document.document_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}",
        )

    # Save to database
    db_summary = Summary(
        document_id=request.document_id,
        short_summary=result.get("short_summary"),
        detailed_summary=result.get("detailed_summary"),
        key_concepts=result.get("key_concepts"),
        definitions=result.get("definitions"),
        learning_outcomes=result.get("learning_outcomes"),
        key_points=result.get("key_concepts"),
    )
    db.add(db_summary)
    db.commit()
    db.refresh(db_summary)

    return db_summary


@router.get("/{document_id}", response_model=SummaryResponse)
def get_summary(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the summary for a specific document."""
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

    summary = db.query(Summary).filter(
        Summary.document_id == document_id
    ).first()

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No summary found for this document. Generate one first.",
        )

    return summary
