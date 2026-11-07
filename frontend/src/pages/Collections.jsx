import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  FolderOpen,
  Folder,
  FileText,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ArrowUpRight,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import './Collections.css'

export default function Collections() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const r = await api.get('/collections')
      setCollections(r.data.collections || [])
    } catch {
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const createCollection = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const r = await api.post('/collections', { name: name.trim() })
      setCollections((current) => [r.data, ...current])
      setName('')
      setShowForm(false)
      toast.success('Collection created!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create collection')
    }
  }

  const startRename = (collection) => {
    setEditingId(collection.id)
    setEditingName(collection.name)
  }

  const saveRename = async (id) => {
    if (!editingName.trim()) return

    try {
      const r = await api.put(`/collections/${id}`, {
        name: editingName.trim(),
      })

      setCollections((current) =>
        current.map((collection) =>
          collection.id === id ? r.data : collection
        )
      )

      setEditingId(null)
      setEditingName('')
      toast.success('Collection renamed')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to rename collection')
    }
  }

  const deleteCollection = async (id) => {
    if (
      !confirm(
        'Delete this collection? Documents inside it will stay, just uncategorized.'
      )
    ) {
      return
    }

    try {
      await api.delete(`/collections/${id}`)
      setCollections((current) =>
        current.filter((collection) => collection.id !== id)
      )
      toast.success('Collection deleted')
    } catch {
      toast.error('Failed to delete collection')
    }
  }

  if (loading) {
    return (
      <div className="collections-loading">
        <div className="spinner" />
        <p>Loading your collections...</p>
      </div>
    )
  }

  const totalDocuments = collections.reduce(
    (total, collection) => total + (Number(collection.document_count) || 0),
    0
  )

  return (
    <div className="collections-page fade-in">
      <header className="collections-header">
        <div className="collections-heading">
          <div className="collections-eyebrow">
            <Sparkles size={14} />
            YOUR STUDY WORKSPACE
          </div>

          <h1>Collections</h1>

          <p>
            Keep your study materials organized by course, subject, or topic.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className={`collections-create-btn ${showForm ? 'is-cancel' : ''}`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancel' : 'New Collection'}
        </button>
      </header>

      <section className="collections-overview">
        <div className="collections-overview-card">
          <div className="collections-overview-icon blue">
            <FolderOpen size={21} />
          </div>
          <div>
            <span>Total collections</span>
            <strong>{collections.length}</strong>
          </div>
        </div>

        <div className="collections-overview-card">
          <div className="collections-overview-icon violet">
            <FileText size={21} />
          </div>
          <div>
            <span>Organized documents</span>
            <strong>{totalDocuments}</strong>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="collections-form-card fade-in">
          <div className="collections-form-heading">
            <div className="collections-form-icon">
              <Folder size={20} />
            </div>
            <div>
              <h2>Create a collection</h2>
              <p>Give your study materials a place to belong.</p>
            </div>
          </div>

          <form onSubmit={createCollection} className="collections-form">
            <input
              type="text"
              value={name}
              placeholder="e.g. Biology 201, Web Development..."
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="collections-input"
              autoFocus
              required
            />

            <button
              type="submit"
              className="collections-submit-btn"
              disabled={!name.trim()}
            >
              <Plus size={17} />
              Create collection
            </button>
          </form>
        </section>
      )}

      {collections.length === 0 ? (
        <section className="collections-empty">
          <div className="collections-empty-art">
            <div className="collections-empty-circle circle-one" />
            <div className="collections-empty-circle circle-two" />
            <div className="collections-empty-icon">
              <FolderOpen size={42} />
            </div>
          </div>

          <h2>Your workspace starts here</h2>
          <p>
            You haven't created any collections yet. Create your first one to
            organize documents by course, subject, or topic.
          </p>

          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="collections-submit-btn"
            >
              <Plus size={18} />
              Create your first collection
            </button>
          )}
        </section>
      ) : (
        <section className="collections-content">
          <div className="collections-section-heading">
            <div>
              <h2>Your collections</h2>
              <p>
                {collections.length} collection
                {collections.length === 1 ? '' : 's'} in your workspace
              </p>
            </div>

            <span className="collections-count">
              {collections.length} TOTAL
            </span>
          </div>

          <div className="collections-grid">
            {collections.map((collection, index) => {
              const isEditing = editingId === collection.id
              const documentCount = Number(collection.document_count) || 0

              return (
                <article
                  key={collection.id}
                  className="collection-card"
                  style={{ '--card-index': index }}
                >
                  <div className="collection-card-top">
                    <div className="collection-folder-icon">
                      <FolderOpen size={25} />
                    </div>

                    {!isEditing && (
                      <div className="collection-card-actions">
                        <button
                          type="button"
                          onClick={() => startRename(collection)}
                          className="collection-icon-btn"
                          title="Rename collection"
                          aria-label={`Rename ${collection.name}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteCollection(collection.id)}
                          className="collection-icon-btn delete"
                          title="Delete collection"
                          aria-label={`Delete ${collection.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="collection-edit-form">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(collection.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="collections-input"
                        autoFocus
                        maxLength={100}
                      />

                      <div className="collection-edit-actions">
                        <button
                          type="button"
                          onClick={() => saveRename(collection.id)}
                          className="collection-save-btn"
                          disabled={!editingName.trim()}
                          title="Save name"
                        >
                          <Check size={17} />
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditingName('')
                          }}
                          className="collection-cancel-btn"
                          title="Cancel editing"
                        >
                          <X size={17} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Link
                        to={`/dashboard?collection=${collection.id}`}
                        className="collection-card-link"
                      >
                        <h3>{collection.name}</h3>
                        <span className="collection-document-count">
                          <FileText size={14} />
                          {documentCount} document
                          {documentCount === 1 ? '' : 's'}
                        </span>

                        <span className="collection-open-link">
                          Open collection
                          <ArrowUpRight size={16} />
                        </span>
                      </Link>
                    </>
                  )}

                  <div className="collection-card-footer">
                    <div className="collection-footer-mark">
                      <BookOpen size={14} />
                      <span>STUDY SPACE</span>
                    </div>
                    <span className="collection-card-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}