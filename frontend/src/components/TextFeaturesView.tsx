import { useState } from 'react'
import type { StructuredProfile } from './ProfileEditor'
import type { MatchScoreResult } from './MatchScoreView'
import { TailoredCvView } from './TailoredCvView'

export interface InterviewQuestionItem {
  question: string
  reasoning: string
}

export interface SalarySource {
  title: string
  url: string
  snippet: string
}

export interface SalaryEstimateData {
  range_low: number
  range_high: number
  currency: string
  sources: SalarySource[]
  summary: string
}

interface Props {
  profile: StructuredProfile
  jobDescription: string
  matchResult: MatchScoreResult | null
  onCalculateScore: () => void
  isCalculatingScore: boolean
  scoreError: string | null
  isRateLimited: boolean
}

type FeatureTab = 'match-score' | 'tailored-cv' | 'cover-letter' | 'outreach-email' | 'linkedin-dm' | 'interview-questions' | 'salary-estimate'

const CURRENCY_RATES: Record<string, { symbol: string; label: string; rate: number }> = {
  USD: { symbol: '$', label: '💵 USD', rate: 1.0 },
  EUR: { symbol: '€', label: '💶 EUR', rate: 0.92 },
  GBP: { symbol: '£', label: '💷 GBP', rate: 0.79 },
  EGP: { symbol: 'EGP ', label: '🇪🇬 EGP', rate: 48.5 },
  AED: { symbol: 'AED ', label: '🇦🇪 AED', rate: 3.67 },
  SAR: { symbol: 'SAR ', label: '🇸🇦 SAR', rate: 3.75 },
  CAD: { symbol: 'CA$', label: '🇨🇦 CAD', rate: 1.37 },
}

export function TextFeaturesView({
  profile,
  jobDescription,
  matchResult,
  onCalculateScore,
  isCalculatingScore,
  scoreError,
  isRateLimited,
}: Props) {
  const [activeTab, setActiveTab] = useState<FeatureTab>('match-score')

  // Generation states
  const [loadingFeature, setLoadingFeature] = useState<FeatureTab | null>(null)
  const [isCompilingCoverLetterPdf, setIsCompilingCoverLetterPdf] = useState(false)
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  // Outputs state
  const [coverLetterText, setCoverLetterText] = useState('')
  const [outreachEmailText, setOutreachEmailText] = useState('')
  const [linkedinDmText, setLinkedinDmText] = useState('')
  const [recruiterContext, setRecruiterContext] = useState('')
  const [showRecruiterInput, setShowRecruiterInput] = useState(false)
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestionItem[]>([])
  const [salaryData, setSalaryData] = useState<SalaryEstimateData | null>(null)
  const [targetCurrency, setTargetCurrency] = useState<string>('USD')

  async function handleCopy(textToCopy: string, label: string) {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopySuccess(label)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      setCopySuccess('Failed to copy')
    }
  }

  async function handleDownloadCoverLetterPdf() {
    if (!coverLetterText.trim()) return

    setIsCompilingCoverLetterPdf(true)
    setErrorMap((prev) => ({ ...prev, 'cover-letter-pdf': '' }))

    try {
      const res = await fetch('/api/generate/cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: coverLetterText.trim(),
          name: profile.name || 'Candidate',
          contact: [profile.contact.email, profile.contact.phone, profile.contact.location].filter(Boolean).join(' · '),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMap((prev) => ({
          ...prev,
          'cover-letter-pdf': data.detail || 'Cover letter PDF compilation failed.',
        }))
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(profile.name || 'cover_letter').toLowerCase().replace(/\s+/g, '_')}_cover_letter.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch {
      setErrorMap((prev) => ({
        ...prev,
        'cover-letter-pdf': 'Network error compiling Cover Letter PDF.',
      }))
    } finally {
      setIsCompilingCoverLetterPdf(false)
    }
  }

  async function generateFeature(feature: FeatureTab) {
    if (!jobDescription.trim()) return

    setLoadingFeature(feature)
    setErrorMap((prev) => ({ ...prev, [feature]: '' }))

    let endpoint = ''
    let payloadExtras: Record<string, any> = {}

    if (feature === 'cover-letter') endpoint = '/api/generate/cover-letter'
    else if (feature === 'outreach-email') endpoint = '/api/generate/outreach-email'
    else if (feature === 'linkedin-dm') {
      endpoint = '/api/generate/linkedin-dm'
      if (recruiterContext.trim()) {
        payloadExtras = { recruiter_context: recruiterContext.trim() }
      }
    } else if (feature === 'interview-questions') endpoint = '/api/generate/interview-questions'
    else if (feature === 'salary-estimate') endpoint = '/api/generate/salary-estimate'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profile,
          job_description: jobDescription.trim(),
          extras: payloadExtras,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMap((prev) => ({
          ...prev,
          [feature]: data.detail || 'Generation failed. Please try again.',
        }))
        return
      }

      if (feature === 'cover-letter') setCoverLetterText(data.content || '')
      else if (feature === 'outreach-email') setOutreachEmailText(data.content || '')
      else if (feature === 'linkedin-dm') setLinkedinDmText(data.content || '')
      else if (feature === 'interview-questions') setInterviewQuestions(data.questions || [])
      else if (feature === 'salary-estimate') setSalaryData(data)
    } catch {
      setErrorMap((prev) => ({
        ...prev,
        [feature]: 'Network error — failed to reach AI service.',
      }))
    } finally {
      setLoadingFeature(null)
    }
  }

  function getScoreTheme(score: number) {
    if (score >= 75) {
      return {
        label: 'High Match — Strong Fit',
        colorClass: 'score-tag--high',
      }
    }
    if (score >= 50) {
      return {
        label: 'Moderate Match — Partial Fit',
        colorClass: 'score-tag--mid',
      }
    }
    return {
      label: 'Low Match — Significant Gaps',
      colorClass: 'score-tag--low',
    }
  }

  // Convert USD base numbers to selected currency
  function formatSalaryRange(lowUsd: number, highUsd: number, currCode: string): string {
    const rateInfo = CURRENCY_RATES[currCode] || CURRENCY_RATES.USD
    const lowConverted = Math.round(lowUsd * rateInfo.rate)
    const highConverted = Math.round(highUsd * rateInfo.rate)

    if (['EGP', 'AED', 'SAR'].includes(currCode)) {
      return `${rateInfo.symbol}${lowConverted.toLocaleString()} - ${highConverted.toLocaleString()}`
    }
    return `${rateInfo.symbol}${lowConverted.toLocaleString()} - ${rateInfo.symbol}${highConverted.toLocaleString()} ${currCode}`
  }

  return (
    <div className="text-features-view style-top-gap">
      <div className="section-card-header margin-bottom-sm">
        <div>
          <h3 className="section-title">AI Application Generation Suite</h3>
          <p className="sidebar-note">All tailored application features in one place.</p>
        </div>
      </div>

      {/* Feature Selector Tabs (Row of 7 functionalities) */}
      <div className="mode-tabs">
        <button
          type="button"
          className={`mode-tab ${activeTab === 'match-score' ? 'mode-tab--active' : ''}`}
          onClick={() => setActiveTab('match-score')}
        >
          🎯 Match Score
        </button>
        <button
          type="button"
          className={`mode-tab ${activeTab === 'tailored-cv' ? 'mode-tab--active' : ''}`}
          onClick={() => setActiveTab('tailored-cv')}
        >
          📄 Tailored Resume
        </button>
        <button
          type="button"
          className={`mode-tab ${activeTab === 'cover-letter' ? 'mode-tab--active' : ''}`}
          onClick={() => setActiveTab('cover-letter')}
        >
          📝 Cover Letter
        </button>
        <button
          type="button"
          className={`mode-tab ${activeTab === 'outreach-email' ? 'mode-tab--active' : ''}`}
          onClick={() => setActiveTab('outreach-email')}
        >
          ✉️ Outreach Email
        </button>
        <button
          type="button"
          className={`mode-tab ${activeTab === 'linkedin-dm' ? 'mode-tab--active' : ''}`}
          onClick={() => setActiveTab('linkedin-dm')}
        >
          💬 LinkedIn DM
        </button>
        <button
          type="button"
          className={`mode-tab ${activeTab === 'interview-questions' ? 'mode-tab--active' : ''}`}
          onClick={() => setActiveTab('interview-questions')}
        >
          💡 Interview Prep
        </button>
        <button
          type="button"
          className={`mode-tab ${activeTab === 'salary-estimate' ? 'mode-tab--active' : ''}`}
          onClick={() => setActiveTab('salary-estimate')}
        >
          💰 Salary Estimate
        </button>
      </div>

      {/* TAB 0: Match Score */}
      {activeTab === 'match-score' && (
        <div className="tab-pane">
          {isCalculatingScore && (
            <div className="feedback-box feedback-box--loading">
              <div className="bar-loader">
                <div className="bar-loader__fill" />
              </div>
              <p className="feedback-label">
                Evaluating candidate profile against Job Description...
              </p>
            </div>
          )}

          {scoreError && !isCalculatingScore && (
            <div className={`feedback-box ${isRateLimited ? 'feedback-box--warning' : 'feedback-box--error'}`}>
              <p className="feedback-error-title">
                {isRateLimited ? '⚠️ Rate Limit Reached' : 'Match Analysis Failed'}
              </p>
              <p className="feedback-error-msg">{scoreError}</p>
              <button
                type="button"
                className="btn btn--primary btn--small"
                onClick={onCalculateScore}
              >
                Retry Calculation
              </button>
            </div>
          )}

          {!matchResult && !isCalculatingScore && !scoreError && (
            <div className="editor-card text-align-center">
              <h4 className="editor-title font-size-md">ATS Match Score & Skill Gap Analysis</h4>
              <p className="editor-subtitle margin-bottom-sm">
                Calculate your match percentage, see matched skills, and identify missing gap skills.
              </p>
              <button
                type="button"
                className="btn btn--primary btn--large"
                onClick={onCalculateScore}
              >
                🎯 Calculate Match Score Now
              </button>
            </div>
          )}

          {matchResult && !isCalculatingScore && (
            <div className="result-wrap">
              <div className="score-hero-card">
                <div className="score-badge-circle">
                  <span className="score-number">{matchResult.score}%</span>
                  <span className="score-sublabel">Match Score</span>
                </div>

                <div className="score-hero-details">
                  <div className="score-meta-row">
                    <span className={`score-status-pill ${getScoreTheme(matchResult.score).colorClass}`}>
                      {getScoreTheme(matchResult.score).label}
                    </span>
                    <span className="score-candidate-name">Candidate: {profile.name || 'Profile'}</span>
                  </div>
                  <p className="score-summary-text">{matchResult.summary}</p>
                </div>
              </div>

              {/* Skill Comparison Grid */}
              <div className="grid-2col-cards style-top-gap-sm">
                {/* Matched Skills */}
                <div className="editor-card match-card--success">
                  <div className="section-card-header">
                    <h3 className="section-title text-success">
                      ✓ Matched Skills ({matchResult.matched_skills.length})
                    </h3>
                  </div>
                  {matchResult.matched_skills.length === 0 ? (
                    <p className="empty-hint">No direct matching skills detected.</p>
                  ) : (
                    <div className="tags-container">
                      {matchResult.matched_skills.map((skill, idx) => (
                        <span key={idx} className="tag-chip tag-chip--success">
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="editor-card match-card--missing">
                  <div className="section-card-header">
                    <h3 className="section-title text-warning">
                      ⚠️ Missing or Gap Skills ({matchResult.missing_skills.length})
                    </h3>
                  </div>
                  {matchResult.missing_skills.length === 0 ? (
                    <p className="empty-hint">All key JD skills appear to be matched!</p>
                  ) : (
                    <div className="tags-container">
                      {matchResult.missing_skills.map((skill, idx) => (
                        <span key={idx} className="tag-chip tag-chip--warning">
                          + {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: Tailored Resume */}
      {activeTab === 'tailored-cv' && (
        <TailoredCvView profile={profile} jobDescription={jobDescription} />
      )}

      {/* TAB 2: Cover Letter */}
      {activeTab === 'cover-letter' && (
        <div className="editor-card">
          <div className="section-card-header">
            <div>
              <h4 className="editor-title font-size-md">Tailored Cover Letter</h4>
              <p className="editor-subtitle">
                Professional 3-4 paragraph cover letter highlighting key achievements for this JD.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={loadingFeature === 'cover-letter' || !jobDescription.trim()}
              onClick={() => generateFeature('cover-letter')}
            >
              {loadingFeature === 'cover-letter' ? '✨ Writing...' : coverLetterText ? '🔄 Re-generate' : '✨ Generate Cover Letter'}
            </button>
          </div>

          {errorMap['cover-letter'] && (
            <div className="feedback-box feedback-box--error">
              <p className="feedback-error-msg">{errorMap['cover-letter']}</p>
            </div>
          )}

          {errorMap['cover-letter-pdf'] && (
            <div className="feedback-box feedback-box--error">
              <p className="feedback-error-msg">{errorMap['cover-letter-pdf']}</p>
            </div>
          )}

          {loadingFeature === 'cover-letter' && (
            <div className="feedback-box feedback-box--loading">
              <div className="bar-loader">
                <div className="bar-loader__fill" />
              </div>
              <p className="feedback-label">Drafting tailored cover letter with Llama 3.3...</p>
            </div>
          )}

          {coverLetterText && loadingFeature !== 'cover-letter' && (
            <div className="output-panel">
              <div className="output-panel__header">
                <span className="result-badge">Generated Cover Letter</span>
                <div className="btn-group">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => handleCopy(coverLetterText, 'cover-letter')}
                  >
                    {copySuccess === 'cover-letter' ? '✓ Copied!' : '📋 Copy Content'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    disabled={isCompilingCoverLetterPdf}
                    onClick={handleDownloadCoverLetterPdf}
                  >
                    {isCompilingCoverLetterPdf ? '⏳ Compiling PDF...' : '📥 Download PDF'}
                  </button>
                </div>
              </div>
              <div className="output-text-content">{coverLetterText}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Outreach Email */}
      {activeTab === 'outreach-email' && (
        <div className="editor-card">
          <div className="section-card-header">
            <div>
              <h4 className="editor-title font-size-md">Cold Outreach Email</h4>
              <p className="editor-subtitle">
                Concise (under 175 words) cold email with high-impact accomplishments and a clear CTA.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={loadingFeature === 'outreach-email' || !jobDescription.trim()}
              onClick={() => generateFeature('outreach-email')}
            >
              {loadingFeature === 'outreach-email' ? '✨ Writing...' : outreachEmailText ? '🔄 Re-generate' : '✨ Generate Outreach Email'}
            </button>
          </div>

          {errorMap['outreach-email'] && (
            <div className="feedback-box feedback-box--error">
              <p className="feedback-error-msg">{errorMap['outreach-email']}</p>
            </div>
          )}

          {loadingFeature === 'outreach-email' && (
            <div className="feedback-box feedback-box--loading">
              <div className="bar-loader">
                <div className="bar-loader__fill" />
              </div>
              <p className="feedback-label">Creating outreach email...</p>
            </div>
          )}

          {outreachEmailText && loadingFeature !== 'outreach-email' && (
            <div className="output-panel">
              <div className="output-panel__header">
                <span className="result-badge">Generated Email</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => handleCopy(outreachEmailText, 'outreach-email')}
                >
                  {copySuccess === 'outreach-email' ? '✓ Copied!' : '📋 Copy Email'}
                </button>
              </div>
              <div className="output-text-content">{outreachEmailText}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LinkedIn DM */}
      {activeTab === 'linkedin-dm' && (
        <div className="editor-card">
          <div className="section-card-header">
            <div>
              <h4 className="editor-title font-size-md">LinkedIn Direct Message</h4>
              <p className="editor-subtitle">
                Short, punchy LinkedIn message (under 120 words) for recruiters and hiring managers.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={loadingFeature === 'linkedin-dm' || !jobDescription.trim()}
              onClick={() => generateFeature('linkedin-dm')}
            >
              {loadingFeature === 'linkedin-dm' ? '✨ Drafting...' : linkedinDmText ? '🔄 Re-generate' : '✨ Generate LinkedIn DM'}
            </button>
          </div>

          {/* Optional Recruiter Context Accordion */}
          <div className="recruiter-context-box">
            <button
              type="button"
              className="btn btn--ghost btn--small toggle-context-btn"
              onClick={() => setShowRecruiterInput(!showRecruiterInput)}
            >
              {showRecruiterInput ? '▼ Hide Recruiter Context' : '▶ Add Recruiter Context (Optional)'}
            </button>

            {showRecruiterInput && (
              <div className="form-group style-top-gap-sm">
                <label className="form-label">Recruiter Name / Note / Company Detail</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sarah Jenkins (Lead Technical Recruiter at Stripe, mentioned hiring for core platform)"
                  value={recruiterContext}
                  onChange={(e) => setRecruiterContext(e.target.value)}
                />
              </div>
            )}
          </div>

          {errorMap['linkedin-dm'] && (
            <div className="feedback-box feedback-box--error">
              <p className="feedback-error-msg">{errorMap['linkedin-dm']}</p>
            </div>
          )}

          {loadingFeature === 'linkedin-dm' && (
            <div className="feedback-box feedback-box--loading">
              <div className="bar-loader">
                <div className="bar-loader__fill" />
              </div>
              <p className="feedback-label">Personalizing LinkedIn message...</p>
            </div>
          )}

          {linkedinDmText && loadingFeature !== 'linkedin-dm' && (
            <div className="output-panel">
              <div className="output-panel__header">
                <span className="result-badge">Generated LinkedIn DM</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => handleCopy(linkedinDmText, 'linkedin-dm')}
                >
                  {copySuccess === 'linkedin-dm' ? '✓ Copied!' : '📋 Copy Message'}
                </button>
              </div>
              <div className="output-text-content">{linkedinDmText}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Interview Questions */}
      {activeTab === 'interview-questions' && (
        <div className="editor-card">
          <div className="section-card-header">
            <div>
              <h4 className="editor-title font-size-md">Predicted Interview Questions</h4>
              <p className="editor-subtitle">
                Targeted interview questions & preparation tips tailored to your CV + JD.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={loadingFeature === 'interview-questions' || !jobDescription.trim()}
              onClick={() => generateFeature('interview-questions')}
            >
              {loadingFeature === 'interview-questions' ? '✨ Predicting...' : interviewQuestions.length > 0 ? '🔄 Re-generate' : '✨ Predict Questions'}
            </button>
          </div>

          {errorMap['interview-questions'] && (
            <div className="feedback-box feedback-box--error">
              <p className="feedback-error-msg">{errorMap['interview-questions']}</p>
            </div>
          )}

          {loadingFeature === 'interview-questions' && (
            <div className="feedback-box feedback-box--loading">
              <div className="bar-loader">
                <div className="bar-loader__fill" />
              </div>
              <p className="feedback-label">Analyzing CV experience vs JD to predict interview questions...</p>
            </div>
          )}

          {interviewQuestions.length > 0 && loadingFeature !== 'interview-questions' && (
            <div className="interview-questions-list style-top-gap-sm">
              <div className="output-panel__header margin-bottom-sm">
                <span className="result-badge">{interviewQuestions.length} Questions Predicted</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    const text = interviewQuestions.map((q, i) => `Q${i + 1}: ${q.question}\nReasoning: ${q.reasoning}\n`).join('\n')
                    handleCopy(text, 'interview-questions')
                  }}
                >
                  {copySuccess === 'interview-questions' ? '✓ Copied All!' : '📋 Copy All Questions'}
                </button>
              </div>

              {interviewQuestions.map((item, idx) => (
                <div key={idx} className="iq-item-card">
                  <div className="iq-item-num">Q{idx + 1}</div>
                  <div className="iq-item-content">
                    <h5 className="iq-item-question">{item.question}</h5>
                    <p className="iq-item-reasoning">
                      <strong className="text-accent">Why you might be asked this:</strong> {item.reasoning}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: Salary Estimate */}
      {activeTab === 'salary-estimate' && (
        <div className="editor-card">
          <div className="section-card-header">
            <div>
              <h4 className="editor-title font-size-md">Market Salary Benchmark (Tavily Web Search)</h4>
              <p className="editor-subtitle">
                Grounded market compensation estimate synthesized from live web search data.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={loadingFeature === 'salary-estimate' || !jobDescription.trim()}
              onClick={() => generateFeature('salary-estimate')}
            >
              {loadingFeature === 'salary-estimate' ? '🔍 Searching Web...' : salaryData ? '🔄 Re-estimate' : '💰 Estimate Salary Range'}
            </button>
          </div>

          {errorMap['salary-estimate'] && (
            <div className="feedback-box feedback-box--error">
              <p className="feedback-error-msg">{errorMap['salary-estimate']}</p>
            </div>
          )}

          {loadingFeature === 'salary-estimate' && (
            <div className="feedback-box feedback-box--loading">
              <div className="bar-loader">
                <div className="bar-loader__fill" />
              </div>
              <p className="feedback-label">Searching Tavily for compensation benchmarks & location data...</p>
            </div>
          )}

          {salaryData && loadingFeature !== 'salary-estimate' && (
            <div className="result-wrap style-top-gap">
              {/* Currency Converter Bar */}
              <div className="currency-selector-bar margin-bottom-sm">
                <span className="currency-selector-label">💱 Convert Display Currency:</span>
                <div className="currency-pills-group">
                  {Object.entries(CURRENCY_RATES).map(([code, config]) => (
                    <button
                      key={code}
                      type="button"
                      className={`currency-pill ${targetCurrency === code ? 'currency-pill--active' : ''}`}
                      onClick={() => setTargetCurrency(code)}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="salary-hero-card">
                <div className="salary-range-badge">
                  <span className="salary-range-value">
                    {formatSalaryRange(salaryData.range_low || 85000, salaryData.range_high || 120000, targetCurrency)}
                  </span>
                  <span className="salary-disclaimer-pill">AI Market Estimate</span>
                </div>
                <p className="salary-summary">{salaryData.summary}</p>
              </div>

              {salaryData.sources && salaryData.sources.length > 0 && (
                <div className="salary-sources-card style-top-gap-sm">
                  <h5 className="section-title font-size-sm margin-bottom-xs">🌐 Grounded Web Search Sources</h5>
                  <ul className="sources-list">
                    {salaryData.sources.map((src, i) => (
                      <li key={i} className="source-item">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link"
                        >
                          🔗 {src.title || src.url}
                        </a>
                        {src.snippet && <p className="source-snippet">{src.snippet}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
