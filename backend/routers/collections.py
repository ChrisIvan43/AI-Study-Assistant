from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, Collection, Document
from schemas import (
    CollectionRequest, CollectionResponse, CollectionListResponse,
    CollectionUpdateRequest,
)
from utils.auth import get_current_user

router = APIRouter(prefix="/collections", tags=["Collections"])


def _to_response(collection: Collection, document_count: int) -> CollectionResponse:
    return CollectionResponse(
        id=collection.id,
        user_id=collection.user_id,
        name=collection.name,
        document_count=document_count,
        created_at=collection.created_at,
    )


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(
    request: CollectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new collection for organizing documents."""
    existing = db.query(Collection).filter(
        Collection.user_id == current_user.id,
        Collection.name == request.name,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A collection with this name already exists",
        )

    collection = Collection(user_id=current_user.id, name=request.name)
    db.add(collection)
    db.commit()
    db.refresh(collection)

    return _to_response(collection, document_count=0)


@router.get("", response_model=CollectionListResponse)
def list_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all collections for the current user, with document counts."""
    rows = (
        db.query(Collection, func.count(Document.id))
        .outerjoin(Document, Document.collection_id == Collection.id)
        .filter(Collection.user_id == current_user.id)
        .group_by(Collection.id)
        .order_by(Collection.created_at.desc())
        .all()
    )

    collections = [_to_response(collection, count) for collection, count in rows]
    return CollectionListResponse(collections=collections, total=len(collections))


@router.put("/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: int,
    request: CollectionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rename a collection."""
    collection = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == current_user.id,
    ).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    duplicate = db.query(Collection).filter(
        Collection.user_id == current_user.id,
        Collection.name == request.name,
        Collection.id != collection_id,
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A collection with this name already exists",
        )

    collection.name = request.name
    db.commit()
    db.refresh(collection)

    document_count = db.query(Document).filter(Document.collection_id == collection_id).count()
    return _to_response(collection, document_count)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a collection. Documents inside it are unassigned, not deleted."""
    collection = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == current_user.id,
    ).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    db.query(Document).filter(Document.collection_id == collection_id).update(
        {Document.collection_id: None}
    )
    db.delete(collection)
    db.commit()

    return None
