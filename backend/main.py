"""
AI Study Assistant - Backend API
Main FastAPI application entry point.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env.local", override=False)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import routers
from routers import (
    auth,
    documents,
    collections,
    ai_summary,
    ai_quiz,
    ai_flashcards,
    ai_chat,
    study_planner,
    progress,
)

# Database schema is managed by Alembic migrations (see backend/alembic/).
# Run `alembic upgrade head` before starting the app.

app = FastAPI(
    title="AI Study Assistant API",
    description="API for AI-powered study assistant with document upload, summaries, quizzes, flashcards, and chat.",
    version="1.0.0",
)

# ─── CORS Configuration ────────────────────────────────────────
_DEFAULT_CORS_ORIGINS = ",".join([
    "http://localhost:5173",
    "http://192.168.254.120:5173",  # Vite dev server (default)
    "http://localhost:5174",  # Vite dev server (fallback)
    "http://localhost:5175",  # Vite dev server (fallback)
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
])
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Mount Static Files (for uploads) ─────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── Include Routers ──────────────────────────────────────────
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(collections.router)
app.include_router(ai_summary.router)
app.include_router(ai_quiz.router)
app.include_router(ai_flashcards.router)
app.include_router(ai_chat.router)
app.include_router(study_planner.router)
app.include_router(progress.router)


# ─── Health Check ──────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "AI Study Assistant API is running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
