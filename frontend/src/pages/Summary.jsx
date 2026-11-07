import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers3,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  Target,
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import './Summary.css'

export default function Summary() {
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('doc')

  const [document, setDocument] = useState(null)
  const [summary, setSummary] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    const fetchDocument = async () => {
      if (!docId) {
        setDocument(null)
        setSummary(null)
        setFetching(false)
        return
      }

      setFetching(true)
      setDocument(null)
      setSummary(null)

      try {
        const response = await api.get(`/documents/${docId}`)

        if (active) {
          setDocument(response.data)
        }
      } catch {
        if (active) {
          setDocument(null)
          toast.error('Failed to load document')
        }
      } finally {
        if (active) {
          setFetching(false)
        }
      }
    }

    fetchDocument()

    return () => {
      active = false
    }
  }, [docId])

  const generateSummary = async () => {
    if (!docId || loading) return

    setLoading(true)

    try {
      const response = await api.post('/summary', {
        document_id: parseInt(docId, 10),
      })

      setSummary(response.data)
      toast.success('Summary generated!')
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Failed to generate summary'
      )
    } finally {
      setLoading(false)
    }
  }

  const rawKeyPoints = summary?.key_points ?? summary?.key_concepts

  const keyPoints = Array.isArray(rawKeyPoints)
    ? rawKeyPoints
    : typeof rawKeyPoints === 'string'
      ? rawKeyPoints.split('\n').filter((point) => point.trim())
      : []

  const overview =
    summary?.detailed_summary ||
    summary?.short_summary ||
    summary?.summary ||
    ''

  const quickSummary =
    summary?.short_summary && summary.short_summary !== overview
      ? summary.short_summary
      : null

  if (fetching) {
    return (
      <div className="summary-loading">
        <LoaderCircle className="summary-spin" size={30} />
        <p>Loading your document...</p>
      </div>
    )
  }

  if (!docId || !document) {
    return (
      <div className="summary-empty-page">
        <div className="summary-empty-card">
          <div className="summary-empty-icon">
            <FileText size={32} />
          </div>

          <span className="summary-eyebrow">STUDY WORKSPACE</span>
          <h2>No document selected</h2>
          <p>
            Choose a document from your dashboard to generate an AI-powered
            summary and review its important concepts.
          </p>

          <Link to="/dashboard" className="summary-primary-btn">
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="summary-page">
      <div className="summary-content">
        {/* Navigation */}
        <div className="summary-topbar">
          <Link to="/dashboard" className="summary-back-link">
            <ArrowLeft size={17} />
            <span>Back to Dashboard</span>
          </Link>

          <div className="summary-breadcrumb">
            <BookOpen size={15} />
            <span>Study Workspace</span>
            <span className="summary-breadcrumb-divider">/</span>
            <span>Summary</span>
          </div>
        </div>

        {/* Document heading */}
        <header className="summary-header">
          <div className="summary-header-main">
            <div className="summary-heading-icon">
              <FileText size={24} />
            </div>

            <div className="summary-heading-text">
              <span className="summary-eyebrow">AI DOCUMENT ANALYSIS</span>
              <h1>{document.title || 'Untitled document'}</h1>
              <p>
                Turn your learning material into clear, organized study notes.
              </p>
            </div>
          </div>

          <div className="summary-status">
            <span className="summary-status-dot" />
            {summary ? 'Summary ready' : 'Ready to analyze'}
          </div>
        </header>

        {/* Generate summary */}
        {!summary && (
          <section className="summary-generate-card">
            <div className="summary-generate-decoration" aria-hidden="true">
              <div className="summary-decoration-orbit summary-orbit-one" />
              <div className="summary-decoration-orbit summary-orbit-two" />

              <div className="summary-decoration-icon">
                <Sparkles size={34} />
              </div>

              <div className="summary-decoration-star summary-star-one">
                ✦
              </div>
              <div className="summary-decoration-star summary-star-two">
                ✧
              </div>
            </div>

            <div className="summary-generate-copy">
              <span className="summary-eyebrow">AI-POWERED LEARNING</span>
              <h2>Your study summary is one step away.</h2>
              <p>
                Let AI analyze your document and organize its main ideas,
                detailed explanations, and important learning concepts.
              </p>

              <button
                type="button"
                onClick={generateSummary}
                disabled={loading}
                className="summary-primary-btn"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={18} className="summary-spin" />
                    Analyzing document...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Summary
                  </>
                )}
              </button>

              <div className="summary-generate-note">
                <Clock3 size={14} />
                <span>Generation may take a few moments</span>
              </div>
            </div>

            <div className="summary-generate-footer">
              <div>
                <FileText size={17} />
                <span>Document selected</span>
              </div>

              <span className="summary-footer-dot" />

              <span className="summary-footer-ready">
                Ready for analysis
              </span>
            </div>
          </section>
        )}

        {/* Generated summary */}
        {summary && (
          <div className="summary-results">
            {/* Completion banner */}
            <section className="summary-result-banner">
              <div className="summary-result-icon">
                <CheckCircle2 size={23} />
              </div>

              <div>
                <span className="summary-eyebrow">ANALYSIS COMPLETE</span>
                <h2>Your document summary is ready</h2>
                <p>
                  Review the main ideas and important concepts below.
                </p>
              </div>
            </section>

            {/* Quick overview */}
            {quickSummary && (
              <section className="summary-quick-card">
                <div className="summary-section-heading">
                  <div className="summary-section-icon summary-icon-violet">
                    <Lightbulb size={19} />
                  </div>

                  <div>
                    <span className="summary-eyebrow">QUICK OVERVIEW</span>
                    <h2>In a nutshell</h2>
                  </div>
                </div>

                <p className="summary-quick-text">{quickSummary}</p>
              </section>
            )}

            {/* Detailed overview */}
            <section className="summary-panel">
              <div className="summary-section-heading">
                <div className="summary-section-icon summary-icon-blue">
                  <FileText size={19} />
                </div>

                <div>
                  <span className="summary-eyebrow">DOCUMENT BREAKDOWN</span>
                  <h2>Detailed Overview</h2>
                </div>
              </div>

              {overview ? (
                <div className="summary-overview-text">{overview}</div>
              ) : (
                <p className="summary-no-content">
                  No detailed overview was returned for this document.
                </p>
              )}
            </section>

            {/* Key concepts */}
            {keyPoints.length > 0 && (
              <section className="summary-panel">
                <div className="summary-section-heading">
                  <div className="summary-section-icon summary-icon-cyan">
                    <Target size={19} />
                  </div>

                  <div>
                    <span className="summary-eyebrow">
                      IMPORTANT TAKEAWAYS
                    </span>
                    <h2>Key Concepts</h2>
                  </div>

                  <span className="summary-count">
                    {keyPoints.length}{' '}
                    {keyPoints.length === 1 ? 'concept' : 'concepts'}
                  </span>
                </div>

                <div className="summary-concept-list">
                  {keyPoints.map((point, index) => {
                    const cleanPoint = String(point)
                      .replace(/^[-*•]\s*/, '')
                      .trim()

                    if (!cleanPoint) return null

                    return (
                      <div className="summary-concept-item" key={index}>
                        <div className="summary-concept-number">
                          {String(index + 1).padStart(2, '0')}
                        </div>

                        <div className="summary-concept-check">
                          <CheckCircle2 size={17} />
                        </div>

                        <p>{cleanPoint}</p>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Continue learning */}
            <section className="summary-next-section">
              <div className="summary-next-heading">
                <span className="summary-eyebrow">KEEP LEARNING</span>
                <h2>Continue your study session</h2>
                <p>
                  Use your generated summary to practice and reinforce what
                  you have learned.
                </p>
              </div>

              <div className="summary-action-grid">
                <Link
                  to={`/quiz?doc=${docId}`}
                  className="summary-action-card"
                >
                  <div className="summary-action-icon summary-action-violet">
                    <HelpCircle size={22} />
                  </div>

                  <div className="summary-action-copy">
                    <h3>Take a Quiz</h3>
                    <p>Test your understanding</p>
                  </div>

                  <ArrowRight className="summary-action-arrow" size={19} />
                </Link>

                <Link
                  to={`/flashcards?doc=${docId}`}
                  className="summary-action-card"
                >
                  <div className="summary-action-icon summary-action-blue">
                    <Layers3 size={22} />
                  </div>

                  <div className="summary-action-copy">
                    <h3>Review Flashcards</h3>
                    <p>Practice important terms</p>
                  </div>

                  <ArrowRight className="summary-action-arrow" size={19} />
                </Link>

                <Link
                  to={`/chat?doc=${docId}`}
                  className="summary-action-card"
                >
                  <div className="summary-action-icon summary-action-cyan">
                    <MessageSquareText size={22} />
                  </div>

                  <div className="summary-action-copy">
                    <h3>Ask AI</h3>
                    <p>Explore your document</p>
                  </div>

                  <ArrowRight className="summary-action-arrow" size={19} />
                </Link>
              </div>
            </section>

            <div className="summary-bottom-link">
              <GraduationCap size={19} />
              <span>Keep learning. One concept at a time.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}