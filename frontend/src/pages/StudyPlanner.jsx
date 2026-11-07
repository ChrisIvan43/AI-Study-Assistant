
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  CalendarDays,
  Clock,
  Check,
  Plus,
  Trash2,
  X,
  Target,
  CalendarClock,
  Sparkles,
  Layers,
  BookOpen,
  GraduationCap,
  ArrowUpRight,
  ChevronDown,
  FileText,
  AlertCircle,
  Flame,
  RefreshCw,
} from 'lucide-react'

export default function StudyPlanner() {
  const navigate = useNavigate()

  const [plans, setPlans] = useState([])
  const [sessions, setSessions] = useState({})
  const [collections, setCollections] = useState([])
  const [recommendations, setRecommendations] = useState({})
  const [generating, setGenerating] = useState(null)
  const [logging, setLogging] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    subject: '',
    exam_date: '',
    daily_hours: 2,
    collection_id: '',
  })

  useEffect(() => {
    fetchPlans()
    fetchCollections()
  }, [])

  const fetchPlans = async () => {
    try {
      const r = await api.get('/study-plan')
      setPlans(r.data.plans || [])
    } catch {
      toast.error('Failed to load study plans')
    } finally {
      setLoading(false)
    }
  }

  const fetchCollections = async () => {
    try {
      const r = await api.get('/collections')
      setCollections(r.data.collections || [])
    } catch {
      // Collections are optional.
    }
  }

  const fetchSessions = async id => {
    try {
      const r = await api.get(`/study-plan/${id}/sessions`)
      setSessions(p => ({ ...p, [id]: r.data.sessions || [] }))
    } catch {
      toast.error('Failed to load study sessions')
    }
  }

  const fetchRecommendations = async id => {
    try {
      const r = await api.get(`/study-plan/${id}/recommendations`)
      setRecommendations(p => ({ ...p, [id]: r.data }))
    } catch {
      toast.error('Failed to load recommendations')
    }
  }

  const generateFocusQuiz = async id => {
    setGenerating(id)

    try {
      const r = await api.post(`/study-plan/${id}/focus-quiz`, {})
      toast.success('Focus quiz ready!')
      navigate(`/quiz?doc=${r.data.document_id}&quiz=${r.data.id}`)
    } catch (e) {
      toast.error(
        e.response?.data?.detail || 'Failed to generate focus quiz'
      )
    } finally {
      setGenerating(null)
    }
  }

  const createPlan = async e => {
    e.preventDefault()
    if (saving) return

    setSaving(true)

    try {
      const payload = {
        ...form,
        collection_id: form.collection_id
          ? parseInt(form.collection_id)
          : null,
      }

      const r = await api.post('/study-plan', payload)

      setPlans(p => [r.data, ...p])
      setShowForm(false)

      setForm({
        subject: '',
        exam_date: '',
        daily_hours: 2,
        collection_id: '',
      })

      toast.success('Study plan created!')
    } catch (e) {
      toast.error(
        e.response?.data?.detail || 'Failed to create plan'
      )
    } finally {
      setSaving(false)
    }
  }

  const logSession = async id => {
    const plan = plans.find(p => p.id === id)
    if (!plan || logging === id) return

    setLogging(id)

    try {
      await api.post('/study-plan/session', {
        plan_id: id,
        date: new Date().toISOString().split('T')[0],
        hours_spent: plan.daily_hours,
        completed: true,
      })

      await Promise.all([fetchSessions(id), fetchPlans()])
      toast.success('Study session logged!')
    } catch {
      toast.error('Failed to log session')
    } finally {
      setLogging(null)
    }
  }

  const deletePlan = async id => {
    if (!confirm('Delete this study plan?')) return

    try {
      await api.delete(`/study-plan/${id}`)
      setPlans(p => p.filter(x => x.id !== id))
      toast.success('Plan deleted')
    } catch {
      toast.error('Failed to delete plan')
    }
  }

  const daysLeft = date =>
    Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))

  const formatDate = date =>
    new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const getUrgency = days => {
    if (days < 0) return 'past'
    if (days <= 7) return 'urgent'
    if (days <= 14) return 'soon'
    return 'normal'
  }

  const upcomingPlans = plans.filter(
    p => daysLeft(p.exam_date) >= 0
  )

  const totalDailyHours = plans.reduce(
    (total, p) => total + (Number(p.daily_hours) || 0),
    0
  )

  const averageProgress = plans.length
    ? Math.round(
        plans.reduce((total, p) => total + (Number(p.progress) || 0), 0) /
          plans.length
      )
    : 0

  if (loading) {
    return (
      <div className="planner-loading">
        <div className="spinner" />
        <p>Loading your study plans...</p>
      </div>
    )
  }

  return (
    <div className="planner-page fade-in">
      <div className="planner-content">

        {/* Page Header */}
        <header className="planner-header">
          <div className="planner-heading">
            <div className="planner-eyebrow">
              <Sparkles size={14} />
              YOUR LEARNING WORKSPACE
            </div>

            <h1>Study Planner</h1>

            <p>
              Build better study habits, organize your schedule, and
              prepare confidently for your exams.
            </p>
          </div>

          <button
            onClick={() => setShowForm(o => !o)}
            className={showForm
              ? 'planner-secondary-button'
              : 'planner-primary-button'}
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancel' : 'Create Study Plan'}
          </button>
        </header>

        {/* Overview Cards */}
        <section className="planner-stats">
          <div className="planner-stat-card">
            <div className="planner-stat-icon planner-icon-blue">
              <BookOpen size={21} />
            </div>
            <div>
              <span className="planner-stat-label">Total Study Plans</span>
              <strong>{plans.length}</strong>
              <small>Organized learning goals</small>
            </div>
          </div>

          <div className="planner-stat-card">
            <div className="planner-stat-icon planner-icon-violet">
              <CalendarClock size={21} />
            </div>
            <div>
              <span className="planner-stat-label">Upcoming Exams</span>
              <strong>{upcomingPlans.length}</strong>
              <small>Exams to prepare for</small>
            </div>
          </div>

          <div className="planner-stat-card">
            <div className="planner-stat-icon planner-icon-cyan">
              <Clock size={21} />
            </div>
            <div>
              <span className="planner-stat-label">Planned Study Hours</span>
              <strong>{totalDailyHours}h</strong>
              <small>Combined hours per day</small>
            </div>
          </div>

          <div className="planner-stat-card">
            <div className="planner-stat-icon planner-icon-green">
              <Target size={21} />
            </div>
            <div>
              <span className="planner-stat-label">Average Progress</span>
              <strong>{averageProgress}%</strong>
              <small>Across all study plans</small>
            </div>
          </div>
        </section>

        {/* Create Plan Form */}
        {showForm && (
          <section className="planner-form-panel fade-in">
            <div className="planner-section-heading">
              <div className="planner-section-icon">
                <Target size={19} />
              </div>
              <div>
                <h2>Create a Study Plan</h2>
                <p>Set your learning goal and exam preparation schedule.</p>
              </div>
            </div>

            <form onSubmit={createPlan} className="planner-form">
              <div className="planner-field">
                <label htmlFor="planner-subject">Subject / Course</label>
                <input
                  id="planner-subject"
                  type="text"
                  value={form.subject}
                  placeholder="e.g. Mathematics 101"
                  onChange={e =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  required
                />
              </div>

              <div className="planner-form-grid">
                <div className="planner-field">
                  <label htmlFor="planner-date">Exam Date</label>
                  <input
                    id="planner-date"
                    type="date"
                    value={form.exam_date}
                    min={new Date().toLocaleDateString('en-CA')}
                    onChange={e =>
                      setForm({ ...form, exam_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="planner-field">
                  <label htmlFor="planner-hours">Hours per Day</label>
                  <input
                    id="planner-hours"
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={form.daily_hours}
                    onChange={e =>
                      setForm({
                        ...form,
                        daily_hours: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>

              {collections.length > 0 && (
                <div className="planner-field">
                  <label htmlFor="planner-collection">
                    <FolderOpenIcon />
                    Collection <span>(optional)</span>
                  </label>

                  <select
                    id="planner-collection"
                    value={form.collection_id}
                    onChange={e =>
                      setForm({ ...form, collection_id: e.target.value })
                    }
                  >
                    <option value="">No collection selected</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="planner-form-actions">
                <button
                  type="button"
                  className="planner-secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="planner-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="planner-button-spinner" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create Study Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Study Plans */}
        <section className="planner-plans-section">
          <div className="planner-section-title">
            <div>
              <h2>Your Study Plans</h2>
              <p>Track your progress and stay prepared.</p>
            </div>
            <span className="planner-count">{plans.length} plans</span>
          </div>

          {plans.length === 0 ? (
            <div className="planner-empty-state">
              <div className="planner-empty-icon">
                <GraduationCap size={38} />
              </div>
              <h3>No Study Plans Yet</h3>
              <p>
                Create your first study plan to organize your exam
                preparation and build a consistent study routine.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="planner-primary-button"
              >
                <Plus size={18} />
                Create Your First Plan
              </button>
            </div>
          ) : (
            <div className="planner-plan-list">
              {plans.map(plan => {
                const days = daysLeft(plan.exam_date)
                const urgency = getUrgency(days)
                const progress = Math.min(
                  100,
                  Math.max(0, Number(plan.progress) || 0)
                )

                const recommendation = recommendations[plan.id]
                const dueFlashcards = recommendation?.due_flashcards || []
                const weakTopics = recommendation?.weak_topics || []

                return (
                  <article key={plan.id} className="planner-plan-card">
                    <div className="planner-plan-accent" />

                    <div className="planner-plan-inner">
                      <div className="planner-plan-top">
                        <div className="planner-plan-title-group">
                          <div className="planner-plan-icon">
                            <FileText size={20} />
                          </div>

                          <div>
                            <h3>{plan.subject}</h3>
                            <p>Exam preparation plan</p>
                          </div>
                        </div>

                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="planner-delete-button"
                          title="Delete study plan"
                          aria-label={`Delete ${plan.subject} study plan`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <div className="planner-plan-meta">
                        <span className="planner-meta-item">
                          <CalendarDays size={14} />
                          {formatDate(plan.exam_date)}
                        </span>

                        <span className="planner-meta-item">
                          <Clock size={14} />
                          {plan.daily_hours}h / day
                        </span>

                        <span className={`planner-deadline planner-deadline-${urgency}`}>
                          {days > 0
                            ? `${days} days left`
                            : days === 0
                              ? 'Exam today'
                              : 'Exam date passed'}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="planner-progress-section">
                        <div className="planner-progress-heading">
                          <span>Completion Progress</span>
                          <strong>{progress}%</strong>
                        </div>

                        <div
                          className="planner-progress-track"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${plan.subject} completion progress`}
                        >
                          <div
                            className="planner-progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Log Session */}
                      <div className="planner-plan-actions">
                        <button
                          onClick={() => logSession(plan.id)}
                          className="planner-log-button"
                          disabled={logging === plan.id}
                        >
                          {logging === plan.id ? (
                            <span className="planner-button-spinner" />
                          ) : (
                            <Check size={16} />
                          )}
                          {logging === plan.id ? 'Logging...' : 'Log Today’s Session'}
                        </button>
                      </div>

                      {/* Schedule */}
                      {plan.schedule && (
                        <details className="planner-details">
                          <summary>
                            <span>
                              <CalendarDays size={16} />
                              View Study Schedule
                            </span>
                            <ChevronDown size={17} className="planner-chevron" />
                          </summary>

                          <pre className="planner-schedule-content">
                            {plan.schedule}
                          </pre>
                        </details>
                      )}

                      {/* Sessions */}
                      <details
                        className="planner-details"
                        onToggle={e =>
                          e.target.open &&
                          !sessions[plan.id] &&
                          fetchSessions(plan.id)
                        }
                      >
                        <summary>
                          <span>
                            <Clock size={16} />
                            Study Sessions
                            <span className="planner-detail-count">
                              {sessions[plan.id]?.length || 0}
                            </span>
                          </span>
                          <ChevronDown size={17} className="planner-chevron" />
                        </summary>

                        <div className="planner-details-content">
                          {!sessions[plan.id] ? (
                            <p className="planner-muted-message">
                              Open to load your study sessions.
                            </p>
                          ) : sessions[plan.id].length === 0 ? (
                            <p className="planner-muted-message">
                              No study sessions logged yet.
                            </p>
                          ) : (
                            sessions[plan.id].map(s => (
                              <div key={s.id} className="planner-session-row">
                                <div className="planner-session-date">
                                  <CalendarDays size={15} />
                                  {formatDate(s.date)}
                                </div>

                                <div className="planner-session-info">
                                  <span>
                                    <Clock size={14} />
                                    {s.hours_spent}h
                                  </span>
                                  <span className={
                                    s.completed
                                      ? 'planner-session-done'
                                      : 'planner-session-pending'
                                  }>
                                    {s.completed ? (
                                      <>
                                        <Check size={14} /> Done
                                      </>
                                    ) : 'Pending'}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      {/* Recommendations */}
                      {plan.collection_id && (
                        <details
                          className="planner-details planner-recommendations"
                          onToggle={e =>
                            e.target.open &&
                            !recommendations[plan.id] &&
                            fetchRecommendations(plan.id)
                          }
                        >
                          <summary>
                            <span>
                              <Sparkles size={16} />
                              Recommended Focus Today
                            </span>
                            <ChevronDown size={17} className="planner-chevron" />
                          </summary>

                          <div className="planner-details-content">
                            {!recommendation ? (
                              <p className="planner-muted-message">
                                Recommendations will load when this section opens.
                              </p>
                            ) : (
                              <>
                                <div className="planner-recommendation-stats">
                                  <span>
                                    <Layers size={14} />
                                    {dueFlashcards.length} flashcards due
                                  </span>
                                  <span>
                                    <Flame size={14} />
                                    {weakTopics.length} weak topics
                                  </span>
                                </div>

                                {weakTopics.length > 0 && (
                                  <div className="planner-weak-topics">
                                    <h4>Topics to Review</h4>

                                    {weakTopics.slice(0, 5).map(w => (
                                      <div
                                        key={w.question_id}
                                        className="planner-weak-topic"
                                      >
                                        <span>{w.question}</span>
                                        <small>Missed {w.missed_count}x</small>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {recommendation.recommended_quiz_available ? (
                                  <button
                                    onClick={() => generateFocusQuiz(plan.id)}
                                    disabled={generating === plan.id}
                                    className="planner-focus-button"
                                  >
                                    {generating === plan.id ? (
                                      <>
                                        <RefreshCw size={16} className="planner-spin" />
                                        Generating Quiz...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={16} />
                                        Generate Focus Quiz
                                        <ArrowUpRight size={15} />
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <p className="planner-muted-message">
                                    No weak spots yet. Review some flashcards
                                    or take a quiz in this collection first.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <div className="planner-footer-note">
          <div>
            <AlertCircle size={15} />
            <span>Consistency is more important than studying for long hours.</span>
          </div>
        </div>

      </div>
    </div>
  )
}

function FolderOpenIcon() {
  return <Layers size={14} />
}
