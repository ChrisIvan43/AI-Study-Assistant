from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date


# ─── Auth Schemas ───────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., max_length=128)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str = "student"
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── Collection Schemas ─────────────────────────────────────────

class CollectionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)


class CollectionUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)


class CollectionResponse(BaseModel):
    id: int
    user_id: int
    name: str
    document_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CollectionListResponse(BaseModel):
    collections: List[CollectionResponse]
    total: int


# ─── Document Schemas ───────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: int
    user_id: int
    collection_id: Optional[int] = None
    title: str
    filename: str
    file_path: str
    document_text: Optional[str] = None
    created_at: datetime
    flashcards_generated: Optional[bool] = None
    flashcards_count: Optional[int] = None
    flashcards_error: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class DocumentCollectionUpdateRequest(BaseModel):
    collection_id: Optional[int] = None


# ─── Summary Schemas ────────────────────────────────────────────

class SummaryRequest(BaseModel):
    document_id: int


class SummaryResponse(BaseModel):
    id: int
    document_id: int
    short_summary: Optional[str] = None
    detailed_summary: Optional[str] = None
    key_concepts: Optional[str] = None
    definitions: Optional[str] = None
    learning_outcomes: Optional[str] = None
    key_points: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Quiz Schemas ───────────────────────────────────────────────

class QuizRequest(BaseModel):
    document_id: int
    quiz_type: Optional[str] = "mixed"  # mixed, multiple_choice, true_false, short_answer


class QuizQuestionResponse(BaseModel):
    id: int
    quiz_id: int
    question: str
    question_type: str
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[str] = None

    class Config:
        from_attributes = True


class QuizResponse(BaseModel):
    id: int
    document_id: int
    title: str
    score: Optional[int] = None
    total_questions: Optional[int] = None
    is_focus_quiz: bool = False
    questions: List[QuizQuestionResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class QuizAnswer(BaseModel):
    question_id: int
    user_answer: str


class QuizSubmitRequest(BaseModel):
    answers: List[QuizAnswer]


class QuizResultResponse(BaseModel):
    quiz_id: int
    score: int
    total: int
    percentage: float
    questions: List[QuizQuestionResponse]


# ─── Flashcard Schemas ──────────────────────────────────────────

class FlashcardRequest(BaseModel):
    document_id: int
    regenerate: Optional[bool] = False


class FlashcardResponse(BaseModel):
    id: int
    document_id: int
    front: str
    back: str
    mastered: bool
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_at: Optional[datetime] = None
    last_reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FlashcardListResponse(BaseModel):
    flashcards: List[FlashcardResponse]
    total: int


class FlashcardUpdateRequest(BaseModel):
    mastered: bool


class FlashcardReviewRequest(BaseModel):
    quality: int = Field(..., ge=0, le=5)


# ─── Chat Schemas ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    document_id: int
    question: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    id: int
    document_id: int
    question: str
    answer: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    chats: List[ChatResponse]
    total: int


# ─── Study Planner Schemas ──────────────────────────────────────

class StudyPlanRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    exam_date: date
    daily_hours: float = Field(..., gt=0, le=24)
    collection_id: Optional[int] = None


class StudyPlanResponse(BaseModel):
    id: int
    user_id: int
    collection_id: Optional[int] = None
    subject: str
    exam_date: date
    daily_hours: float
    status: str
    progress: float
    schedule: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StudyPlanListResponse(BaseModel):
    plans: List[StudyPlanResponse]
    total: int


class StudyPlanUpdateRequest(BaseModel):
    subject: Optional[str] = None
    exam_date: Optional[date] = None
    daily_hours: Optional[float] = None
    status: Optional[str] = None
    collection_id: Optional[int] = None


class StudySessionRequest(BaseModel):
    plan_id: int
    date: date
    topic: Optional[str] = None
    hours_spent: float = Field(..., gt=0, le=24)
    completed: bool = True


class StudySessionResponse(BaseModel):
    id: int
    plan_id: int
    date: date
    topic: Optional[str] = None
    hours_spent: float
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StudySessionListResponse(BaseModel):
    sessions: List[StudySessionResponse]
    total: int


class WeakTopicItem(BaseModel):
    question_id: int
    question: str
    document_id: int
    document_title: str
    missed_count: int


class RecommendationsResponse(BaseModel):
    plan_id: int
    due_flashcards: List[FlashcardResponse] = []
    weak_topics: List[WeakTopicItem] = []
    recommended_quiz_available: bool = False


class FocusQuizRequest(BaseModel):
    max_questions: Optional[int] = Field(default=10, ge=1, le=30)


# ─── Progress Schemas ───────────────────────────────────────────

class ProgressResponse(BaseModel):
    total_documents: int = 0
    total_quizzes: int = 0
    average_quiz_score: float = 0.0
    total_flashcards: int = 0
    mastered_flashcards: int = 0
    total_study_hours: float = 0.0
    completed_sessions: int = 0
    active_plans: int = 0


# ─── Error Response ─────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str

