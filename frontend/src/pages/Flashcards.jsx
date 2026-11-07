
import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Sparkles,
  Layers3,
  BookOpen,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Clock3,
  Brain,
  ArrowLeft,
  LoaderCircle,
  GraduationCap,
  Target,
  Zap,
  RotateCw,
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Flashcards() {
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('doc')

  const [document, setDocument] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    if (docId) {
      fetchDocument()
    } else {
      setFetching(false)
    }
  }, [docId])

  const fetchDocument = async () => {
    try {
      const r = await api.get(`/documents/${docId}`)
      setDocument(r.data)

      try {
        const cardsResponse = await api.get(/flashcards/)
        const savedCards = Array.isArray(cardsResponse.data)
          ? cardsResponse.data
          : cardsResponse.data.flashcards || []

        setFlashcards(savedCards)
      } catch {
        setFlashcards([])
      }
    } catch {
      toast.error('Failed to load document')
    } finally {
      setFetching(false)
    }
  }

  const generate = async (regenerate = false) => {
    setLoading(true)

    try {
      const r = await api.post('/flashcards', {
        document_id: parseInt(docId),
        regenerate,
      })

      setFlashcards(r.data.flashcards || [])
      setIdx(0)
      setFlipped(false)

      toast.success('Flashcards generated!')
    } catch (e) {
      toast.error(
        e.response?.data?.detail || 'Failed to generate flashcards'
      )
    } finally {
      setLoading(false)
    }
  }

  const next = () => {
    if (idx < flashcards.length - 1) {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }

  const prev = () => {
    if (idx > 0) {
      setIdx(i => i - 1)
      setFlipped(false)
    }
  }

  const review = async (cardId, quality) => {
    if (reviewing) return

    setReviewing(true)

    try {
      const r = await api.post(`/flashcards/${cardId}/review`, {
        quality,
      })

      setFlashcards(cards =>
        cards.map(c => c.id === cardId ? r.data : c)
      )

      toast.success(
        `Next review in ${r.data.interval_days} day${r.data.interval_days === 1 ? '' : 's'}`
      )

      next()
    } catch (e) {
      toast.error(
        e.response?.data?.detail || 'Failed to record review'
      )
    } finally {
      setReviewing(false)
    }
  }

  const dueLabel = card => {
    if (!card) return null
    if (!card.next_review_at) return 'New'

    const due = new Date(card.next_review_at)

    if (due <= new Date()) return 'Due now'

    const days = Math.ceil(
      (due - new Date()) / (1000 * 60 * 60 * 24)
    )

    return `Due in ${days}d`
  }

  if (fetching) {
    return (
      <div className="flash-loading">
        <LoaderCircle className="flash-loading-icon" size={34} />
        <p>Preparing your study cards...</p>
      </div>
    )
  }

  if (!docId || !document) {
    return (
      <div className="flash-empty-page">
        <div className="flash-empty-card">
          <div className="flash-empty-icon">
            <Layers3 size={34} />
          </div>

          <h2>No Document Selected</h2>

          <p>
            Select a document first to create and study your flashcards.
          </p>

          <Link to="/dashboard" className="flash-primary-btn">
            <ArrowLeft size={17} />
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const card = flashcards[idx]
  const pct = flashcards.length
    ? ((idx + 1) / flashcards.length) * 100
    : 0

  const masteredCount = flashcards.filter(c => c.mastered).length

  return (
    <div className="flash-page">
      {/* Page heading */}
      <div className="flash-header">
        <div className="flash-heading-main">
          <div className="flash-heading-icon">
            <Layers3 size={25} />
          </div>

          <div>
            <div className="flash-eyebrow">
              <Sparkles size={13} />
              AI STUDY WORKSPACE
            </div>

            <h1>Flashcards</h1>

            <p>
              Review, remember, and master your learning materials.
            </p>
          </div>
        </div>

        <Link
          to={`/summary?doc=${docId}`}
          className="flash-back-link"
        >
          <ArrowLeft size={16} />
          Back to Summary
        </Link>
      </div>

      {/* Document information */}
      <div className="flash-document">
        <div className="flash-document-icon">
          <BookOpen size={21} />
        </div>

        <div className="flash-document-info">
          <span>STUDYING FROM</span>
          <strong>{document.title}</strong>
        </div>

        {flashcards.length > 0 && (
          <div className="flash-document-count">
            <Layers3 size={15} />
            {flashcards.length} Cards
          </div>
        )}
      </div>

      {/* Empty state */}
      {flashcards.length === 0 && (
        <div className="flash-generate-card">
          <div className="flash-generate-decoration">
            <div className="flash-decoration-circle flash-circle-one" />
            <div className="flash-decoration-circle flash-circle-two" />

            <div className="flash-generate-illustration">
              <Layers3 size={43} />
              <Sparkles size={19} className="flash-sparkle" />
            </div>
          </div>

          <div className="flash-generate-content">
            <span className="flash-section-label">
              <Zap size={13} />
              AI-POWERED LEARNING
            </span>

            <h2>Turn your notes into knowledge.</h2>

            <p>
              Let AI transform your document into interactive
              flashcards. Test your memory and strengthen your
              understanding one card at a time.
            </p>

            <div className="flash-feature-list">
              <span>
                <CheckCircle2 size={15} />
                AI-generated questions
              </span>

              <span>
                <CheckCircle2 size={15} />
                Spaced repetition
              </span>

              <span>
                <CheckCircle2 size={15} />
                Progress tracking
              </span>
            </div>

            <button
              onClick={() => generate(false)}
              disabled={loading}
              className="flash-primary-btn flash-generate-btn"
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="flash-spin" />
                  Generating Flashcards...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Flashcards
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Flashcard study area */}
      {flashcards.length > 0 && (
        <div className="flash-study-layout">

          {/* Statistics */}
          <div className="flash-stats">
            <div className="flash-stat-card">
              <div className="flash-stat-icon blue">
                <Layers3 size={19} />
              </div>

              <div>
                <span>Total Cards</span>
                <strong>{flashcards.length}</strong>
              </div>
            </div>

            <div className="flash-stat-card">
              <div className="flash-stat-icon violet">
                <Target size={19} />
              </div>

              <div>
                <span>Mastered</span>
                <strong>{masteredCount}</strong>
              </div>
            </div>

            <div className="flash-stat-card">
              <div className="flash-stat-icon cyan">
                <Brain size={19} />
              </div>

              <div>
                <span>Current Card</span>
                <strong>{idx + 1} / {flashcards.length}</strong>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="flash-progress-panel">
            <div className="flash-progress-heading">
              <div>
                <span className="flash-progress-title">
                  Your study progress
                </span>

                <p>Keep going. Every card makes a difference.</p>
              </div>

              <strong>{Math.round(pct)}%</strong>
            </div>

            <div className="flash-progress-track">
              <div
                className="flash-progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flash-progress-bottom">
              <span>Card {idx + 1} of {flashcards.length}</span>

              <button
                onClick={() => generate(true)}
                disabled={loading || reviewing}
                className="flash-regenerate-btn"
              >
                {loading ? (
                  <LoaderCircle size={14} className="flash-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}

                Regenerate
              </button>
            </div>
          </div>

          {/* Flip card */}
          <div className="flash-card-section">
            <div className="flash-card-instruction">
              <span>
                <Lightbulb size={15} />
                {flipped
                  ? 'Answer revealed'
                  : 'Think about the answer before revealing it'}
              </span>

              <span className="flash-card-number">
                CARD {String(idx + 1).padStart(2, '0')}
              </span>
            </div>

            <div
              className="flashcard-scene flash-modern-scene"
              onClick={() => !reviewing && setFlipped(f => !f)}
              role="button"
              tabIndex={0}
              aria-label={flipped ? 'Show question' : 'Reveal answer'}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!reviewing) setFlipped(f => !f)
                }
              }}
            >
              <div
                className={`flashcard-inner ${flipped ? 'flipped' : ''}`}
              >
                {/* Front */}
                <div className="flashcard-face flashcard-front flash-modern-face">
                  <div className="flash-face-top">
                    <div className="flash-face-icon flash-front-icon">
                      <BookOpen size={25} />
                    </div>

                    <span className="flash-face-badge">
                      QUESTION
                    </span>
                  </div>

                  {card?.mastered && (
                    <span className="flash-mastered-badge">
                      <CheckCircle2 size={13} />
                      MASTERED
                    </span>
                  )}

                  <div className="flash-face-content">
                    <span className="flash-face-label">
                      TEST YOUR KNOWLEDGE
                    </span>

                    <h2>{card?.front}</h2>
                  </div>

                  <div className="flash-face-bottom">
                    <span>
                      <RotateCw size={14} />
                      Click or press Enter to reveal
                    </span>

                    <span className="flash-due-label">
                      <Clock3 size={13} />
                      {dueLabel(card)}
                    </span>
                  </div>
                </div>

                {/* Back */}
                <div className="flashcard-face flashcard-back flash-modern-face">
                  <div className="flash-face-top">
                    <div className="flash-face-icon flash-back-icon">
                      <Lightbulb size={25} />
                    </div>

                    <span className="flash-answer-badge">
                      ANSWER
                    </span>
                  </div>

                  <div className="flash-face-content">
                    <span className="flash-face-label">
                      REMEMBER THIS
                    </span>

                    <h2>{card?.back}</h2>
                  </div>

                  <div className="flash-face-bottom">
                    <span>
                      <RotateCcw size={14} />
                      Click to see the question again
                    </span>

                    <span className="flash-due-label">
                      <CheckCircle2 size={13} />
                      Review this card
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Review ratings */}
            {flipped && (
              <div className="flash-review-panel">
                <div className="flash-review-heading">
                  <h3>How well did you know it?</h3>
                  <p>Your rating determines when this card appears again.</p>
                </div>

                <div className="flash-rating-grid">
                  <button
                    onClick={() => review(card.id, 1)}
                    disabled={reviewing}
                    className="flash-rating-btn again"
                  >
                    <RotateCcw size={18} />
                    <strong>Again</strong>
                    <span>Didn't know</span>
                  </button>

                  <button
                    onClick={() => review(card.id, 3)}
                    disabled={reviewing}
                    className="flash-rating-btn hard"
                  >
                    <Clock3 size={18} />
                    <strong>Hard</strong>
                    <span>Struggled</span>
                  </button>

                  <button
                    onClick={() => review(card.id, 4)}
                    disabled={reviewing}
                    className="flash-rating-btn good"
                  >
                    <CheckCircle2 size={18} />
                    <strong>Good</strong>
                    <span>Knew it</span>
                  </button>

                  <button
                    onClick={() => review(card.id, 5)}
                    disabled={reviewing}
                    className="flash-rating-btn easy"
                  >
                    <Zap size={18} />
                    <strong>Easy</strong>
                    <span>Very easy</span>
                  </button>
                </div>

                {reviewing && (
                  <div className="flash-review-loading">
                    <LoaderCircle size={16} className="flash-spin" />
                    Saving your review...
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flash-navigation">
              <button
                onClick={prev}
                disabled={idx === 0 || reviewing}
                className="flash-nav-btn"
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              <span className="flash-nav-count">
                {idx + 1} <span>/</span> {flashcards.length}
              </span>

              <button
                onClick={next}
                disabled={idx === flashcards.length - 1 || reviewing}
                className="flash-nav-btn flash-nav-next"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Study tips */}
          <div className="flash-tip">
            <div className="flash-tip-icon">
              <GraduationCap size={21} />
            </div>

            <div>
              <strong>Study smarter, not harder</strong>
              <p>
                Rate each card honestly. Spaced repetition helps
                you revisit difficult cards more frequently.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
