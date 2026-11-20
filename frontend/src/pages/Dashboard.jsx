
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
  CheckSquare,
  Square,
  X,
  CircleCheck,
  CircleAlert,
  LoaderCircle,
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [documents, setDocuments] = useState([])
  const [collections, setCollections] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  const [selectedDocumentIds, setSelectedDocumentIds] = useState([])
  const [batchAction, setBatchAction] = useState('')
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 })
  const [batchResults, setBatchResults] = useState([])
  const [batchError, setBatchError] = useState('')

  const MAX_BATCH_FILES = 5
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
      setSelectedDocumentIds([])
      setBatchResults([])
      setBatchError('')
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

  const visibleDocuments = documents.slice(0, 5)
  const selectedDocuments = visibleDocuments.filter((doc) =>
    selectedDocumentIds.includes(doc.id)
  )
  const batchCanRun =
    selectedDocuments.length > 0 &&
    selectedDocuments.length <= MAX_BATCH_FILES &&
    !batchAction

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Size unavailable'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const toggleDocumentSelection = (documentId) => {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : current.length < MAX_BATCH_FILES
          ? [...current, documentId]
          : current
    )
    setBatchError('')
  }

  const selectAllVisibleDocuments = () => {
    setSelectedDocumentIds(visibleDocuments.slice(0, MAX_BATCH_FILES).map((doc) => doc.id))
    setBatchError('')
  }

  const clearBatchSelection = () => {
    setSelectedDocumentIds([])
    setBatchResults([])
    setBatchError('')
  }

  const generateForSelectedDocuments = async (action) => {
    if (batchAction || selectedDocuments.length === 0) return

    if (selectedDocuments.length > MAX_BATCH_FILES) {
      setBatchError(`Select no more than ${MAX_BATCH_FILES} documents.`)
      return
    }


    const endpointByAction = {
      flashcards: '/flashcards',
      summary: '/summary',
      quiz: '/quiz',
    }

    const endpoint = endpointByAction[action]
    if (!endpoint) return

    const resultPath = {
      flashcards: '/flashcards',
      summary: '/summary',
      quiz: '/quiz',
    }[action]

    setBatchAction(action)
    setBatchError('')
    setBatchResults([])
    setBatchProgress({ completed: 0, total: selectedDocuments.length })

    const results = []

    for (const doc of selectedDocuments) {
      try {
        const payload = { document_id: Number(doc.id) }

        if (action === 'flashcards') {
          payload.regenerate = false
        }

        await api.post(endpoint, payload)

        results.push({
          id: doc.id,
          title: doc.title,
          status: 'success',
          message: `Generation ${action} completed.`,
          path: `${resultPath}?doc=${doc.id}`,
        })
      } catch (error) {
        const detail =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Generation failed.'

        results.push({
          id: doc.id,
          title: doc.title,
          status: 'error',
          message: String(detail),
          path: null,
        })
      }

      setBatchResults([...results])
      setBatchProgress({
        completed: results.length,
        total: selectedDocuments.length,
      })
    }

    setBatchAction('')
  }

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
              <>
                <div className="dashboard-batch-toolbar">
                  <div className="dashboard-batch-selection">
                    <div>
                      <strong>{selectedDocuments.length} of {MAX_BATCH_FILES} selected</strong>
                    </div>
                    <div className="dashboard-batch-selection-actions">
                      <button
                        type="button"
                        onClick={selectAllVisibleDocuments}
                        disabled={!!batchAction || visibleDocuments.length === 0}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={clearBatchSelection}
                        disabled={!!batchAction || selectedDocumentIds.length === 0}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-batch-actions">
                    <button
                      type="button"
                      onClick={() => generateForSelectedDocuments('flashcards')}
                      disabled={!batchCanRun}
                    >
                      <Layers size={15} />
                      Flashcards
                    </button>
                    <button
                      type="button"
                      onClick={() => generateForSelectedDocuments('summary')}
                      disabled={!batchCanRun}
                    >
                      <Sparkles size={15} />
                      Summary
                    </button>
                    <button
                      type="button"
                      onClick={() => generateForSelectedDocuments('quiz')}
                      disabled={!batchCanRun}
                    >
                      <HelpCircle size={15} />
                      Quiz
                    </button>
                  </div>

                  <p className="dashboard-batch-hint">Select up to 5 documents to generate at once.</p>

                  {batchError && (
                    <p className="dashboard-batch-warning">{batchError}</p>
                  )}
                </div>

                <div className="dashboard-document-list">
                  {visibleDocuments.map((doc) => {
                    const name = collectionName(doc.collection_id)
                    const isSelected = selectedDocumentIds.includes(doc.id)

                    return (
                      <div
                        key={doc.id}
                        className={`dashboard-document-entry ${isSelected ? 'is-selected' : ''}`}
                      >
                        <label className="dashboard-document-select">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!!batchAction || (!isSelected && selectedDocumentIds.length >= MAX_BATCH_FILES)}
                            onChange={() => toggleDocumentSelection(doc.id)}
                            aria-label={`Select ${doc.title}`}
                          />
                          <span className="dashboard-document-checkbox">
                            {isSelected ? <CheckSquare size={19} /> : <Square size={19} />}
                          </span>
                        </label>

                        <Link
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
                            <span className="dashboard-document-size">
                              {formatFileSize(Number(doc.file_size_bytes))}
                            </span>
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
                      </div>
                    )
                  })}
                </div>

                {batchAction && (
                  <div className="dashboard-batch-progress" role="status">
                    <LoaderCircle size={17} className="dashboard-batch-spinner" />
                    <span>
                      Generating {batchAction} ? {batchProgress.completed} of {batchProgress.total} completed
                    </span>
                  </div>
                )}

                {batchResults.length > 0 && (
                  <div className="dashboard-batch-results" aria-live="polite">
                    <div className="dashboard-batch-results-heading">
                      <strong>Generation results</strong>
                      <span>
                        {batchResults.filter((item) => item.status === 'success').length} successful, {' '}
                        {batchResults.filter((item) => item.status === 'error').length} failed
                      </span>
                    </div>

                    {batchResults.map((result) => (
                      <div className="dashboard-batch-result" key={result.id}>
                        {result.status === 'success'
                          ? <CircleCheck size={17} className="dashboard-batch-success-icon" />
                          : <CircleAlert size={17} className="dashboard-batch-error-icon" />}
                        <div>
                          <strong>{result.title}</strong>
                          <span>{result.message}</span>
                        </div>
                        {result.path && (
                          <Link to={result.path}>Open</Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
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

          {/* StudyCraft AI chat */}
          <section className="dashboard-quick-panel">
            <div className="dashboard-panel-heading">
              <span className="dashboard-section-kicker">STUDY ASSISTANT</span>
              <h2>Chat with StudyCraft AI</h2>
              <p>Ask questions about your files or learn how to use StudyCraft.</p>
            </div>

            <div className="dashboard-quick-list">
              <Link to="/chat" className="dashboard-quick-action quick-green">
                <div className="dashboard-quick-icon">
                  <MessageSquareText size={21} />
                </div>

                <div className="dashboard-quick-copy">
                  <h3>Start a conversation</h3>
                  <p>Chat about your documents or StudyCraft features.</p>
                </div>

                <ChevronRight size={17} />
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
