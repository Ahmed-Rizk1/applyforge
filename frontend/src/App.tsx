import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import './App.css'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'success'; rawText: string; filename: string }
  | { status: 'error'; message: string }

const STEPS = ['Upload CV', 'Review Profile', 'Paste JD', 'Generate']

function App() {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    setUploadState({ status: 'uploading' })
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload-cv', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setUploadState({ status: 'error', message: data.detail ?? 'Upload failed.' })
        return
      }
      setUploadState({ status: 'success', rawText: data.raw_text, filename: data.filename })
    } catch {
      setUploadState({ status: 'error', message: 'Network error — is the backend running?' })
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
    setUploadState({ status: 'idle' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const currentStep = uploadState.status === 'success' ? 1 : 0

  return (
    <div className="shell">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="wordmark">
          <span className="wordmark-apply">Apply</span><span className="wordmark-forge">Forge</span>
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
              ].filter(Boolean).join(' ')}
            >
              <span className="step-num">{i < currentStep ? '✓' : String(i + 1).padStart(2, '0')}</span>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-note">No account required.<br />Nothing saved after your session.</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main">
        <header className="page-header">
          <h1 className="page-title">Upload your CV</h1>
          <p className="page-desc">We'll extract your experience and build a profile you can review before generating anything.</p>
        </header>

        {/* Idle — upload zone */}
        {uploadState.status === 'idle' && (
          <div
            id="upload-zone"
            className={`drop-zone ${dragOver ? 'drop-zone--over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
          >
            {/* PDF icon drawn in CSS */}
            <div className="pdf-icon" aria-hidden="true">
              <div className="pdf-icon__page">
                <div className="pdf-icon__fold" />
                <div className="pdf-icon__lines">
                  <span /><span /><span />
                </div>
              </div>
            </div>

            <p className="drop-primary">Drop your CV here</p>
            <p className="drop-secondary">or <button type="button" className="inline-link">choose a file</button> from your computer</p>
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

        {/* Uploading */}
        {uploadState.status === 'uploading' && (
          <div className="feedback-box feedback-box--loading">
            <div className="bar-loader">
              <div className="bar-loader__fill" />
            </div>
            <p className="feedback-label">Reading your PDF…</p>
          </div>
        )}

        {/* Error */}
        {uploadState.status === 'error' && (
          <div className="feedback-box feedback-box--error">
            <p className="feedback-error-title">Couldn't read that file</p>
            <p className="feedback-error-msg">{uploadState.message}</p>
            <button id="retry-btn" className="btn btn--ghost" onClick={reset}>Try a different file</button>
          </div>
        )}

        {/* Success */}
        {uploadState.status === 'success' && (
          <div className="result-wrap">
            <div className="result-meta">
              <div className="result-meta__left">
                <span className="result-filename">{uploadState.filename}</span>
                <span className="result-badge">Text extracted</span>
              </div>
              <button id="upload-new-btn" className="btn btn--ghost" onClick={reset}>Replace file</button>
            </div>

            <div className="result-scroll-hint">Raw extracted text — review before we structure it into your profile.</div>
            <pre id="raw-text-output" className="raw-text">{uploadState.rawText}</pre>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
