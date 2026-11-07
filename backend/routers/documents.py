import os
import shutil
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Document, Collection, Flashcard
from schemas import DocumentResponse, DocumentListResponse, DocumentCollectionUpdateRequest
from utils.auth import get_current_user
from utils.file_processor import allowed_file, validate_file_size, generate_unique_filename, extract_text

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    collection_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document (PDF, DOCX, or TXT)."""
    # Validate file extension
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not supported. Allowed: PDF, DOCX, TXT",
        )

    if collection_id is not None:
        collection = db.query(Collection).filter(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        ).first()
        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found",
            )

    # Read file content for size validation
    file_content = await file.read()
    if not validate_file_size(len(file_content)):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Maximum size is 10MB.",
        )

    # Generate unique filename and save
    unique_filename = generate_unique_filename(file.filename)
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(file_content)

    # Extract text from the document
    try:
        document_text = extract_text(file_path)
    except Exception as e:
        # Clean up the uploaded file if text extraction fails
        os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process document: {str(e)}",
        )

    # Save document metadata to database
    title = os.path.splitext(file.filename)[0]
    db_document = Document(
        user_id=current_user.id,
        collection_id=collection_id,
        title=title,
        filename=file.filename,
        file_path=file_path,
        document_text=document_text,
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    # Generate and save exactly 10 flashcards after the document is safely stored.
    flashcards_generated = False
    flashcards_count = 0
    flashcards_error = None

    try:
        from services.ai_service import generate_flashcards

        cards_data = generate_flashcards(document_text)

        if len(cards_data) != 10:
            raise ValueError("AI did not return exactly 10 flashcards.")

        db_cards = []

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
                raise ValueError("A generated flashcard is missing its question or answer.")

            db_cards.append(
                Flashcard(
                    document_id=db_document.id,
                    front=front_text,
                    back=back_text,
                )
            )

        db.add_all(db_cards)
        db.commit()

        flashcards_generated = True
        flashcards_count = len(db_cards)

    except Exception:
        # Keep the already-committed document if flashcard generation fails.
        db.rollback()
        flashcards_error = (
            "Flashcard generation failed. You can retry from the Flashcards page."
        )

    response = DocumentResponse.model_validate(db_document)
    return response.model_copy(
        update={
            "flashcards_generated": flashcards_generated,
            "flashcards_count": flashcards_count,
            "flashcards_error": flashcards_error,
        }
    )


@router.get("", response_model=DocumentListResponse)
def list_documents(
    collection_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all documents uploaded by the current user, optionally filtered by collection."""
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if collection_id is not None:
        query = query.filter(Document.collection_id == collection_id)

    documents = query.order_by(Document.created_at.desc()).all()
    return DocumentListResponse(documents=documents, total=len(documents))


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific document by ID."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return document


@router.put("/{document_id}/collection", response_model=DocumentResponse)
def update_document_collection(
    document_id: int,
    request: DocumentCollectionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Move a document into a collection, or unassign it (collection_id: null)."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if request.collection_id is not None:
        collection = db.query(Collection).filter(
            Collection.id == request.collection_id,
            Collection.user_id == current_user.id,
        ).first()
        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found",
            )

    document.collection_id = request.collection_id
    db.commit()
    db.refresh(document)

    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a document and its associated file."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Delete the physical file
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    # Delete from database (cascade will delete related data)
    db.delete(document)
    db.commit()

    return None
