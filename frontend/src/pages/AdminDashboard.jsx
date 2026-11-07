import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  GraduationCap,
  ShieldCheck,
  Files,
  FileText,
  ClipboardList,
  Layers,
  Activity,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import api from '../api/axios'

const statCards = [
  { key: 'total_users', label: 'Total Users', icon: Users, color: 'blue' },
  { key: 'total_students', label: 'Students', icon: GraduationCap, color: 'cyan' },
  { key: 'total_admins', label: 'Administrators', icon: ShieldCheck, color: 'purple' },
  { key: 'total_documents', label: 'Documents', icon: Files, color: 'orange' },
  { key: 'total_summaries', label: 'Summaries', icon: FileText, color: 'green' },
  { key: 'total_quizzes', label: 'Quizzes', icon: ClipboardList, color: 'pink' },
  { key: 'total_flashcards', label: 'Flashcard Sets', icon: Layers, color: 'indigo' },
]

const activityIcons = {
  quiz: ClipboardList,
  summary: FileText,
  flashcards: Layers,
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null)
  const [activity, setActivity] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [overviewResult, activityResult, healthResult] =
        await Promise.allSettled([
          api.get('/admin/overview'),
          api.get('/admin/activity', { params: { limit: 8 } }),
          api.get('/admin/health'),
        ])

      if (overviewResult.status === 'fulfilled') {
        setOverview(overviewResult.value.data)
      } else {
        throw overviewResult.reason
      }

      if (activityResult.status === 'fulfilled') {
        setActivity(activityResult.value.data.activity || [])
      } else {
        setActivity([])
      }

      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value.data)
      } else {
        setHealth({
          database: 'unavailable',
          status: 'degraded',
        })
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to load administrator dashboard data.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return (
    <div className="admin-dashboard">
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">SYSTEM CONTROL CENTER</span>
          <h1>Overview</h1>
          <p>Monitor users, study activity, and platform health.</p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'admin-spinning' : ''} />
          <span>{loading ? 'Refreshing...' : 'Refresh data'}</span>
        </button>
      </section>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button type="button" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      )}

      <section className="admin-stats-grid">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <article className="admin-stat-card" key={key}>
            <div className={`admin-stat-icon ${color}`}>
              <Icon size={21} />
            </div>

            <div className="admin-stat-content">
              <span>{label}</span>
              <strong>
                {loading && !overview
                  ? '—'
                  : Number(overview?.[key] ?? 0).toLocaleString()}
              </strong>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-panel admin-activity-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">PLATFORM ENGAGEMENT</span>
              <h2>Recent Activity</h2>
            </div>
            <Activity size={20} />
          </div>

          {loading && activity.length === 0 ? (
            <div className="admin-empty-state">
              <span className="admin-loading-spinner" />
              <p>Loading recent activity...</p>
            </div>
          ) : activity.length === 0 ? (
            <div className="admin-empty-state">
              <Clock3 size={27} />
              <p>No recent study activity found.</p>
            </div>
          ) : (
            <div className="admin-activity-list">
              {activity.map((item) => {
                const Icon = activityIcons[item.type] || Activity

                return (
                  <div
                    className="admin-activity-item"
                    key={`${item.type}-${item.id}`}
                  >
                    <div className={`admin-activity-icon ${item.type}`}>
                      <Icon size={18} />
                    </div>

                    <div className="admin-activity-details">
                      <strong>{item.title}</strong>
                      <span>
                        {item.user_name || 'Unknown user'} ·{' '}
                        {item.document_title || 'Untitled document'}
                      </span>
                      <small>{formatDate(item.created_at)}</small>
                    </div>

                    <span className={`admin-activity-type ${item.type}`}>
                      {item.type}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        <article className="admin-panel admin-health-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">INFRASTRUCTURE</span>
              <h2>System Health</h2>
            </div>
            <Database size={20} />
          </div>

          <div className="admin-health-item">
            <div className="admin-health-icon">
              <Database size={20} />
            </div>

            <div className="admin-health-details">
              <strong>Database</strong>
              <span>PostgreSQL connection</span>
            </div>

            {health?.status === 'healthy' ? (
              <span className="admin-health-status healthy">
                <CheckCircle2 size={14} />
                Healthy
              </span>
            ) : health?.status === 'degraded' ? (
              <span className="admin-health-status degraded">
                <AlertCircle size={14} />
                Degraded
              </span>
            ) : (
              <span className="admin-health-status pending">
                {loading ? 'Checking...' : 'Unknown'}
              </span>
            )}
          </div>

          <div className="admin-health-note">
            <span className="admin-health-indicator" />
            <p>
              {health?.status === 'healthy'
                ? 'The database responded successfully to the health check.'
                : health?.status === 'degraded'
                  ? 'The database health check failed. Investigate the connection.'
                  : 'Database health information is not currently available.'}
            </p>
          </div>
        </article>
      </section>
    </div>
  )
}
