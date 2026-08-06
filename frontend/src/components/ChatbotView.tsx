import { useState, useRef, useEffect } from 'react'
import type { StructuredProfile } from './ProfileEditor'

export interface ChatMessageItem {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  profile: StructuredProfile
  jobDescription: string
}

type DetailLevel = 'concise' | 'standard' | 'detailed'
type ToneMode = 'professional' | 'conversational' | 'enthusiastic_persuasive' | 'bold_impact' | 'star_storyteller'

const DETAIL_OPTIONS: { id: DetailLevel; label: string; icon: string; desc: string }[] = [
  { id: 'concise', label: 'Concise', icon: '⚡', desc: 'Very short (1-3 sentences / tight form boxes)' },
  { id: 'standard', label: 'Standard', icon: '⚖️', desc: 'Balanced single paragraph (~100-130 words)' },
  { id: 'detailed', label: 'Detailed', icon: '📜', desc: 'Structured 2 short paragraphs with CV highlight' },
]

const TONE_OPTIONS: { id: ToneMode; label: string; icon: string }[] = [
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'conversational', label: 'Conversational', icon: '💬' },
  { id: 'enthusiastic_persuasive', label: 'Enthusiastic & Persuasive', icon: '🔥' },
  { id: 'bold_impact', label: 'Bold & Impact', icon: '🎯' },
  { id: 'star_storyteller', label: 'STAR Storyteller', icon: '🌟' },
]

const SUGGESTIONS = [
  'Why are you a good fit for this role?',
  'Describe a time you solved a hard technical challenge.',
  'How does your experience align with our top requirements?',
  'What are your key strengths for this position?',
]

export function ChatbotView({ profile, jobDescription }: Props) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [input, setInput] = useState('')
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('standard')
  const [toneMode, setToneMode] = useState<ToneMode>('professional')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSend(textToSend?: string) {
    const userQuery = (textToSend || input).trim()
    if (!userQuery || isLoading) return

    setError(null)
    const updatedMessages: ChatMessageItem[] = [
      ...messages,
      { role: 'user', content: userQuery },
    ]

    setMessages(updatedMessages)
    if (!textToSend) setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/generate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          job_description: jobDescription.trim(),
          messages: updatedMessages,
          detail_level: detailLevel,
          tone_mode: toneMode,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Failed to generate response. Please try again.')
        return
      }

      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: data.reply || 'No reply received.' },
      ])
    } catch {
      setError('Network error — failed to reach AI chatbot backend service.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(idx)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // ignore copy failure
    }
  }

  function handleClearChat() {
    setMessages([])
    setError(null)
  }

  return (
    <div className="chatbot-view editor-card">
      {/* Header */}
      <div className="section-card-header">
        <div>
          <h4 className="editor-title font-size-md">💬 Application Form Q&A Copilot</h4>
          <p className="editor-subtitle">
            Paste any question from the job application form to receive tailored, high-converting responses grounded in your CV & the JD.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--small text-muted"
            onClick={handleClearChat}
          >
            🗑️ Clear Chat History
          </button>
        )}
      </div>

      {/* Control Selectors Bar */}
      <div className="chatbot-controls-bar style-top-gap-sm">
        {/* Selector 1: Detail Level */}
        <div className="control-group">
          <label className="control-label">
            <span className="control-label__icon">📏</span> Detail Level:
          </label>
          <div className="control-pills">
            {DETAIL_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`control-pill ${detailLevel === opt.id ? 'control-pill--active' : ''}`}
                onClick={() => setDetailLevel(opt.id)}
                title={opt.desc}
              >
                <span>{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector 2: Tone / Mode */}
        <div className="control-group style-top-gap-xs">
          <label className="control-label">
            <span className="control-label__icon">🎨</span> Response Mode / Tone:
          </label>
          <div className="control-pills">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`control-pill ${toneMode === opt.id ? 'control-pill--active' : ''}`}
                onClick={() => setToneMode(opt.id)}
              >
                <span>{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State / Suggestions */}
      {messages.length === 0 && (
        <div className="chatbot-welcome-card style-top-gap">
          <div className="welcome-icon">🤖</div>
          <h5 className="welcome-title">Ready to assist with your job application</h5>
          <p className="welcome-desc">
            Select your preferred <strong>Detail Level</strong> and <strong>Tone Mode</strong> above, then paste a question below or pick a common prompt:
          </p>
          <div className="suggestion-chips">
            {SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                type="button"
                className="suggestion-chip"
                onClick={() => handleSend(sug)}
              >
                💡 {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Feed */}
      {messages.length > 0 && (
        <div className="chat-feed style-top-gap">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message-row ${msg.role === 'user' ? 'chat-message-row--user' : 'chat-message-row--assistant'}`}
            >
              <div className="chat-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="chat-bubble-wrap">
                <div className="chat-bubble">
                  <div className="chat-bubble__content">{msg.content}</div>
                </div>
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--small copy-msg-btn"
                    onClick={() => handleCopy(msg.content, idx)}
                  >
                    {copiedIndex === idx ? '✓ Copied Answer' : '📋 Copy Answer'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message-row chat-message-row--assistant">
              <div className="chat-avatar">🤖</div>
              <div className="chat-bubble-wrap">
                <div className="chat-bubble chat-bubble--loading">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="typing-label">Analyzing CV & JD for optimal answer...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      {error && (
        <div className="feedback-box feedback-box--error style-top-gap-sm">
          <p className="feedback-error-msg">{error}</p>
        </div>
      )}

      {/* Input Form */}
      <div className="chat-input-bar style-top-gap-sm">
        <textarea
          className="chat-textarea"
          rows={2}
          placeholder="Paste form question or ask chatbot (e.g., 'How do I answer: What makes you unique?')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <button
          type="button"
          className="btn btn--primary send-chat-btn"
          disabled={isLoading || !input.trim()}
          onClick={() => handleSend()}
        >
          {isLoading ? '⏳ Thinking...' : '💬 Send'}
        </button>
      </div>
    </div>
  )
}
