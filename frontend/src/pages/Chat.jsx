import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  BookOpen,
  FileText,
  GraduationCap,
  MessageCircle,
  Send,
  Sparkles,
  User,
  LoaderCircle,
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Chat() {
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('doc')

  const [document, setDocument] = useState(null)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [fetching, setFetching] = useState(true)

  const endRef = useRef(null)

  useEffect(() => {
    if (!docId) {
      setDocument(null)
      setMessages([])
      setFetching(false)
      return
    }

    setFetching(true)
    setDocument(null)
    setMessages([])

    fetchDocument()
    loadHistory()
  }, [docId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

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

  const loadHistory = async () => {
    try {
      const r = await api.get(`/chat/${docId}`)
      const formattedMessages = []

      ;(r.data.chats || []).forEach((chat) => {
        formattedMessages.push({
          role: 'user',
          content: chat.question,
          id: `q-${chat.id}`,
        })

        formattedMessages.push({
          role: 'assistant',
          content: chat.answer,
          id: `a-${chat.id}`,
        })
      })

      setMessages(formattedMessages)
    } catch {
      // Chat history is optional. A new conversation can still begin.
    }
  }

  const send = async (e) => {
    e.preventDefault()

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || sending || !docId) return

    const currentQuestion = trimmedQuestion

    setMessages((previous) => [
      ...previous,
      {
        role: 'user',
        content: currentQuestion,
        id: `user-${Date.now()}`,
      },
    ])

    setQuestion('')
    setSending(true)

    try {
      const r = await api.post('/chat', {
        document_id: parseInt(docId),
        question: currentQuestion,
      })

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: r.data.answer,
          id: `resp-${r.data.id}`,
        },
      ])
    } catch (e) {
      const message =
        e.response?.data?.detail || 'Failed to get an answer. Please try again.'

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: `⚠️ ${message}`,
          id: `err-${Date.now()}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const suggestedQuestions = [
    'What are the main ideas in this document?',
    'Explain the most important concepts.',
    'Give me a short review of this topic.',
  ]

  if (fetching) {
    return (
      <div className="chat-loading">
        <LoaderCircle size={30} className="chat-loading-icon" />
        <p>Preparing your study assistant...</p>
      </div>
    )
  }

  if (!docId || !document) {
    return (
      <div className="chat-page">
        <div className="chat-empty-state">
          <div className="chat-empty-icon">
            <MessageCircle size={34} />
          </div>
          <h2>No Document Selected</h2>
          <p>Select a document first to start a conversation with your AI study assistant.</p>
          <Link to="/dashboard" className="chat-primary-link">
            <ArrowLeft size={17} />
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <div className="chat-content">
        <header className="chat-header">
          <div className="chat-breadcrumb">
            <Link to="/dashboard">
              <ArrowLeft size={16} />
              Dashboard
            </Link>
            <span>/</span>
            <span>AI Assistant</span>
          </div>

          <div className="chat-heading">
            <div>
              <div className="chat-title-row">
                <div className="chat-title-icon">
                  <Sparkles size={23} />
                </div>
                <div>
                  <h1>AI Study Assistant</h1>
                  <p>Ask questions and understand your study materials.</p>
                </div>
              </div>
            </div>

            <div className="chat-online-status">
              <span className="chat-status-dot" />
              Ready to help
            </div>
          </div>
        </header>

        <section className="chat-workspace">
          <div className="chat-document-bar">
            <div className="chat-document-icon">
              <FileText size={19} />
            </div>

            <div className="chat-document-info">
              <span>Currently studying</span>
              <strong title={document.title}>{document.title}</strong>
            </div>

            <Link
              to={`/summary?doc=${docId}`}
              className="chat-summary-link"
            >
              <BookOpen size={16} />
              <span>View Summary</span>
            </Link>
          </div>

          <div className="chat-conversation">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <div className="chat-welcome-icon">
                  <Bot size={35} />
                  <span className="chat-welcome-sparkle">
                    <Sparkles size={15} />
                  </span>
                </div>

                <span className="chat-eyebrow">YOUR PERSONAL STUDY ASSISTANT</span>
                <h2>What would you like to learn?</h2>
                <p>
                  Ask me anything about your document. I can explain difficult
                  concepts, identify key ideas, and help you review.
                </p>

                <div className="chat-suggestions">
                  {suggestedQuestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="chat-suggestion"
                      onClick={() => setQuestion(suggestion)}
                      disabled={sending}
                    >
                      <Sparkles size={15} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message-row ${
                  msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="chat-avatar chat-avatar-ai">
                    <Bot size={18} />
                  </div>
                )}

                <div className="chat-message-body">
                  <span className="chat-message-author">
                    {msg.role === 'user' ? 'You' : 'Study Assistant'}
                  </span>
                  <div
                    className={
                      msg.role === 'user'
                        ? 'chat-bubble-user'
                        : 'chat-bubble-ai'
                    }
                  >
                    <p>{msg.content}</p>
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="chat-avatar chat-avatar-user">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="chat-message-row chat-message-assistant">
                <div className="chat-avatar chat-avatar-ai">
                  <Bot size={18} />
                </div>

                <div className="chat-message-body">
                  <span className="chat-message-author">Study Assistant</span>
                  <div className="chat-bubble-ai chat-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          <div className="chat-composer-area">
            <form className="chat-composer" onSubmit={send}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything about your document..."
                disabled={sending}
                aria-label="Your question"
              />

              <button
                type="submit"
                disabled={!question.trim() || sending}
                aria-label="Send message"
              >
                {sending ? (
                  <LoaderCircle size={19} className="chat-send-loading" />
                ) : (
                  <Send size={19} />
                )}
                <span>Send</span>
              </button>
            </form>

            <p className="chat-composer-note">
              <GraduationCap size={14} />
              AI-generated answers may need verification. Keep learning and think critically.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
