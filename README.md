# AI Study Assistant 🧠✨

Welcome to the **AI Study Assistant** — a modern, AI-powered educational platform designed to transform your static study materials into interactive, engaging learning experiences.

Built with a **FastAPI** backend and a **React + Tailwind** frontend, this application allows students to upload their notes and instantly generate summaries, practice quizzes, interactive flashcards, and a chatbot interface for deep-dive questions, all powered by Large Language Models (like Llama 3 via Groq).

---

## 🚀 Features

- **📄 Document Upload:** Support for parsing text from PDF, DOCX, and TXT files.
- **📝 AI Summarisation:** Automatically generates short overviews, detailed summaries, key concepts, and learning outcomes.
- **🎯 Practice Quizzes:** Test your knowledge with AI-generated multiple-choice, true/false, and short-answer questions.
- **🃏 Spaced-Repetition Flashcards:** Interactive, flippable flashcards with a real SM-2 review scheduler — rate each card Again/Hard/Good/Easy and it tells you when to review it next.
- **📁 Collections:** Organize documents into folders by course or subject.
- **🧭 Adaptive Study Planner:** Link a plan to a collection and it surfaces due flashcards and previously-missed quiz questions, then generates a focus quiz targeting exactly that weak content.
- **💬 Chat with Document:** Ask specific questions about your uploaded document and get context-aware answers directly from the AI.
- **📈 Progress Dashboard:** Track your average quiz scores, mastered flashcards, and total study hours.
- **🌓 Light & Dark Modes:** A stunning, fully responsive UI built with custom CSS variables and Tailwind CSS for a premium, accessible experience.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React (via Vite)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS + Vanilla CSS Variables
- **Icons:** Lucide React
- **HTTP Client:** Axios

### Backend
- **Framework:** FastAPI
- **Database:** SQLite (dev) or PostgreSQL (production), via SQLAlchemy + Alembic migrations
- **Authentication:** JWT (JSON Web Tokens) with bcrypt
- **AI Integrations:** Groq (Llama 3), OpenAI, or Local Ollama models
- **Environment Management:** python-dotenv

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v16+)
- Python (3.9+)

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up your environment variables:
   - Copy or create a `.env` file in the `backend` folder.
   - `SECRET_KEY` is **required** — the app refuses to start without it (no insecure default).
   - Example configuration for Groq:
     ```env
     DATABASE_URL=sqlite:///./study_assistant.db
     SECRET_KEY=your-random-secret-key
     
     AI_PROVIDER=groq
     GROQ_API_KEY=gsk_your_api_key_here
     GROQ_MODEL=llama-3.1-8b-instant
     ```
4. Run database migrations:
   ```bash
   alembic upgrade head
   ```
5. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will run at `http://localhost:8000`.*

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install NPM dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will run at `http://localhost:5173`.*

---

## 💡 Architecture & Design Notes

- **Lazy Loading:** The frontend implements `React.lazy` and `Suspense` for aggressive code-splitting, ensuring near-instant initial page loads.
- **Resilient AI Parsing:** The backend utilizes a flexible JSON extraction system to handle variations in AI output shapes (e.g., smoothly mapping `question`/`answer` AI outputs to `front`/`back` database schemas).
- **Graceful Fallbacks:** If the AI provider is incorrectly configured, the app auto-downgrades to a "Demo Mode" returning mock JSON data, preventing crashes and allowing frontend development to continue unhindered.

---

## ☁️ Deployment

The repo includes ready-to-use config for a free/cheap production setup: **Render** (backend + Postgres) and **Vercel** (frontend).

### Backend on Render

`render.yaml` at the repo root defines the service and a linked Postgres database. Connect the repo in the Render dashboard ("New > Blueprint") and it will pick up `render.yaml` automatically. The build/start commands run `pip install -r requirements.txt` and `alembic upgrade head && uvicorn main:app ...`, so migrations run on every deploy.

Set these in the Render dashboard (marked `sync: false` in `render.yaml`, so they're not committed):

| Variable | Notes |
|---|---|
| `CORS_ORIGINS` | Your Vercel frontend URL, e.g. `https://ai-study-assistant.vercel.app` |
| `AI_PROVIDER` | `demo` (default, no key needed), `openai`, `groq`, or `local` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Only if `AI_PROVIDER=openai` |
| `GROQ_API_KEY` / `GROQ_MODEL` | Only if `AI_PROVIDER=groq` |

`SECRET_KEY` and `DATABASE_URL` are generated/wired automatically by the blueprint.

**Note on uploads:** Render's free tier disk is ephemeral — an uploaded file can be lost on redeploy/restart. This is a non-issue in practice: the full extracted text is saved to Postgres at upload time, so summaries, quizzes, flashcards, and chat all keep working even if the original file is gone. If you need the original file to persist long-term, add an S3-compatible storage layer — not included here to avoid a paid dependency the app doesn't otherwise need.

### Frontend on Vercel

`frontend/vercel.json` configures the build and an SPA rewrite so client-side routes (e.g. `/flashcards?doc=3`) survive a hard refresh. Import the repo into Vercel with the project root set to `frontend/`, and set:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL, e.g. `https://ai-study-assistant-api.onrender.com` |

`VITE_API_URL` is baked in at build time, so redeploy the frontend after changing it.

---

## 🤝 Contributing
Contributions are welcome! If you'd like to improve the UI, add new AI study methods, or fix bugs, please fork the repository and submit a pull request.
