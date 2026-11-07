
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  ClipboardCheck,
  Layers,
  CheckCircle2,
  CalendarDays,
  Target,
  Clock3,
  TrendingUp,
  Upload,
  BookOpen,
  LayoutDashboard,
  ArrowUpRight,
  Sparkles,
  GraduationCap,
} from 'lucide-react'
import api from '../api/axios'

export default function Progress() {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const r = await api.get('/progress')
      setProgress(r.data)
    } catch {
      // Keep the page available if progress data cannot be loaded.
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="progress-loading">
        <div className="spinner" />
      </div>
    )
  }

  const p = progress || {}

  const quizScore = Math.min(
    100,
    Math.max(0, Number(p.average_quiz_score) || 0)
  )

  const totalHours = Number(p.total_study_hours) || 0
  const completedSessions = Number(p.completed_sessions) || 0
  const activePlans = Number(p.active_plans) || 0

  const stats = [
    {
      label: 'Documents Uploaded',
      value: p.total_documents || 0,
      icon: FileText,
      color: 'blue',
      description: 'Your learning materials',
    },
    {
      label: 'Quizzes Completed',
      value: p.total_quizzes || 0,
      icon: ClipboardCheck,
      color: 'cyan',
      description: 'Knowledge checks taken',
    },
    {
      label: 'Mastered Flashcards',
      value: p.mastered_flashcards || 0,
      icon: Layers,
      color: 'violet',
      description: 'Cards you have mastered',
    },
    {
      label: 'Sessions Completed',
      value: completedSessions,
      icon: CheckCircle2,
      color: 'green',
      description: 'Study sessions finished',
    },
    {
      label: 'Active Study Plans',
      value: activePlans,
      icon: CalendarDays,
      color: 'amber',
      description: 'Plans in progress',
    },
  ]

  const activity = [
    {
      label: 'Total Study Hours',
      value: `${totalHours}h`,
      percentage: Math.min(100, (totalHours / 50) * 100),
      color: 'blue',
      target: '50 hours',
    },
    {
      label: 'Completed Sessions',
      value: completedSessions,
      percentage: Math.min(100, (completedSessions / 20) * 100),
      color: 'green',
      target: '20 sessions',
    },
    {
      label: 'Active Study Plans',
      value: activePlans,
      percentage: Math.min(100, (activePlans / 10) * 100),
      color: 'violet',
      target: '10 plans',
    },
  ]

  const quickLinks = [
    {
      to: '/upload',
      icon: Upload,
      label: 'Upload Documents',
      description: 'Add new study materials',
      color: 'blue',
    },
    {
      to: '/planner',
      icon: CalendarDays,
      label: 'Study Planner',
      description: 'Organize your study goals',
      color: 'cyan',
    },
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      description: 'Return to your workspace',
      color: 'violet',
    },
    {
      to: '/flashcards',
      icon: BookOpen,
      label: 'Flashcards',
      description: 'Practice and review topics',
      color: 'green',
    },
  ]

  return (
    <div className="progress-page fade-in">
      <div className="progress-content">

        {/* Page heading */}
        <header className="progress-header">
          <div>
            <div className="progress-eyebrow">
              <Sparkles size={15} />
              YOUR LEARNING ANALYTICS
            </div>
            <h1>Your Progress</h1>
            <p>
              Track your study activity, monitor your achievements,
              and keep moving toward your learning goals.
            </p>
          </div>

          <div className="progress-header-icon">
            <GraduationCap size={30} />
          </div>
        </header>

        {/* Overview statistics */}
        <section className="progress-stats-section">
          <div className="progress-section-heading">
            <div>
              <h2>Learning Overview</h2>
              <p>Your study activity at a glance</p>
            </div>
            <span className="progress-live-label">
              <span />
              YOUR STATISTICS
            </span>
          </div>

          <div className="progress-stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon

              return (
                <article
                  key={stat.label}
                  className={`progress-stat-card progress-${stat.color}`}
                >
                  <div className="progress-stat-top">
                    <div className="progress-stat-icon">
                      <Icon size={21} />
                    </div>
                    <ArrowUpRight size={17} className="progress-stat-arrow" />
                  </div>

                  <div className="progress-stat-value">
                    {stat.value}
                  </div>

                  <div className="progress-stat-label">
                    {stat.label}
                  </div>

                  <div className="progress-stat-description">
                    {stat.description}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Performance and activity */}
        <section className="progress-analytics-grid">

          {/* Quiz performance */}
          <article className="progress-panel">
            <div className="progress-panel-heading">
              <div className="progress-panel-icon blue">
                <Target size={19} />
              </div>
              <div>
                <h2>Quiz Performance</h2>
                <p>Your average quiz score</p>
              </div>
            </div>

            <div className="progress-performance-content">
              <div className="progress-donut">
                <svg viewBox="0 0 36 36" role="img"
                  aria-label={`Average quiz score: ${quizScore}%`}
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    className="progress-donut-track"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    className="progress-donut-value"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${quizScore} ${100 - quizScore}`}
                  />
                </svg>

                <div className="progress-donut-center">
                  <strong>{quizScore}%</strong>
                  <span>AVERAGE</span>
                </div>
              </div>

              <div className="progress-performance-details">
                <div>
                  <span className="progress-detail-dot blue" />
                  <span>Quizzes Taken</span>
                  <strong>{p.total_quizzes || 0}</strong>
                </div>
                <div>
                  <span className="progress-detail-dot cyan" />
                  <span>Flashcards</span>
                  <strong>{p.total_flashcards || 0}</strong>
                </div>
                <div>
                  <span className="progress-detail-dot violet" />
                  <span>Mastered</span>
                  <strong>{p.mastered_flashcards || 0}</strong>
                </div>
              </div>
            </div>

            <div className="progress-performance-footer">
              <TrendingUp size={16} />
              <span>Keep practicing to strengthen your knowledge.</span>
            </div>
          </article>

          {/* Study activity */}
          <article className="progress-panel">
            <div className="progress-panel-heading">
              <div className="progress-panel-icon green">
                <Clock3 size={19} />
              </div>
              <div>
                <h2>Study Activity</h2>
                <p>Your progress toward study targets</p>
              </div>
            </div>

            <div className="progress-activity-list">
              {activity.map((item) => (
                <div className="progress-activity-item" key={item.label}>
                  <div className="progress-activity-info">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>

                  <div className="progress-activity-track">
                    <div
                      className={`progress-activity-fill ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>

                  <div className="progress-activity-meta">
                    <span>{Math.round(item.percentage)}% of target</span>
                    <span>Target: {item.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Quick access */}
        <section className="progress-quick-section">
          <div className="progress-section-heading">
            <div>
              <h2>Keep Learning</h2>
              <p>Continue building your study momentum</p>
            </div>
          </div>

          <div className="progress-quick-grid">
            {quickLinks.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`progress-quick-card progress-${item.color}`}
                >
                  <div className="progress-quick-icon">
                    <Icon size={22} />
                  </div>

                  <div className="progress-quick-text">
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="progress-quick-arrow"
                  />
                </Link>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}
