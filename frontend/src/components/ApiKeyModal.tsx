import { useState, useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentKey: string
  onSaveKey: (key: string) => void
}

export function ApiKeyModal({ isOpen, onClose, currentKey, onSaveKey }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    setApiKey(currentKey || '')
    setError(null)
    setSuccessMsg(null)
  }, [currentKey, isOpen])

  if (!isOpen) return null

  async function handleValidateAndSave() {
    const trimmedKey = apiKey.trim()
    if (!trimmedKey) {
      setError('Please enter a valid Groq API key.')
      return
    }

    setIsValidating(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: trimmedKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Invalid Groq API key. Please check your key at console.groq.com.')
        return
      }

      setSuccessMsg('✓ Groq API Key validated and saved successfully!')
      onSaveKey(trimmedKey)
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch {
      setError('Network error — unable to validate API key with backend service.')
    } finally {
      setIsValidating(false)
    }
  }

  function handleClearKey() {
    setApiKey('')
    onSaveKey('')
    setSuccessMsg('Key cleared. App will fallback to default server key if configured.')
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="section-card-header">
          <h3 className="section-title">🔑 Groq API Key Setup</h3>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="editor-subtitle style-top-gap-xs">
          ApplyForge uses your Groq API key to power all AI generation tools. Your key is stored <strong>only in your browser's local storage</strong> and is never saved on server disks.
        </p>

        <div className="api-key-helper-box style-top-gap-sm">
          <span className="helper-icon">💡</span>
          <div className="helper-text">
            <span>Don't have a key yet? Get a free API key in 10 seconds:</span>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-link"
            >
              🔗 Get Free Groq Key (console.groq.com)
            </a>
          </div>
        </div>

        <div className="form-group style-top-gap">
          <label className="form-label" htmlFor="groq-key-input">
            Your Groq API Key (starts with gsk_...)
          </label>
          <div className="key-input-wrap">
            <input
              id="groq-key-input"
              type={showKey ? 'text' : 'password'}
              className="form-input code-font"
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              type="button"
              className="eye-toggle-btn"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? '👁️' : '🔒'}
            </button>
          </div>
        </div>

        {error && (
          <div className="feedback-box feedback-box--error style-top-gap-sm">
            <p className="feedback-error-msg">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="feedback-box feedback-box--success style-top-gap-sm">
            <p className="feedback-label">{successMsg}</p>
          </div>
        )}

        <div className="modal-actions style-top-gap">
          {currentKey && (
            <button
              type="button"
              className="btn btn--ghost btn--small text-danger"
              onClick={handleClearKey}
            >
              🗑️ Clear Key
            </button>
          )}

          <div className="btn-group margin-left-auto">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={isValidating || !apiKey.trim()}
              onClick={handleValidateAndSave}
            >
              {isValidating ? '⏳ Validating...' : '✨ Validate & Save Key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
