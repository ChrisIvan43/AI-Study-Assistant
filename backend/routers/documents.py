import os
import shutil
import io
import zipfile
import hashlib
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


def _get_document_file_size_bytes(document: Document) -> int:
    """Return a safe, server-calculated size for a file inside UPLOAD_DIR."""
    try:
        upload_root = os.path.realpath(UPLOAD_DIR)
        file_path = os.path.realpath(document.file_path)

        if os.path.commonpath([upload_root, file_path]) != upload_root:
            return 0

        if not os.path.isfile(file_path):
            return 0

        return os.path.getsize(file_path)
    except (OSError, ValueError, TypeError):
        return 0


def _image_signature_matches(extension: str, content: bytes) -> bool:
    """Check that an uploaded image has the expected file signature."""
    if extension in {".jpg", ".jpeg"}:
        return content.startswith(b"\xff\xd8\xff")

    if extension == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")

    if extension == ".webp":
        return (
            len(content) >= 12
            and content.startswith(b"RIFF")
            and content[8:12] == b"WEBP"
        )

    return True



def _pptx_package_matches(content: bytes) -> bool:
    """Validate a PPTX ZIP package without extracting its contents to disk."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            entries = archive.infolist()
            names = {entry.filename for entry in entries}

            if len(entries) > 2000:
                return False

            total_uncompressed_size = sum(entry.file_size for entry in entries)
            if total_uncompressed_size > 100 * 1024 * 1024:
                return False

            if "[Content_Types].xml" not in names:
                return False

            if "ppt/presentation.xml" not in names:
                return False

            if any(name.lower().endswith("vbaproject.bin") for name in names):
                return False

            content_types = archive.read("[Content_Types].xml")

            expected_type = (
                b"application/vnd.openxmlformats-officedocument."
                b"presentationml.presentation.main+xml"
            )

            return expected_type in content_types

    except (zipfile.BadZipFile, KeyError, OSError, RuntimeError):
        return False





def _has_duplicate_document_content(db: Session, user_id: int, content: bytes) -> bool:
    """Check whether this user already has an identical uploaded file."""
    target_hash = hashlib.sha256(content).digest()
    target_size = len(content)
    upload_root = os.path.normcase(os.path.realpath(UPLOAD_DIR))

    existing_paths = (
        db.query(Document.file_path)
        .filter(Document.user_id == user_id)
        .all()
    )

    for (stored_path,) in existing_paths:
        if not stored_path:
            continue

        try:
            resolved_path = os.path.normcase(os.path.realpath(stored_path))

            # Only inspect files physically inside the application's upload folder.
            if os.path.commonpath([upload_root, resolved_path]) != upload_root:
                continue

            if not os.path.isfile(resolved_path):
                continue

            if os.path.getsize(resolved_path) != target_size:
                continue

            digest = hashlib.sha256()
            with open(resolved_path, "rb") as existing_file:
                for chunk in iter(lambda: existing_file.read(1024 * 1024), b""):
                    digest.update(chunk)

            if digest.digest() == target_hash:
                return True

        except (OSError, ValueError):
            # Ignore inaccessible, missing, or invalid stored paths.
            continue

    return False


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    collection_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document or image and extract its study content."""
    # Validate file extension
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not supported. Allowed: PDF, DOCX, TXT, JPG, JPEG, PNG, WEBP",
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

    extension = os.path.splitext(file.filename.lower())[1]
    if extension in {".jpg", ".jpeg", ".png", ".webp"}:
        if not _image_signature_matches(extension, file_content):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The uploaded image content does not match its file extension.",
            )
    elif extension == ".pptx":
        if not _pptx_package_matches(file_content):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The uploaded file is not a valid, supported PowerPoint presentation.",
            )

    # Reject identical content already uploaded by this user.
    if _has_duplicate_document_content(db, current_user.id, file_content):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This file has already been uploaded. Open your existing document instead.",
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
            "file_size_bytes": _get_document_file_size_bytes(db_document),
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

    response_documents = [
        DocumentResponse.model_validate(document).model_copy(
            update={"file_size_bytes": _get_document_file_size_bytes(document)}
        )
        for document in documents
    ]

    return DocumentListResponse(
        documents=response_documents,
        total=len(response_documents),
    )


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

    return DocumentResponse.model_validate(document).model_copy(
        update={"file_size_bytes": _get_document_file_size_bytes(document)}
    )


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

    return DocumentResponse.model_validate(document).model_copy(
        update={"file_size_bytes": _get_document_file_size_bytes(document)}
    )


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
