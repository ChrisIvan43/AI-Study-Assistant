
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db
from models import User, Document, Summary, Quiz, Flashcard
from utils.auth import get_admin_user

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get("/overview")
def admin_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return {
        "total_users": db.query(func.count(User.id)).scalar() or 0,
        "total_students": db.query(func.count(User.id)).filter(User.role == "student").scalar() or 0,
        "total_admins": db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0,
        "total_documents": db.query(func.count(Document.id)).scalar() or 0,
        "total_summaries": db.query(func.count(Summary.id)).scalar() or 0,
        "total_quizzes": db.query(func.count(Quiz.id)).scalar() or 0,
        "total_flashcards": db.query(func.count(Flashcard.id)).scalar() or 0,
    }


@router.get("/users")
def admin_list_users(
    search: str | None = Query(default=None, max_length=255),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(User)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (User.name.ilike(term)) | (User.email.ilike(term))
        )

    total = query.count()
    users = (
        query.order_by(User.created_at.desc(), User.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "users": [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at,
            }
            for user in users
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/documents")
def admin_list_documents(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    total = db.query(func.count(Document.id)).scalar() or 0

    rows = (
        db.query(Document, User.name, User.email)
        .join(User, Document.user_id == User.id)
        .order_by(Document.created_at.desc(), Document.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "documents": [
            {
                "id": document.id,
                "title": document.title,
                "filename": document.filename,
                "owner_name": owner_name,
                "owner_email": owner_email,
                "created_at": document.created_at,
            }
            for document, owner_name, owner_email in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/activity")
def admin_recent_activity(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    quizzes = (
        db.query(Quiz.id, Quiz.title, Quiz.created_at, Document.title, User.name, User.email)
        .join(Document, Quiz.document_id == Document.id)
        .join(User, Document.user_id == User.id)
        .order_by(Quiz.created_at.desc())
        .limit(limit)
        .all()
    )

    summaries = (
        db.query(Summary.id, Summary.created_at, Document.title, User.name, User.email)
        .join(Document, Summary.document_id == Document.id)
        .join(User, Document.user_id == User.id)
        .order_by(Summary.created_at.desc())
        .limit(limit)
        .all()
    )

    flashcards = (
        db.query(Flashcard.id, Flashcard.created_at, Document.title, User.name, User.email)
        .join(Document, Flashcard.document_id == Document.id)
        .join(User, Document.user_id == User.id)
        .order_by(Flashcard.created_at.desc())
        .limit(limit)
        .all()
    )

    items = []

    for row in quizzes:
        items.append({
            "type": "quiz",
            "id": row[0],
            "title": row[1],
            "created_at": row[2],
            "document_title": row[3],
            "user_name": row[4],
            "user_email": row[5],
        })

    for row in summaries:
        items.append({
            "type": "summary",
            "id": row[0],
            "title": "Summary generated",
            "created_at": row[1],
            "document_title": row[2],
            "user_name": row[3],
            "user_email": row[4],
        })

    for row in flashcards:
        items.append({
            "type": "flashcards",
            "id": row[0],
            "title": "Flashcards generated",
            "created_at": row[1],
            "document_title": row[2],
            "user_name": row[3],
            "user_email": row[4],
        })

    items.sort(key=lambda item: item["created_at"], reverse=True)

    return {"activity": items[:limit]}


@router.get("/health")
def admin_database_health(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    try:
        db.execute(text("SELECT 1"))
        return {"database": "connected", "status": "healthy"}
    except Exception:
        db.rollback()
        return {"database": "unavailable", "status": "degraded"}
