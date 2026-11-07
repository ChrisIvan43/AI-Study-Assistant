
import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ClipboardCheck, Sparkles, CheckCircle2, XCircle,
  ArrowLeft, RotateCcw, Target, FileText, Trophy,
  CircleHelp, Send, LoaderCircle
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Quiz() {
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('doc')
  const quizId = searchParams.get('quiz')

  const [document, setDocument] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (docId) fetchDocument()
    else setFetching(false)
  }, [docId])

  useEffect(() => {
    if (quizId) fetchQuizById()
  }, [quizId])

  const fetchDocument = async () => {
    try {
      const r = await api.get(`/documents/${docId}`)
      setDocument(r.data)
    } catch {
      toast.error('Failed to load document')
    } finally {
      setFetching(false)
    }
  }

  const fetchQuizById = async () => {
    try {
      const r = await api.get(`/quiz/${quizId}`)
      setQuiz(r.data)
      setAnswers({})
      setSubmitted(false)
      setResult(null)
    } catch {
      toast.error('Failed to load quiz')
    }
  }

  const generateQuiz = async () => {
    setLoading(true)
    try {
      const r = await api.post('/quiz', {
        document_id: parseInt(docId)
      })
      setQuiz(r.data)
      setAnswers({})
      setSubmitted(false)
      setResult(null)
      toast.success('Quiz generated!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (qid, value) => {
    setAnswers(previous => ({
      ...previous,
      [qid]: value
    }))
  }

  const submitQuiz = async () => {
    const list = Object.entries(answers).map(([qid, answer]) => ({
      question_id: parseInt(qid),
      user_answer: answer || ''
    }))

    if (list.length !== quiz.questions.length) {
      toast.error('Please answer all questions')
      return
    }

    setSubmitting(true)
    try {
      const r = await api.post(`/quiz/${quiz.id}/submit`, {
        answers: list
      })
      setResult(r.data)
      setSubmitted(true)
      toast.success(`Score: ${r.data.score}/${r.data.total}`)
    } catch {
      toast.error('Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const answeredCount = quiz
    ? quiz.questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length
    : 0

  const questionType = type => {
    if (type === 'multiple_choice') return 'Multiple Choice'
    if (type === 'true_false') return 'True / False'
    return 'Short Answer'
  }

  if (fetching) {
    return (
      <div className="quiz-loading">
        <LoaderCircle className="quiz-loading-icon" />
        <p>Loading your quiz workspace...</p>
      </div>
    )
  }

  if (!docId || !document) {
    return (
      <div className="quiz-page">
        <div className="quiz-empty-state">
          <div className="quiz-empty-icon">
            <FileText size={34} />
          </div>
          <h2>Choose a study document</h2>
          <p>Select a document from your dashboard to generate a practice quiz.</p>
          <Link to="/dashboard" className="quiz-primary-link">
            <ArrowLeft size={17} />
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-page fade-in">
      <div className="quiz-content">

        <div className="quiz-topbar">
          <Link to="/dashboard" className="quiz-back-link">
            <ArrowLeft size={17} />
            Dashboard
          </Link>
          <span className="quiz-workspace-label">
            <Sparkles size={15} />
            AI STUDY WORKSPACE
          </span>
        </div>

        <header className="quiz-header">
          <div className="quiz-header-icon">
            <ClipboardCheck size={25} />
          </div>
          <div className="quiz-header-copy">
            <span className="quiz-eyebrow">PRACTICE AND LEARN</span>
            <h1>Practice Quiz</h1>
            <p>Test your understanding and track your learning progress.</p>
          </div>
        </header>

        <div className="quiz-document-card">
          <div className="quiz-document-icon">
            <FileText size={21} />
          </div>
          <div className="quiz-document-info">
            <span>STUDYING FROM</span>
            <strong>{document.title}</strong>
          </div>
          <div className="quiz-document-status">
            <CheckCircle2 size={15} />
            Document loaded
          </div>
        </div>

        {!quiz && (
          <section className="quiz-generate-panel">
            <div className="quiz-generate-art">
              <div className="quiz-generate-orbit">
                <Target size={42} />
              </div>
              <Sparkles className="quiz-generate-sparkle" size={21} />
            </div>

            <span className="quiz-eyebrow">AI-POWERED LEARNING</span>
            <h2>Ready to test yourself?</h2>
            <p>
              Generate a personalized practice quiz based on your study
              document. Review what you know and discover what needs more work.
            </p>

            <button
              onClick={generateQuiz}
              disabled={loading}
              className="quiz-primary-button"
            >
              {loading ? (
                <>
                  <LoaderCircle className="quiz-spin" size={19} />
                  Generating quiz...
                </>
              ) : (
                <>
                  <Sparkles size={19} />
                  Generate Practice Quiz
                </>
              )}
            </button>
          </section>
        )}

        {quiz && !submitted && (
          <section className="quiz-question-section">
            <div className="quiz-overview">
              <div>
                <span className="quiz-eyebrow">YOUR QUIZ</span>
                <h2>{quiz.title}</h2>
                {quiz.is_focus_quiz && (
                  <span className="quiz-adaptive-badge">
                    <Target size={13} />
                    Adaptive Focus Quiz
                  </span>
                )}
              </div>

              <div className="quiz-question-total">
                <strong>{quiz.questions.length}</strong>
                <span>Questions</span>
              </div>
            </div>

            <div className="quiz-progress-panel">
              <div className="quiz-progress-labels">
                <span>Completion progress</span>
                <strong>{answeredCount} of {quiz.questions.length} answered</strong>
              </div>
              <div className="quiz-progress-track">
                <div
                  className="quiz-progress-fill"
                  style={{
                    width: `${quiz.questions.length ? answeredCount / quiz.questions.length * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div className="quiz-questions-list">
              {quiz.questions.map((q, index) => (
                <article key={q.id} className="quiz-question-card">
                  <div className="quiz-question-heading">
                    <span className="quiz-question-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`quiz-type-badge quiz-type-${q.question_type}`}>
                      {questionType(q.question_type)}
                    </span>
                    {answers[q.id] !== undefined && answers[q.id] !== '' && (
                      <span className="quiz-answered-indicator">
                        <CheckCircle2 size={14} />
                        Answered
                      </span>
                    )}
                  </div>

                  <h3>{q.question}</h3>

                  {q.question_type === 'multiple_choice' && (
                    <div className="quiz-options-list">
                      {['option_a', 'option_b', 'option_c', 'option_d'].map((key, optionIndex) => (
                        q[key] && (
                          <label
                            key={key}
                            className={`quiz-option-card ${answers[q.id] === q[key] ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={q[key]}
                              checked={answers[q.id] === q[key]}
                              onChange={() => handleAnswer(q.id, q[key])}
                            />
                            <span className="quiz-option-letter">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span className="quiz-option-text">{q[key]}</span>
                            <span className="quiz-option-check">
                              <CheckCircle2 size={18} />
                            </span>
                          </label>
                        )
                      ))}
                    </div>
                  )}

                  {q.question_type === 'true_false' && (
                    <div className="quiz-boolean-options">
                      {['True', 'False'].map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleAnswer(q.id, option)}
                          className={`quiz-boolean-button ${answers[q.id] === option ? 'selected' : ''}`}
                        >
                          {option === 'True'
                            ? <CheckCircle2 size={19} />
                            : <XCircle size={19} />
                          }
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'short_answer' && (
                    <textarea
                      className="quiz-short-answer"
                      value={answers[q.id] || ''}
                      placeholder="Write your answer here..."
                      rows={3}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                    />
                  )}
                </article>
              ))}
            </div>

            <div className="quiz-submit-panel">
              <div>
                <strong>Ready to submit?</strong>
                <p>
                  {answeredCount === quiz.questions.length
                    ? 'All questions answered. You can submit your quiz.'
                    : `${quiz.questions.length - answeredCount} question(s) remaining.`
                  }
                </p>
              </div>
              <button
                onClick={submitQuiz}
                disabled={submitting}
                className="quiz-primary-button"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="quiz-spin" size={18} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Submit Answers
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {submitted && result && (
          <section className="quiz-results-section">
            <div className="quiz-result-hero">
              <div className="quiz-result-trophy">
                <Trophy size={34} />
              </div>
              <span className="quiz-eyebrow">QUIZ COMPLETED</span>
              <h2>Great effort!</h2>
              <p>Here is how you performed on this practice quiz.</p>

              <div className="quiz-result-score">
                <strong>{result.score}</strong>
                <span>/ {result.total}</span>
              </div>
              <div className="quiz-result-percentage">
                {result.percentage}% Correct
              </div>

              <div className="quiz-result-track">
                <div
                  className="quiz-result-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, Number(result.percentage) || 0))}%`
                  }}
                />
              </div>
            </div>

            <div className="quiz-review-heading">
              <div>
                <span className="quiz-eyebrow">LEARNING REVIEW</span>
                <h2>Review your answers</h2>
              </div>
              <span className="quiz-review-count">
                {result.questions.length} Questions
              </span>
            </div>

            <div className="quiz-review-list">
              {result.questions.map((q, index) => {
                const userAnswer = answers[q.id] || ''
                const correct = (q.correct_answer || '').trim().toLowerCase()
                  === userAnswer.trim().toLowerCase()

                return (
                  <article
                    key={q.id}
                    className={`quiz-review-card ${correct ? 'correct' : 'incorrect'}`}
                  >
                    <div className="quiz-review-status">
                      {correct
                        ? <CheckCircle2 size={19} />
                        : <XCircle size={19} />
                      }
                      <span>Question {index + 1}</span>
                      <strong>{correct ? 'Correct' : 'Incorrect'}</strong>
                    </div>

                    <h3>{q.question}</h3>

                    <p>
                      Your answer:
                      <strong>{userAnswer || 'No answer'}</strong>
                    </p>
                    <p>
                      Correct answer:
                      <strong>{q.correct_answer}</strong>
                    </p>
                  </article>
                )
              })}
            </div>

            <div className="quiz-result-actions">
              <button
                onClick={generateQuiz}
                disabled={loading}
                className="quiz-primary-button"
              >
                <RotateCcw size={17} />
                {loading ? 'Generating...' : 'Try Another Quiz'}
              </button>
              <Link
                to={`/summary?doc=${docId}`}
                className="quiz-secondary-button"
              >
                <FileText size={17} />
                Back to Summary
              </Link>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
