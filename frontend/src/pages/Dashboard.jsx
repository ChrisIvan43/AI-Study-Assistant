
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  FileText,
  HelpCircle,
  Target,
  Layers,
  Star,
  Clock,
  UploadCloud,
  Sparkles,
  BrainCircuit,
  MessageSquareText,
  FolderOpen,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [documents, setDocuments] = useState([])
  const [collections, setCollections] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  const collectionFilter = searchParams.get('collection') || ''

  useEffect(() => {
    fetchData()
  }, [collectionFilter])

  const fetchData = async () => {
    try {
      const docParams = collectionFilter
        ? { collection_id: collectionFilter }
        : {}

      const [dr, pr, cr] = await Promise.all([
        api.get('/documents', { params: docParams }),
        api.get('/progress'),
        api.get('/collections'),
      ])

      setDocuments(dr.data.documents || [])
      setProgress(pr.data)
      setCollections(cr.data.collections || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const collectionName = (id) =>
    collections.find((collection) => collection.id === id)?.name

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Preparing your study workspace...</p>
      </div>
    )
  }

  const avgScore = progress?.average_quiz_score || 0
  const latestDocument = documents[0]

  const stats = [
    {
      label: 'Documents',
      value: progress?.total_documents || 0,
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Quizzes',
      value: progress?.total_quizzes || 0,
      icon: HelpCircle,
      color: 'violet',
    },
    {
      label: 'Flashcards',
      value: progress?.total_flashcards || 0,
      icon: Layers,
      color: 'cyan',
    },
    {
      label: 'Mastered',
      value: progress?.mastered_flashcards || 0,
      icon: Star,
      color: 'amber',
    },
    {
      label: 'Study Hours',
      value: progress?.total_study_hours || 0,
      icon: Clock,
      color: 'green',
    },
  ]

  const quickActions = [
    {
      to: `/summary?doc=${latestDocument?.id}`,
      icon: Sparkles,
      title: 'Generate Summary',
      description: 'Turn your material into clear notes',
      color: 'blue',
    },
    {
      to: `/quiz?doc=${latestDocument?.id}`,
      icon: HelpCircle,
      title: 'Take a Quiz',
      description: 'Test what you have learned',
      color: 'violet',
    },
    {
      to: `/flashcards?doc=${latestDocument?.id}`,
      icon: Layers,
      title: 'Study Flashcards',
      description: 'Practice with interactive cards',
      color: 'cyan',
    },
    {
      to: `/chat?doc=${latestDocument?.id}`,
      icon: MessageSquareText,
      title: 'Chat with Document',
      description: 'Ask questions about your material',
      color: 'green',
    },
  ]

  return (
    <div className="dashboard-page fade-in">
      <div className="dashboard-content">

        {/* Welcome header */}
        <header className="dashboard-header">
          <div>
            <div className="dashboard-eyebrow">
              <span className="dashboard-eyebrow-dot" />
              YOUR LEARNING WORKSPACE
            </div>

            <h1>
              Welcome back, {user?.name || 'Student'}
              <span className="dashboard-heading-icon">
                <BrainCircuit size={27} />
              </span>
            </h1>

            <p>Keep learning, stay consistent, and make progress every day.</p>
          </div>

          <Link to="/upload" className="dashboard-header-button">
            <UploadCloud size={18} />
            <span>Upload material</span>
            <ArrowUpRight size={16} />
          </Link>
        </header>

        {/* Upload banner */}
        <Link to="/upload" className="dashboard-upload-banner">
          <div className="dashboard-upload-decoration">
            <div className="dashboard-upload-icon">
              <Sparkles size={27} />
            </div>
          </div>

          <div className="dashboard-upload-copy">
            <span className="dashboard-banner-label">START LEARNING</span>
            <h2>Build your next study kit</h2>
            <p>
              Upload a PDF, DOCX, or TXT file and turn it into
              AI-powered study materials.
            </p>
          </div>

          <div className="dashboard-upload-action">
            <span>Upload a document</span>
            <ArrowUpRight size={19} />
          </div>
        </Link>

        {/* Performance overview */}
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-section-kicker">YOUR ACTIVITY</span>
              <h2>Performance overview</h2>
            </div>
          </div>

          <div className="dashboard-stats-grid">

            <div className="dashboard-score-card">
              <div className="dashboard-score-top">
                <div className="dashboard-score-icon">
                  <Target size={23} />
                </div>
                <span>OVERALL PERFORMANCE</span>
              </div>

              <div className="dashboard-score-value">
                {avgScore}<span>%</span>
              </div>

              <p>Average quiz score</p>

              <div className="dashboard-score-track">
                <div
                  className="dashboard-score-progress"
                  style={{
                    width: `${Math.min(100, Math.max(0, Number(avgScore) || 0))}%`,
                  }}
                />
              </div>
            </div>

            {stats.map((stat) => {
              const Icon = stat.icon

              return (
                <div
                  className={`dashboard-stat-card stat-${stat.color}`}
                  key={stat.label}
                >
                  <div className="dashboard-stat-top">
                    <div className="dashboard-stat-icon">
                      <Icon size={20} />
                    </div>
                    <span className="dashboard-stat-indicator" />
                  </div>

                  <div className="dashboard-stat-value">
                    {stat.value}
                  </div>

                  <div className="dashboard-stat-label">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Main dashboard columns */}
        <div className="dashboard-main-grid">

          {/* Recent documents */}
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-section-kicker">YOUR LIBRARY</span>
                <h2>Recent documents</h2>
              </div>

              <div className="dashboard-document-controls">
                {collections.length > 0 && (
                  <select
                    value={collectionFilter}
                    onChange={(event) =>
                      setSearchParams(
                        event.target.value
                          ? { collection: event.target.value }
                          : {}
                      )
                    }
                    className="dashboard-filter"
                    aria-label="Filter documents by collection"
                  >
                    <option value="">All collections</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                )}

                <Link to="/upload" className="dashboard-text-link">
                  Add new <span>+</span>
                </Link>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">
                  <BookOpen size={29} />
                </div>
                <h3>No documents yet</h3>
                <p>
                  Upload your first study material to start building
                  your personal learning library.
                </p>
                <Link to="/upload" className="dashboard-empty-button">
                  <UploadCloud size={17} />
                  Upload a document
                </Link>
              </div>
            ) : (
              <div className="dashboard-document-list">
                {documents.slice(0, 5).map((doc) => {
                  const name = collectionName(doc.collection_id)

                  return (
                    <Link
                      key={doc.id}
                      to={`/summary?doc=${doc.id}`}
                      className="dashboard-document-row"
                    >
                      <div className="dashboard-document-icon">
                        <FileText size={21} />
                      </div>

                      <div className="dashboard-document-info">
                        <h3>{doc.title}</h3>
                        <p>{doc.filename}</p>

                        {name && (
                          <span className="dashboard-collection-tag">
                            <FolderOpen size={12} />
                            {name}
                          </span>
                        )}
                      </div>

                      <span className="dashboard-document-date">
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString()
                          : ''}
                      </span>

                      <ChevronRight
                        className="dashboard-document-arrow"
                        size={17}
                      />
                    </Link>
                  )
                })}
              </div>
            )}

            {documents.length > 0 && (
              <div className="dashboard-panel-footer">
                <span>Showing up to 5 recent documents</span>
                <Link to="/collections">
                  View collections <ArrowUpRight size={14} />
                </Link>
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="dashboard-quick-panel">
            <div className="dashboard-panel-heading">
              <span className="dashboard-section-kicker">STUDY TOOLS</span>
              <h2>Quick actions</h2>
              <p>Jump straight into your next study activity.</p>
            </div>

            {documents.length === 0 ? (
              <div className="dashboard-quick-empty">
                <FolderOpen size={25} />
                <p>Upload a document to unlock your study tools.</p>
              </div>
            ) : (
              <div className="dashboard-quick-list">
                {quickActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <Link
                      key={action.title}
                      to={action.to}
                      className={`dashboard-quick-action quick-${action.color}`}
                    >
                      <div className="dashboard-quick-icon">
                        <Icon size={21} />
                      </div>

                      <div className="dashboard-quick-copy">
                        <h3>{action.title}</h3>
                        <p>{action.description}</p>
                      </div>

                      <ChevronRight size={17} />
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
