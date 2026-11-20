import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
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
  MessageSquareText,
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Chat() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const docId = searchParams.get('doc')
  const isGeneralChat = !docId

  const [document, setDocument] = useState(null)
  const [documents, setDocuments] = useState([])
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [fetching, setFetching] = useState(true)

  const endRef = useRef(null)

  useEffect(() => {
    let active = true

    const initialize = async () => {
      setFetching(true)
      setDocument(null)
      setMessages([])

      try {
        const response = await api.get('/documents')
        if (active) {
          setDocuments(response.data.documents || [])
        }
      } catch {
        if (active) {
          toast.error('Failed to load your documents')
        }
      }

      if (!docId) {
        if (active) setFetching(false)
        return
      }

      try {
        const response = await api.get(`/documents/${docId}`)
        if (active) setDocument(response.data)
      } catch {
        if (active) toast.error('Failed to load document')
      }

      try {
        const response = await api.get(`/chat/${docId}`)
        if (active) {
          const formattedMessages = []

          ;(response.data.chats || []).forEach((chat) => {
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
        }
      } catch {
        // Chat history is optional.
      }

      if (active) setFetching(false)
    }

    initialize()

    return () => {
      active = false
    }
  }, [docId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const send = async (e) => {
    e.preventDefault()

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || sending) return

    const currentQuestion = trimmedQuestion
    const previousMessages = messages

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
      let answer

      if (isGeneralChat) {
        const response = await api.post('/chat/general', {
          question: currentQuestion,
          conversation_history: previousMessages.slice(-12).map(
            ({ role, content }) => ({ role, content })
          ),
        })

        answer = response.data.answer
      } else {
        const response = await api.post('/chat', {
          document_id: parseInt(docId, 10),
          question: currentQuestion,
        })

        answer = response.data.answer
      }

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: answer,
          id: `resp-${Date.now()}`,
        },
      ])
    } catch (error) {
      const message =
        error.response?.data?.detail || 'Failed to get an answer. Please try again.'

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

  const suggestedQuestions = isGeneralChat
    ? [
        'What is StudyCraft and what can I do with it?',
        'How do I generate flashcards, summaries, and quizzes?',
        'How can I chat with my uploaded study materials?',
      ]
    : [
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
                  <h1>{isGeneralChat ? 'Chat with StudyCraft AI' : 'AI Study Assistant'}</h1>
                  <p>
                    {isGeneralChat
                      ? 'Ask about StudyCraft or get help using your study materials.'
                      : 'Ask questions and understand your study materials.'}
                  </p>
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
              {isGeneralChat ? (
                <MessageSquareText size={19} />
              ) : (
                <FileText size={19} />
              )}
            </div>

            <div className="chat-document-info">
              <span>{isGeneralChat ? 'PLATFORM ASSISTANT' : 'CURRENTLY STUDYING'}</span>
              <strong title={document?.title || 'StudyCraft AI'}>
                {isGeneralChat ? 'StudyCraft AI' : document?.title || 'Document unavailable'}
              </strong>
            </div>

            {isGeneralChat ? (
              <select
                className="chat-document-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) navigate(`/chat?doc=${e.target.value}`)
                }}
                aria-label="Choose a document to chat about"
              >
                <option value="">Chat with a document...</option>
                {documents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="chat-mode-links">
                <Link to="/chat" className="chat-summary-link">
                  <MessageCircle size={16} />
                  <span>StudyCraft Help</span>
                </Link>
                <Link to={`/summary?doc=${docId}`} className="chat-summary-link">
                  <BookOpen size={16} />
                  <span>View Summary</span>
                </Link>
              </div>
            )}
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

                <span className="chat-eyebrow">
                  {isGeneralChat ? 'YOUR STUDYCRAFT GUIDE' : 'YOUR PERSONAL STUDY ASSISTANT'}
                </span>
                <h2>
                  {isGeneralChat
                    ? 'How can I help you today?'
                    : 'What would you like to learn?'}
                </h2>
                <p>
                  {isGeneralChat
                    ? 'Ask about StudyCraft features, how to use the platform, or choose a document to discuss its contents.'
                    : 'Ask me anything about your document. I can explain difficult concepts, identify key ideas, and help you review.'}
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
                    {msg.role === 'user' ? 'You' : 'StudyCraft AI'}
                  </span>
                  <div
                    className={
                      msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
                    }
                  >
                    {msg.role === 'assistant' ? (
                      <div className="chat-markdown">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="chat-table-wrapper">
                                <table {...props} />
                              </div>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
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
                  <span className="chat-message-author">StudyCraft AI</span>
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
                placeholder={
                  isGeneralChat
                    ? 'Ask anything about StudyCraft...'
                    : 'Ask anything about your document...'
                }
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
