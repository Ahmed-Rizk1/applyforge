import { useState } from 'react'
import type { StructuredProfile } from './ProfileEditor'
import { TextFeaturesView } from './TextFeaturesView'

export interface MatchScoreResult {
  score: number
  matched_skills: string[]
  missing_skills: string[]
  summary: string
}

const SAMPLE_JD = `Senior Full-Stack Engineer

About the Role:
We are looking for a Senior Full-Stack Engineer to join our core product team. You will build high-performance web applications using modern backend and frontend technologies.

Key Responsibilities:
- Design, build, and maintain scalable RESTful APIs with Python & FastAPI.
- Develop interactive, high-performance web UI components using React, TypeScript, and Vite.
- Collaborate with product designers and engineers to ship clean, user-centric features.
- Write unit tests, optimize application performance, and participate in code reviews.

Requirements & Qualifications:
- 4+ years of software engineering experience.
- Strong proficiency in Python, FastAPI, React, TypeScript, and modern CSS/HTML.
- Solid understanding of Git, Docker, CI/CD pipelines, and PostgreSQL.
- Experience with Cloud platforms (AWS/GCP), Kubernetes, and Redis is a plus.`

interface Props {
  profile: StructuredProfile
  jobDescription?: string
  onJobDescriptionChange?: (jd: string) => void
  onOpenChatbot?: () => void
}

export function MatchScoreView({
  profile,
  jobDescription: externalJd,
  onJobDescriptionChange,
  onOpenChatbot,
}: Props) {
  const [internalJd, setInternalJd] = useState('')
  const jobDescription = externalJd !== undefined ? externalJd : internalJd

  const setJobDescription = (val: string) => {
    if (onJobDescriptionChange) onJobDescriptionChange(val)
    else setInternalJd(val)
  }

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [matchResult, setMatchResult] = useState<MatchScoreResult | null>(null)

  async function handleCalculateScore() {
    if (!jobDescription.trim()) return

    setIsLoading(true)
    setError(null)
    setIsRateLimited(false)

    try {
      const res = await fetch('/api/generate/match-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profile,
          job_description: jobDescription.trim(),
        }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setIsRateLimited(true)
        setError(data.detail || 'Rate limit exceeded. Please wait before retrying.')
        setIsLoading(false)
        return
      }

      if (!res.ok) {
        setError(data.detail || 'Failed to calculate match score.')
        setIsLoading(false)
        return
      }

      setMatchResult(data)
    } catch {
      setError('Network error — unable to reach match score backend service.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="match-score-view">
      {/* Header */}
      <header className="page-header">
        <h1 className="page-title">Target Job Description & Match Analysis</h1>
        <p className="page-desc">
          Paste the job posting text below to calculate your ATS match score, identify missing skills, and unlock tailored application tools.
        </p>
      </header>

      {/* Job Description Input Card */}
      <div className="editor-card">
        <div className="section-card-header">
          <label className="form-label" htmlFor="jd-textarea">
            Target Job Description (JD)
          </label>
          <div className="btn-group">
            {onOpenChatbot && (
              <button
                type="button"
                className="btn btn--ghost btn--small text-accent"
                onClick={onOpenChatbot}
              >
                💬 Open Form Chatbot
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setJobDescription(SAMPLE_JD)}
            >
              📋 Load Sample JD
            </button>
            {jobDescription && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setJobDescription('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <textarea
          id="jd-textarea"
          className="form-textarea"
          rows={8}
          placeholder="Paste the full job description text here (role summary, responsibilities, technical requirements, qualifications)..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <div className="text-input-actions">
          <span className="char-count">{jobDescription.trim().length} characters</span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!jobDescription.trim() || isLoading}
            onClick={handleCalculateScore}
          >
            {isLoading ? '⏳ Analyzing Match...' : '🎯 Calculate Match Score'}
          </button>
        </div>
      </div>

      {/* Generation Suite Tabs (Match Score + 5 AI Tools in 1 Single Row) */}
      {jobDescription.trim() && (
        <TextFeaturesView
          profile={profile}
          jobDescription={jobDescription}
          matchResult={matchResult}
          onCalculateScore={handleCalculateScore}
          isCalculatingScore={isLoading}
          scoreError={error}
          isRateLimited={isRateLimited}
        />
      )}
    </div>
  )
}
