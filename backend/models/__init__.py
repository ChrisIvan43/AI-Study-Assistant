from sqlalchemy import (
    Index,
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, Date,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("uq_users_pending_email", "pending_email", unique=True),
        Index("uq_users_pending_email_token_hash", "pending_email_token_hash", unique=True),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="student", server_default="student")

    # Email ownership verification and secure email-change workflow
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    pending_email = Column(String(255), nullable=True)
    pending_email_token_hash = Column(String(64), nullable=True)
    pending_email_expires_at = Column(DateTime(timezone=True), nullable=True)
    email_change_requested_at = Column(DateTime(timezone=True), nullable=True)

    # Initial account email verification (legacy accounts)
    email_verification_token_hash = Column(String(64), nullable=True)
    email_verification_expires_at = Column(DateTime(timezone=True), nullable=True)
    email_verification_requested_at = Column(DateTime(timezone=True), nullable=True)

    # Student inactivity reminder tracking
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_1_day_reminder_at = Column(DateTime(timezone=True), nullable=True)
    last_5_day_reminder_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="user", cascade="all, delete-orphan")


class PendingRegistration(Base):
    __tablename__ = "pending_registrations"
    __table_args__ = (
        UniqueConstraint("email", name="uq_pending_registrations_email"),
        UniqueConstraint("token_hash", name="uq_pending_registrations_token_hash"),
        Index("ix_pending_registrations_expires_at", "expires_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    token_hash = Column(String(64), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    requested_at = Column(DateTime(timezone=True), nullable=False)


class Collection(Base):
    __tablename__ = "collections"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_collection_user_name"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="collections")
    documents = relationship("Document", back_populates="collection")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    document_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="documents")
    collection = relationship("Collection", back_populates="documents")
    summaries = relationship("Summary", back_populates="document", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="document", cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="document", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="document", cascade="all, delete-orphan")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    short_summary = Column(Text, nullable=True)
    detailed_summary = Column(Text, nullable=True)
    key_concepts = Column(Text, nullable=True)
    definitions = Column(Text, nullable=True)
    learning_outcomes = Column(Text, nullable=True)
    key_points = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="summaries")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    title = Column(String(255), nullable=False)
    score = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)
    is_focus_quiz = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False, default="multiple_choice")
    option_a = Column(String(500), nullable=True)
    option_b = Column(String(500), nullable=True)
    option_c = Column(String(500), nullable=True)
    option_d = Column(String(500), nullable=True)
    correct_answer = Column(String(500), nullable=False)
    user_answer = Column(String(500), nullable=True)
    is_correct = Column(Boolean, nullable=True)

    quiz = relationship("Quiz", back_populates="questions")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    mastered = Column(Boolean, default=False)
    ease_factor = Column(Float, nullable=False, default=2.5)
    interval_days = Column(Integer, nullable=False, default=0)
    repetitions = Column(Integer, nullable=False, default=0)
    next_review_at = Column(DateTime, nullable=True)
    last_reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="flashcards")


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chats")
    document = relationship("Document", back_populates="chats")


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)
    subject = Column(String(255), nullable=False)
    exam_date = Column(Date, nullable=False)
    daily_hours = Column(Float, nullable=False)
    status = Column(String(50), default="active")
    progress = Column(Float, default=0.0)
    schedule = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="study_plans")
    collection = relationship("Collection")
    sessions = relationship("StudySession", back_populates="plan", cascade="all, delete-orphan")
    scheduled_sessions = relationship("ScheduledStudySession", back_populates="plan", cascade="all, delete-orphan")


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("study_plans.id"), nullable=False)
    date = Column(Date, nullable=False)
    topic = Column(String(255), nullable=True)
    hours_spent = Column(Float, default=0.0)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    plan = relationship("StudyPlan", back_populates="sessions")



class ScheduledStudySession(Base):
    __tablename__ = "scheduled_study_sessions"
    __table_args__ = (
        Index(
            "ix_scheduled_study_sessions_due",
            "notification_status",
            "end_at",
        ),
        Index("ix_scheduled_study_sessions_plan_id", "plan_id"),
    )

    id = Column(Integer, primary_key=True)
    plan_id = Column(
        Integer,
        ForeignKey("study_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    topic = Column(String(255), nullable=False)
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    notify_email = Column(Boolean, nullable=False, default=True)
    status = Column(String(20), nullable=False, default="scheduled")
    notification_status = Column(
        String(20), nullable=False, default="pending"
    )
    notification_attempts = Column(Integer, nullable=False, default=0)
    notification_claimed_at = Column(DateTime(timezone=True), nullable=True)
    notification_sent_at = Column(DateTime(timezone=True), nullable=True)
    notification_last_error = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    plan = relationship("StudyPlan", back_populates="scheduled_sessions")

