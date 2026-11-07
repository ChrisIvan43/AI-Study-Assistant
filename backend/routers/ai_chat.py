from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Document, Chat
from schemas import ChatRequest, ChatResponse, ChatHistoryResponse
from utils.auth import get_current_user
from services.ai_service import chat_with_document

router = APIRouter(prefix="/chat", tags=["AI Chat"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def ask_question(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ask a question about a document."""
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

    # Get conversation history for context
    previous_chats = (
        db.query(Chat)
        .filter(
            Chat.document_id == request.document_id,
            Chat.user_id == current_user.id,
        )
        .order_by(Chat.created_at.desc())
        .limit(6)
        .all()
    )
    # Reverse to get chronological order
    previous_chats.reverse()

    conversation_history = []
    for chat in previous_chats:
        conversation_history.append({"role": "user", "content": chat.question})
        conversation_history.append({"role": "assistant", "content": chat.answer})

    # Get AI response
    try:
        answer = chat_with_document(
            question=request.question,
            document_text=document.document_text,
            conversation_history=conversation_history,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}",
        )

    # Save chat to database
    db_chat = Chat(
        user_id=current_user.id,
        document_id=request.document_id,
        question=request.question,
        answer=answer,
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)

    return db_chat


@router.get("/{document_id}", response_model=ChatHistoryResponse)
def get_chat_history(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get chat history for a document."""
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

    chats = (
        db.query(Chat)
        .filter(
            Chat.document_id == document_id,
            Chat.user_id == current_user.id,
        )
        .order_by(Chat.created_at.asc())
        .all()
    )

    return ChatHistoryResponse(chats=chats, total=len(chats))
