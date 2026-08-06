import { useState, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import './App.css'
import { ProfileEditor } from './components/ProfileEditor'
import type { StructuredProfile } from './components/ProfileEditor'
import { MatchScoreView } from './components/MatchScoreView'

type UploadStatus = 'idle' | 'uploading' | 'error'
type ParseStatus = 'idle' | 'parsing' | 'error'
type InputMode = 'pdf' | 'text'

const STEPS = ['Provide CV', 'Review Profile', 'Paste JD', 'Generate']

function App() {
  // Input Mode state ('pdf' upload or 'text' / latex input)
  const [inputMode, setInputMode] = useState<InputMode>('pdf')
  const [pastedContent, setPastedContent] = useState<string>('')

  // Step 0 State: Uploading PDF
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadError, setUploadError] = useState<string>('')
  const [rawText, setRawText] = useState<string>('')
  const [filename, setFilename] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 1 State: Profile Parsing & Editing
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle')
  const [parseError, setParseError] = useState<string>('')
  const [parsedProfile, setParsedProfile] = useState<StructuredProfile | null>(null)

  // Step 2+ State: Confirmed Profile
  const [confirmedProfile, setConfirmedProfile] = useState<StructuredProfile | null>(null)
  const [isProfileConfirmed, setIsProfileConfirmed] = useState(false)

  // PDF Upload handler
  async function handleUpload(file: File) {
    setUploadStatus('uploading')
    setUploadError('')
    setRawText('')
    setParsedProfile(null)
    setIsProfileConfirmed(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload-cv', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setUploadStatus('error')
        setUploadError(data.detail ?? 'Upload failed.')
        return
      }
      setUploadStatus('idle')
      setRawText(data.raw_text)
      setFilename(data.filename)
      // Auto-trigger parsing after text extraction
      triggerParseProfile(data.raw_text)
    } catch {
      setUploadStatus('error')
      setUploadError('Network error — is the backend running?')
    }
  }

  // Handle direct text / LaTeX submit
  function handleTextSubmit() {
    const trimmed = pastedContent.trim()
    if (!trimmed) return
    setRawText(trimmed)
    setFilename('Text / LaTeX Source')
    setIsProfileConfirmed(false)
    triggerParseProfile(trimmed)
  }

  // Profile parsing handler
  async function triggerParseProfile(textToParse: string) {
    setParseStatus('parsing')
    setParseError('')

    try {
      const res = await fetch('/api/parse-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: textToParse }),
      })
      const data = await res.json()
      if (!res.ok) {
        setParseStatus('error')
        setParseError(data.detail ?? 'Profile parsing failed.')
        return
      }
      setParsedProfile(data)
      setParseStatus('idle')
    } catch {
      setParseStatus('error')
      setParseError('Failed to connect to AI parsing endpoint.')
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  function reset() {
    setUploadStatus('idle')
    setUploadError('')
    setParseStatus('idle')
    setParseError('')
    setRawText('')
    setFilename('')
    setPastedContent('')
    setParsedProfile(null)
    setConfirmedProfile(null)
    setIsProfileConfirmed(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Determine current active step index (0: Upload/Provide CV, 1: Review Profile, 2: Paste JD, 3: Generate)
  let currentStep = 0
  if (isProfileConfirmed) {
    currentStep = 2
  } else if (parsedProfile || parseStatus === 'parsing' || parseStatus === 'error' || rawText) {
    currentStep = 1
  }

  return (
    <div className="shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="wordmark">
          <span className="wordmark-apply">Apply</span>
          <span className="wordmark-forge">Forge</span>
        </div>

        <nav className="step-nav">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={[
                'step-item',
                i === currentStep ? 'step-item--active' : '',
                i < currentStep ? 'step-item--done' : '',
                i > currentStep ? 'step-item--locked' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="step-num">{i < currentStep ? '✓' : String(i + 1).padStart(2, '0')}</span>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-note">
            No account required.
            <br />
            Nothing saved after your session.
          </p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main">
        {/* Step 0 Header & Input Options */}
        {currentStep === 0 && (
          <>
            <header className="page-header">
              <h1 className="page-title">Provide your CV</h1>
              <p className="page-desc">
                Upload your CV PDF or paste your raw text / LaTeX source to build your profile.
              </p>
            </header>

            {/* Input Mode Selector Tabs */}
            <div className="mode-tabs">
              <button
                type="button"
                className={`mode-tab ${inputMode === 'pdf' ? 'mode-tab--active' : ''}`}
                onClick={() => setInputMode('pdf')}
              >
                📄 Upload PDF File
              </button>
              <button
                type="button"
                className={`mode-tab ${inputMode === 'text' ? 'mode-tab--active' : ''}`}
                onClick={() => setInputMode('text')}
              >
                📝 Paste Text / LaTeX
              </button>
            </div>

            {/* Mode 1: PDF Drop Zone */}
            {inputMode === 'pdf' && (
              <>
                {uploadStatus === 'idle' && (
                  <div
                    id="upload-zone"
                    className={`drop-zone ${dragOver ? 'drop-zone--over' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={onDrop}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                  >
                    <div className="pdf-icon" aria-hidden="true">
                      <div className="pdf-icon__page">
                        <div className="pdf-icon__fold" />
                        <div className="pdf-icon__lines">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>

                    <p className="drop-primary">Drop your CV here</p>
                    <p className="drop-secondary">
                      or <button type="button" className="inline-link">choose a file</button> from your computer
                    </p>
                    <p className="drop-constraint">PDF · max 5 MB</p>

                    <input
                      ref={fileInputRef}
                      id="cv-file-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      style={{ display: 'none' }}
                      onChange={onFileChange}
                    />
                  </div>
                )}

                {uploadStatus === 'uploading' && (
                  <div className="feedback-box feedback-box--loading">
                    <div className="bar-loader">
                      <div className="bar-loader__fill" />
                    </div>
                    <p className="feedback-label">Reading your PDF…</p>
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="feedback-box feedback-box--error">
                    <p className="feedback-error-title">Couldn't read that file</p>
                    <p className="feedback-error-msg">{uploadError}</p>
                    <button id="retry-btn" className="btn btn--ghost" onClick={reset}>
                      Try a different file
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Mode 2: Paste Raw Text or LaTeX */}
            {inputMode === 'text' && (
              <div className="text-input-box">
                <label className="form-label">Paste Raw Resume Text or LaTeX Code</label>
                <textarea
                  className="form-textarea code-font"
                  rows={12}
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder="Paste your plain text resume or raw LaTeX source code (e.g. \section{Experience} \item ...)"
                />
                <div className="text-input-actions">
                  <span className="char-count">{pastedContent.length} characters</span>
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={!pastedContent.trim()}
                    onClick={handleTextSubmit}
                  >
                    ✨ Parse Profile with AI
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 1: Parsing & Profile Review */}
        {currentStep === 1 && (
          <div className="step-container">
            {filename && (
              <div className="result-meta style-top-gap-sm">
                <div className="result-meta__left">
                  <span className="result-filename">📄 {filename}</span>
                  <span className="result-badge">Source Loaded</span>
                </div>
                <button className="btn btn--ghost btn--small" onClick={reset}>
                  Start Over
                </button>
              </div>
            )}

            {parseStatus === 'parsing' && (
              <div className="feedback-box feedback-box--loading style-top-gap">
                <div className="bar-loader">
                  <div className="bar-loader__fill" />
                </div>
                <p className="feedback-label">Analyzing CV text with Llama 3.3 AI & extracting structured profile…</p>
              </div>
            )}

            {parseStatus === 'error' && (
              <div className="feedback-box feedback-box--error style-top-gap">
                <p className="feedback-error-title">Profile Parsing Failed</p>
                <p className="feedback-error-msg">{parseError}</p>
                <div className="btn-group">
                  <button className="btn btn--primary" onClick={() => triggerParseProfile(rawText)}>
                    Retry AI Parsing
                  </button>
                  <button className="btn btn--ghost" onClick={reset}>
                    Start Over
                  </button>
                </div>
              </div>
            )}

            {parseStatus === 'idle' && parsedProfile && !isProfileConfirmed && (
              <ProfileEditor
                initialProfile={parsedProfile}
                onConfirm={(profile) => {
                  setConfirmedProfile(profile)
                  setIsProfileConfirmed(true)
                }}
                onReParse={() => triggerParseProfile(rawText)}
              />
            )}
          </div>
        )}

        {/* Step 2+: Confirmed Profile Ready */}
        {isProfileConfirmed && confirmedProfile && (
          <div className="step-container">
            <div className="confirmed-banner">
              <div className="confirmed-banner__left">
                <span className="check-icon">✓</span>
                <div>
                  <h3 className="confirmed-name">{confirmedProfile.name || 'Candidate Profile Confirmed'}</h3>
                  <p className="confirmed-sub">
                    {confirmedProfile.work_experience.length} experiences · {confirmedProfile.skills.length} skills · Profile locked for AI features.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setIsProfileConfirmed(false)}
              >
                ✏️ Edit Profile
              </button>
            </div>

            {/* Stage 3 Active Match Score View */}
            <MatchScoreView profile={confirmedProfile} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
