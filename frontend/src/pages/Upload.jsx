
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  UploadCloud,
  FileText,
  FileType,
  File,
  X,
  FolderOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Lightbulb,
} from 'lucide-react'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [collections, setCollections] = useState([])
  const [collectionId, setCollectionId] = useState('')

  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/collections')
      .then((r) => setCollections(r.data.collections || []))
      .catch(() => {})
  }, [])

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile || uploading) return

    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase()

    if (!['.pdf', '.docx', '.txt'].includes(ext)) {
      toast.error('Only PDF, DOCX, and TXT files are supported')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 10 MB')
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)

    if (collectionId) {
      fd.append('collection_id', collectionId)
    }

    try {
      const res = await api.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.flashcards_generated === true) {
        toast.success('Document uploaded and 10 flashcards generated!')
      } else {
        toast.error(
          res.data.flashcards_error ||
          'Document uploaded, but flashcards could not be generated. You can retry from Flashcards.'
        )
      }
      navigate(`/summary?doc=${res.data.id}`)
    } catch (e) {
      toast.error(
        e.response?.data?.detail || 'Upload failed. Please try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (event) => {
    event?.stopPropagation()
    setFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileDetails = (name) => {
    const ext = name?.split('.').pop().toLowerCase()

    if (ext === 'pdf') {
      return { label: 'PDF document', icon: FileText, color: 'red' }
    }

    if (ext === 'docx') {
      return { label: 'Word document', icon: FileType, color: 'blue' }
    }

    return { label: 'Text document', icon: File, color: 'cyan' }
  }

  const fileSize = file
    ? file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / 1024 / 1024).toFixed(2)} MB`
    : ''

  const fileDetails = file ? getFileDetails(file.name) : null
  const FileIcon = fileDetails?.icon

  const tips = [
    'Use well-formatted documents with clear headings.',
    'PDF files with selectable text work best.',
    'For best AI summaries, keep documents under 50 pages.',
    'Supported formats: PDF, DOCX, and TXT.',
  ]

  return (
    <div className="upload-page fade-in">
      <div className="upload-content">
        <header className="upload-header">
          <div className="upload-eyebrow">
            <Sparkles size={15} />
            <span>AI-POWERED STUDY WORKSPACE</span>
          </div>

          <h1>Upload your study material</h1>

          <p>
            Turn your documents into summaries, flashcards, and quizzes
            with the help of AI.
          </p>
        </header>

        <section className="upload-panel">
          <div className="upload-panel-heading">
            <div>
              <h2>Choose a document</h2>
              <p>Upload a file from your device to get started.</p>
            </div>

            <div className="upload-security">
              <ShieldCheck size={16} />
              <span>Secure upload</span>
            </div>
          </div>

          <div
            className={`upload-dropzone${dragOver ? ' is-dragging' : ''}${file ? ' has-selected-file' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Choose a study document"
            aria-disabled={uploading}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (
                !uploading &&
                (event.key === 'Enter' || event.key === ' ')
              ) {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              handleFileSelect(event.dataTransfer.files[0])
            }}
            onDragOver={(event) => {
              event.preventDefault()
              if (!uploading) setDragOver(true)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setDragOver(false)
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              hidden
              disabled={uploading}
              onChange={(event) => {
                handleFileSelect(event.target.files[0])
                event.target.value = ''
              }}
            />

            {file ? (
              <div className="upload-selected-file">
                <div className={`upload-file-icon ${fileDetails.color}`}>
                  <FileIcon size={30} />
                </div>

                <div className="upload-file-info">
                  <span className="upload-file-status">
                    <CheckCircle2 size={14} />
                    File ready to upload
                  </span>

                  <h3 title={file.name}>{file.name}</h3>

                  <p>
                    {fileDetails.label} <span>·</span> {fileSize}
                  </p>
                </div>

                <button
                  type="button"
                  className="upload-remove-file"
                  onClick={removeFile}
                  disabled={uploading}
                  aria-label="Remove selected file"
                  title="Remove file"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="upload-dropzone-content">
                <div className="upload-cloud-icon">
                  <UploadCloud size={34} />
                </div>

                <h3>
                  Drag and drop your file here
                </h3>

                <p>
                  or <span>browse files</span> from your device
                </p>

                <div className="upload-format-list">
                  <span><FileText size={15} /> PDF</span>
                  <span><FileType size={15} /> DOCX</span>
                  <span><File size={15} /> TXT</span>
                </div>
              </div>
            )}
          </div>

          <div className="upload-file-limit">
            <span>Maximum file size: 10 MB</span>
            <span>Supported formats: PDF, DOCX, TXT</span>
          </div>

          {collections.length > 0 && (
            <div className="upload-collection-section">
              <label htmlFor="upload-collection">
                <span className="upload-collection-label">
                  <FolderOpen size={17} />
                  Save to collection
                </span>
                <span className="upload-optional">OPTIONAL</span>
              </label>

              <select
                id="upload-collection"
                value={collectionId}
                onChange={(event) => setCollectionId(event.target.value)}
                className="upload-collection-select"
                disabled={uploading}
              >
                <option value="">No collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>

              <p>
                Organize your uploaded material by assigning it to a collection.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="upload-submit-button"
          >
            {uploading ? (
              <>
                <span className="upload-button-spinner" />
                Uploading your document...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Upload and process
                <ArrowRight size={17} />
              </>
            )}
          </button>

          <p className="upload-submit-note">
            Your document will be processed and opened in the summary workspace.
          </p>
        </section>

        <section className="upload-tips-panel">
          <div className="upload-tips-icon">
            <Lightbulb size={21} />
          </div>

          <div className="upload-tips-content">
            <h3>Tips for better AI results</h3>

            <ul>
              {tips.map((tip, index) => (
                <li key={index}>
                  <CheckCircle2 size={15} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="upload-bottom-note">
          <BookOpen size={16} />
          <span>One document. Multiple ways to study smarter.</span>
        </div>
      </div>
    </div>
  )
}
