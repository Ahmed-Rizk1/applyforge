import { useState } from 'react'

export interface ContactInfo {
  name: string
  email: string
  phone: string
  linkedin: string
  github: string
  location: string
  website: string
}

export interface WorkExperience {
  title: string
  company: string
  location: string
  start_date: string
  end_date: string
  is_current: boolean
  bullets: string[]
}

export interface Education {
  degree: string
  institution: string
  location: string
  start_date: string
  end_date: string
}

export interface Project {
  name: string
  description: string
  technologies: string[]
  link: string
}

export interface StructuredProfile {
  name: string
  contact: ContactInfo
  summary: string
  work_experience: WorkExperience[]
  education: Education[]
  projects: Project[]
  skills: string[]
  certifications: string[]
  languages: string[]
}

interface ProfileEditorProps {
  initialProfile: StructuredProfile
  onConfirm: (confirmedProfile: StructuredProfile) => void
  onReParse?: () => void
}

export function ProfileEditor({ initialProfile, onConfirm, onReParse }: ProfileEditorProps) {
  const [profile, setProfile] = useState<StructuredProfile>(initialProfile)
  const [newSkill, setNewSkill] = useState('')
  const [newCert, setNewCert] = useState('')
  const [newLang, setNewLang] = useState('')

  // Top level fields
  const updateContact = (key: keyof ContactInfo, value: string) => {
    setProfile((prev) => ({
      ...prev,
      contact: { ...prev.contact, [key]: value },
      name: key === 'name' ? value : prev.name,
    }))
  }

  const updateSummary = (value: string) => {
    setProfile((prev) => ({ ...prev, summary: value }))
  }

  // Work Experience Handlers
  const updateWorkExp = (index: number, key: keyof WorkExperience, value: any) => {
    setProfile((prev) => {
      const updated = [...prev.work_experience]
      updated[index] = { ...updated[index], [key]: value }
      return { ...prev, work_experience: updated }
    })
  }

  const updateBullet = (expIndex: number, bulletIndex: number, text: string) => {
    setProfile((prev) => {
      const updatedExp = [...prev.work_experience]
      const updatedBullets = [...updatedExp[expIndex].bullets]
      updatedBullets[bulletIndex] = text
      updatedExp[expIndex] = { ...updatedExp[expIndex], bullets: updatedBullets }
      return { ...prev, work_experience: updatedExp }
    })
  }

  const addBullet = (expIndex: number) => {
    setProfile((prev) => {
      const updatedExp = [...prev.work_experience]
      updatedExp[expIndex] = {
        ...updatedExp[expIndex],
        bullets: [...updatedExp[expIndex].bullets, ''],
      }
      return { ...prev, work_experience: updatedExp }
    })
  }

  const removeBullet = (expIndex: number, bulletIndex: number) => {
    setProfile((prev) => {
      const updatedExp = [...prev.work_experience]
      const updatedBullets = updatedExp[expIndex].bullets.filter((_, i) => i !== bulletIndex)
      updatedExp[expIndex] = { ...updatedExp[expIndex], bullets: updatedBullets }
      return { ...prev, work_experience: updatedExp }
    })
  }

  const addWorkExp = () => {
    setProfile((prev) => ({
      ...prev,
      work_experience: [
        ...prev.work_experience,
        {
          title: '',
          company: '',
          location: '',
          start_date: '',
          end_date: '',
          is_current: false,
          bullets: [''],
        },
      ],
    }))
  }

  const removeWorkExp = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      work_experience: prev.work_experience.filter((_, i) => i !== index),
    }))
  }

  // Education Handlers
  const updateEdu = (index: number, key: keyof Education, value: string) => {
    setProfile((prev) => {
      const updated = [...prev.education]
      updated[index] = { ...updated[index], [key]: value }
      return { ...prev, education: updated }
    })
  }

  const addEdu = () => {
    setProfile((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { degree: '', institution: '', location: '', start_date: '', end_date: '' },
      ],
    }))
  }

  const removeEdu = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  // Project Handlers
  const updateProject = (index: number, key: keyof Project, value: any) => {
    setProfile((prev) => {
      const updated = [...prev.projects]
      updated[index] = { ...updated[index], [key]: value }
      return { ...prev, projects: updated }
    })
  }

  const addProject = () => {
    setProfile((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { name: '', description: '', technologies: [], link: '' },
      ],
    }))
  }

  const removeProject = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }))
  }

  // Skills, Certifications, Languages Tag Handlers
  const addTag = (category: 'skills' | 'certifications' | 'languages', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setProfile((prev) => {
      if (prev[category].includes(trimmed)) return prev
      return { ...prev, [category]: [...prev[category], trimmed] }
    })
  }

  const removeTag = (category: 'skills' | 'certifications' | 'languages', tagIndex: number) => {
    setProfile((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== tagIndex),
    }))
  }

  return (
    <div className="profile-editor">
      <div className="profile-editor__header">
        <div>
          <h2 className="editor-title">Review & Edit Your Profile</h2>
          <p className="editor-subtitle">
            AI extracted your profile details below. Verify and edit any field before locking it in.
          </p>
        </div>
        <div className="editor-actions">
          {onReParse && (
            <button type="button" className="btn btn--ghost" onClick={onReParse}>
              ↻ Re-parse Raw Text
            </button>
          )}
          <button
            type="button"
            id="confirm-profile-btn"
            className="btn btn--primary"
            onClick={() => onConfirm(profile)}
          >
            ✓ Confirm Profile
          </button>
        </div>
      </div>

      {/* Candidate Basic & Contact Details */}
      <section className="editor-card">
        <h3 className="section-title">👤 Contact & Header</h3>
        <div className="form-grid form-grid--2col">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={profile.contact.name || profile.name}
              onChange={(e) => updateContact('name', e.target.value)}
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={profile.contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="text"
              className="form-input"
              value={profile.contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={profile.contact.location}
              onChange={(e) => updateContact('location', e.target.value)}
              placeholder="San Francisco, CA"
            />
          </div>
          <div className="form-group">
            <label className="form-label">LinkedIn</label>
            <input
              type="text"
              className="form-input"
              value={profile.contact.linkedin}
              onChange={(e) => updateContact('linkedin', e.target.value)}
              placeholder="linkedin.com/in/janedoe"
            />
          </div>
          <div className="form-group">
            <label className="form-label">GitHub / Website</label>
            <input
              type="text"
              className="form-input"
              value={profile.contact.github || profile.contact.website}
              onChange={(e) => updateContact('github', e.target.value)}
              placeholder="github.com/janedoe"
            />
          </div>
        </div>

        <div className="form-group style-top-gap">
          <label className="form-label">Professional Summary</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={profile.summary}
            onChange={(e) => updateSummary(e.target.value)}
            placeholder="Brief professional overview..."
          />
        </div>
      </section>

      {/* Work Experience */}
      <section className="editor-card">
        <div className="section-card-header">
          <h3 className="section-title">💼 Work Experience ({profile.work_experience.length})</h3>
          <button type="button" className="btn btn--small btn--ghost" onClick={addWorkExp}>
            + Add Position
          </button>
        </div>

        {profile.work_experience.length === 0 ? (
          <p className="empty-hint">No work experience listed yet. Click "+ Add Position" to add one.</p>
        ) : (
          profile.work_experience.map((exp, expIdx) => (
            <div key={expIdx} className="item-block">
              <div className="item-block__header">
                <span className="item-num">Position #{expIdx + 1}</span>
                <button
                  type="button"
                  className="btn-text-danger"
                  onClick={() => removeWorkExp(expIdx)}
                >
                  Remove
                </button>
              </div>

              <div className="form-grid form-grid--2col">
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={exp.title}
                    onChange={(e) => updateWorkExp(expIdx, 'title', e.target.value)}
                    placeholder="Senior Software Engineer"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input
                    type="text"
                    className="form-input"
                    value={exp.company}
                    onChange={(e) => updateWorkExp(expIdx, 'company', e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="text"
                    className="form-input"
                    value={exp.start_date}
                    onChange={(e) => updateWorkExp(expIdx, 'start_date', e.target.value)}
                    placeholder="Jan 2021"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="text"
                    className="form-input"
                    value={exp.end_date}
                    onChange={(e) => updateWorkExp(expIdx, 'end_date', e.target.value)}
                    placeholder="Present"
                  />
                </div>
              </div>

              {/* Bullet points */}
              <div className="bullets-section">
                <label className="form-label">Key Achievements / Responsibilities</label>
                {exp.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="bullet-row">
                    <span className="bullet-dot">•</span>
                    <input
                      type="text"
                      className="form-input bullet-input"
                      value={bullet}
                      onChange={(e) => updateBullet(expIdx, bIdx, e.target.value)}
                      placeholder="Described achievement..."
                    />
                    <button
                      type="button"
                      className="icon-btn-remove"
                      onClick={() => removeBullet(expIdx, bIdx)}
                      title="Remove bullet"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn--small btn--ghost style-top-gap-sm"
                  onClick={() => addBullet(expIdx)}
                >
                  + Add Bullet Point
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Education */}
      <section className="editor-card">
        <div className="section-card-header">
          <h3 className="section-title">🎓 Education ({profile.education.length})</h3>
          <button type="button" className="btn btn--small btn--ghost" onClick={addEdu}>
            + Add Education
          </button>
        </div>

        {profile.education.length === 0 ? (
          <p className="empty-hint">No education listed yet. Click "+ Add Education" to add one.</p>
        ) : (
          profile.education.map((edu, eduIdx) => (
            <div key={eduIdx} className="item-block">
              <div className="item-block__header">
                <span className="item-num">Education #{eduIdx + 1}</span>
                <button
                  type="button"
                  className="btn-text-danger"
                  onClick={() => removeEdu(eduIdx)}
                >
                  Remove
                </button>
              </div>
              <div className="form-grid form-grid--2col">
                <div className="form-group">
                  <label className="form-label">Degree & Major</label>
                  <input
                    type="text"
                    className="form-input"
                    value={edu.degree}
                    onChange={(e) => updateEdu(eduIdx, 'degree', e.target.value)}
                    placeholder="B.S. in Computer Science"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Institution</label>
                  <input
                    type="text"
                    className="form-input"
                    value={edu.institution}
                    onChange={(e) => updateEdu(eduIdx, 'institution', e.target.value)}
                    placeholder="University of California"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date / Grad Year</label>
                  <input
                    type="text"
                    className="form-input"
                    value={edu.start_date || edu.end_date}
                    onChange={(e) => updateEdu(eduIdx, 'start_date', e.target.value)}
                    placeholder="2018 - 2022"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Projects */}
      {profile.projects && profile.projects.length > 0 && (
        <section className="editor-card">
          <div className="section-card-header">
            <h3 className="section-title">🚀 Key Projects ({profile.projects.length})</h3>
            <button type="button" className="btn btn--small btn--ghost" onClick={addProject}>
              + Add Project
            </button>
          </div>
          {profile.projects.map((proj, projIdx) => (
            <div key={projIdx} className="item-block">
              <div className="item-block__header">
                <span className="item-num">Project #{projIdx + 1}</span>
                <button
                  type="button"
                  className="btn-text-danger"
                  onClick={() => removeProject(projIdx)}
                >
                  Remove
                </button>
              </div>
              <div className="form-grid form-grid--2col">
                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proj.name}
                    onChange={(e) => updateProject(projIdx, 'name', e.target.value)}
                    placeholder="ApplyForge MVP"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Project Link</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proj.link}
                    onChange={(e) => updateProject(projIdx, 'link', e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
              <div className="form-group style-top-gap-sm">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={proj.description}
                  onChange={(e) => updateProject(projIdx, 'description', e.target.value)}
                  placeholder="Short summary of project features and impact..."
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Skills & Badges */}
      <section className="editor-card">
        <h3 className="section-title">🛠️ Skills ({profile.skills.length})</h3>
        <div className="tags-container">
          {profile.skills.map((skill, sIdx) => (
            <span key={sIdx} className="tag-chip">
              {skill}
              <button
                type="button"
                className="tag-chip-remove"
                onClick={() => removeTag('skills', sIdx)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="tag-add-bar">
          <input
            type="text"
            className="form-input tag-input"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag('skills', newSkill)
                setNewSkill('')
              }
            }}
            placeholder="Add a skill (e.g. Python, React) and press Enter"
          />
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => {
              addTag('skills', newSkill)
              setNewSkill('')
            }}
          >
            Add Skill
          </button>
        </div>
      </section>

      {/* Certifications & Languages */}
      <div className="grid-2col-cards">
        <section className="editor-card">
          <h3 className="section-title">📜 Certifications</h3>
          <div className="tags-container">
            {profile.certifications.map((cert, cIdx) => (
              <span key={cIdx} className="tag-chip tag-chip--secondary">
                {cert}
                <button
                  type="button"
                  className="tag-chip-remove"
                  onClick={() => removeTag('certifications', cIdx)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="tag-add-bar">
            <input
              type="text"
              className="form-input tag-input"
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag('certifications', newCert)
                  setNewCert('')
                }
              }}
              placeholder="Add certification..."
            />
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                addTag('certifications', newCert)
                setNewCert('')
              }}
            >
              Add
            </button>
          </div>
        </section>

        <section className="editor-card">
          <h3 className="section-title">🌐 Languages</h3>
          <div className="tags-container">
            {profile.languages.map((lang, lIdx) => (
              <span key={lIdx} className="tag-chip tag-chip--secondary">
                {lang}
                <button
                  type="button"
                  className="tag-chip-remove"
                  onClick={() => removeTag('languages', lIdx)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="tag-add-bar">
            <input
              type="text"
              className="form-input tag-input"
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag('languages', newLang)
                  setNewLang('')
                }
              }}
              placeholder="Add language..."
            />
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                addTag('languages', newLang)
                setNewLang('')
              }}
            >
              Add
            </button>
          </div>
        </section>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="profile-editor__footer">
        <p className="footer-hint">All edits are saved in your browser session.</p>
        <button
          type="button"
          className="btn btn--primary btn--large"
          onClick={() => onConfirm(profile)}
        >
          ✓ Confirm & Lock Profile
        </button>
      </div>
    </div>
  )
}
