import { useState } from 'react'
import type { StructuredProfile } from './ProfileEditor'

interface Props {
  profile: StructuredProfile
  jobDescription: string
}

export function TailoredCvView({ profile, jobDescription }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompilingPdf, setIsCompilingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [texSource, setTexSource] = useState<string>('')
  const [htmlPreview, setHtmlPreview] = useState<string>('')
  const [viewTab, setViewTab] = useState<'preview' | 'code'>('preview')

  async function handleGenerateCv() {
    if (!jobDescription.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/generate/tailored-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profile,
          job_description: jobDescription.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Failed to generate tailored CV.')
        return
      }

      setTexSource(data.tex_source || '')
      setHtmlPreview(data.html_preview || '')
    } catch {
      setError('Network error — failed to reach tailored CV service.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownloadPdf() {
    if (!texSource) return

    setIsCompilingPdf(true)
    setError(null)

    try {
      const res = await fetch('/api/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tex_source: texSource }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Failed to compile LaTeX PDF.')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(profile.name || 'resume').toLowerCase().replace(/\s+/g, '_')}_tailored.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch {
      setError('Network error during PDF compilation.')
    } finally {
      setIsCompilingPdf(false)
    }
  }

  function handleDownloadTex() {
    if (!texSource) return
    const blob = new Blob([texSource], { type: 'text/x-tex;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(profile.name || 'resume').toLowerCase().replace(/\s+/g, '_')}_tailored.tex`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }

  return (
    <div className="tailored-cv-view style-top-gap">
      <div className="editor-card">
        <div className="section-card-header">
          <div>
            <h3 className="section-title">LaTeX ATS-Tailored Resume</h3>
            <p className="editor-subtitle">
              Generates an ATS-optimized, single-page LaTeX resume tailored to this job description.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            disabled={isGenerating || !jobDescription.trim()}
            onClick={handleGenerateCv}
          >
            {isGenerating ? '✨ Tailoring Resume...' : texSource ? '🔄 Re-tailor Resume' : '📄 Generate Tailored CV'}
          </button>
        </div>

        {error && (
          <div className="feedback-box feedback-box--error style-top-gap-sm">
            <p className="feedback-error-msg">{error}</p>
          </div>
        )}

        {isGenerating && (
          <div className="feedback-box feedback-box--loading style-top-gap">
            <div className="bar-loader">
              <div className="bar-loader__fill" />
            </div>
            <p className="feedback-label">
              Rewriting accomplishments & skills to match target JD keywords...
            </p>
          </div>
        )}

        {texSource && !isGenerating && (
          <div className="cv-result-container style-top-gap">
            <div className="cv-result-bar">
              <div className="mode-tabs margin-bottom-none">
                <button
                  type="button"
                  className={`mode-tab ${viewTab === 'preview' ? 'mode-tab--active' : ''}`}
                  onClick={() => setViewTab('preview')}
                >
                  👁️ HTML Preview
                </button>
                <button
                  type="button"
                  className={`mode-tab ${viewTab === 'code' ? 'mode-tab--active' : ''}`}
                  onClick={() => setViewTab('code')}
                >
                  💻 LaTeX Source (.tex)
                </button>
              </div>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={handleDownloadTex}
                >
                  📥 Download .tex
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  disabled={isCompilingPdf}
                  onClick={handleDownloadPdf}
                >
                  {isCompilingPdf ? '⏳ Compiling PDF...' : '📥 Download PDF'}
                </button>
              </div>
            </div>

            {/* View 1: HTML Preview */}
            {viewTab === 'preview' && (
              <div className="cv-preview-paper">
                <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
              </div>
            )}

            {/* View 2: Code View */}
            {viewTab === 'code' && (
              <pre className="raw-text code-font">{texSource}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
