import os
import json
import logging
from typing import Any, Dict, Tuple, Optional
from app.models.profile import StructuredProfile
from app.services.llm import call_groq_json
from app.services.latex_compiler import escape_latex

logger = logging.getLogger(__name__)

TAILOR_PROMPT_SYSTEM = """You are an expert resume writer and ATS optimization specialist.
Given a candidate's structured profile and a target Job Description (JD), rewrite and tailor the profile to maximize relevance to the target job.

RULES:
1. "summary": Rewrite the summary in 2-3 impact-driven sentences, framing candidate experience around key keywords in the JD.
2. "work_experience": For each work experience item, tailor the bullet points to highlight achievements, metrics, tools, and technical keywords mentioned in the JD. Do NOT fabricate fake experience, but reframe real experience with strong action verbs.
3. "skills": Reorder skills to place skills matching the JD first.
4. Output JSON schema:
{
  "summary": "...",
  "work_experience": [
    {
      "title": "...",
      "company": "...",
      "location": "...",
      "start_date": "...",
      "end_date": "...",
      "bullets": ["...", "..."]
    }
  ],
  "skills": ["..."]
}

Output ONLY valid JSON. No markdown backticks or extra text outside JSON."""

TAILOR_PROMPT_USER = """CANDIDATE PROFILE:
{profile_json}

TARGET JOB DESCRIPTION:
{job_description}
"""


def _load_latex_template() -> str:
    """Load template.tex from latex/ directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    template_path = os.path.join(base_dir, "latex", "template.tex")
    if not os.path.exists(template_path):
        # Fallback template
        root_dir = os.path.dirname(base_dir)
        template_path = os.path.join(root_dir, "latex", "template.tex")

    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()


def build_tailored_cv(profile: StructuredProfile, job_description: str, custom_api_key: Optional[str] = None) -> Tuple[str, str]:
    """
    Tailor profile using LLM, then build:
    1. tex_source string
    2. html_preview string
    """
    profile_json_str = json.dumps(profile.model_dump(), ensure_ascii=False)
    user_prompt = TAILOR_PROMPT_USER.format(
        profile_json=profile_json_str,
        job_description=job_description.strip()
    )

    # 1. Call LLM for tailored content
    try:
        tailored_data = call_groq_json(system_prompt=TAILOR_PROMPT_SYSTEM, user_prompt=user_prompt, temperature=0.2, custom_api_key=custom_api_key)
    except Exception as exc:
        logger.warning(f"Tailoring failed, falling back to raw profile: {exc}")
        tailored_data = {}

    summary_text = str(tailored_data.get("summary") or profile.summary or "")
    tailored_skills = tailored_data.get("skills") if isinstance(tailored_data.get("skills"), list) else profile.skills

    # 2. Build LaTeX Sections
    name_escaped = escape_latex(profile.name or "Candidate Name")

    contact_parts = []
    if profile.contact.email:
        contact_parts.append(escape_latex(profile.contact.email))
    if profile.contact.phone:
        contact_parts.append(escape_latex(profile.contact.phone))
    if profile.contact.location:
        contact_parts.append(escape_latex(profile.contact.location))
    if profile.contact.linkedin:
        link = escape_latex(profile.contact.linkedin)
        contact_parts.append(f"\\href{{{profile.contact.linkedin}}}{{LinkedIn}}")
    if profile.contact.github:
        contact_parts.append(f"\\href{{{profile.contact.github}}}{{GitHub}}")

    contact_line = " \\,$\\cdot$\\, ".join(contact_parts) if contact_parts else ""

    summary_escaped = escape_latex(summary_text)

    # Work Experience LaTeX
    work_blocks = []
    work_list = tailored_data.get("work_experience") if isinstance(tailored_data.get("work_experience"), list) else profile.work_experience
    for exp in work_list:
        if isinstance(exp, dict):
            title = escape_latex(exp.get("title", ""))
            company = escape_latex(exp.get("company", ""))
            loc = escape_latex(exp.get("location", ""))
            s_date = escape_latex(exp.get("start_date", ""))
            e_date = escape_latex(exp.get("end_date", "Present" if exp.get("is_current") else ""))
            bullets = exp.get("bullets", [])
        else:
            title = escape_latex(exp.title)
            company = escape_latex(exp.company)
            loc = escape_latex(exp.location)
            s_date = escape_latex(exp.start_date)
            e_date = escape_latex("Present" if exp.is_current else exp.end_date)
            bullets = exp.bullets

        date_str = f"{s_date} -- {e_date}" if s_date and e_date else s_date or e_date

        block = f"\\noindent \\textbf{{{title}}} \\hfill {{\\color{{secondary}} {date_str}}}\\\\"
        block += f"\\textit{{{company}}} \\hfill {{\\color{{secondary}} {loc}}}\n"

        if bullets:
            block += "\\begin{itemize}\n"
            for b in bullets:
                block += f"  \\item {escape_latex(str(b))}\n"
            block += "\\end{itemize}\n"
        block += "\\vspace{4pt}"
        work_blocks.append(block)

    work_exp_latex = "\n\n".join(work_blocks)

    # Education LaTeX
    edu_blocks = []
    for edu in profile.education:
        degree = escape_latex(edu.degree)
        inst = escape_latex(edu.institution)
        loc = escape_latex(edu.location)
        s_date = escape_latex(edu.start_date)
        e_date = escape_latex(edu.end_date)
        date_str = f"{s_date} -- {e_date}" if s_date and e_date else s_date or e_date

        block = f"\\noindent \\textbf{{{degree}}} \\hfill {{\\color{{secondary}} {date_str}}}\\\\"
        block += f"\\textit{{{inst}}} \\hfill {{\\color{{secondary}} {loc}}}\n\\vspace{{3pt}}"
        edu_blocks.append(block)

    edu_latex = "\n\n".join(edu_blocks)

    # Projects LaTeX
    proj_blocks = []
    for proj in profile.projects:
        p_name = escape_latex(proj.name)
        p_desc = escape_latex(proj.description)
        p_tech = ", ".join([escape_latex(t) for t in proj.technologies])
        tech_str = f" \\textit{{(Tech: {p_tech})}}" if p_tech else ""

        block = f"\\noindent \\textbf{{{p_name}}}{tech_str}\\\\"
        block += f"{p_desc}\n\\vspace{{3pt}}"
        proj_blocks.append(block)

    proj_latex = "\n\n".join(proj_blocks)

    skills_str = ", ".join([escape_latex(str(s)) for s in tailored_skills])
    certs_str = ", ".join([escape_latex(str(c)) for c in profile.certifications])
    langs_str = ", ".join([escape_latex(str(l)) for l in profile.languages])

    # 3. Replace in Template
    template_str = _load_latex_template()
    tex_source = template_str.replace("__NAME__", name_escaped)
    tex_source = tex_source.replace("__CONTACT_LINE__", contact_line)
    tex_source = tex_source.replace("__SUMMARY__", summary_escaped)
    tex_source = tex_source.replace("__WORK_EXPERIENCE__", work_exp_latex)
    tex_source = tex_source.replace("__EDUCATION__", edu_latex)
    tex_source = tex_source.replace("__PROJECTS__", proj_latex)
    tex_source = tex_source.replace("__SKILLS__", skills_str)
    tex_source = tex_source.replace("__CERTIFICATIONS__", certs_str)
    tex_source = tex_source.replace("__LANGUAGES__", langs_str)

    # 4. Build Parallel HTML Preview String
    html_preview = f"""
<div class="cv-preview-page">
  <div class="cv-header">
    <h1 className="cv-name">{profile.name}</h1>
    <div class="cv-contact">
      {" · ".join([c for c in [profile.contact.email, profile.contact.phone, profile.contact.location] if c])}
    </div>
  </div>
  
  <div class="cv-section">
    <h2 class="cv-section-title">PROFESSIONAL SUMMARY</h2>
    <p class="cv-text">{summary_text}</p>
  </div>

  <div class="cv-section">
    <h2 class="cv-section-title">WORK EXPERIENCE</h2>
    {''.join([f'''
    <div class="cv-item">
      <div class="cv-item-header">
        <strong>{exp.get("title", "") if isinstance(exp, dict) else exp.title}</strong>
        <span class="cv-date">{exp.get("start_date", "") if isinstance(exp, dict) else exp.start_date} - {exp.get("end_date", "") if isinstance(exp, dict) else exp.end_date}</span>
      </div>
      <div class="cv-company">{exp.get("company", "") if isinstance(exp, dict) else exp.company}</div>
      <ul class="cv-bullets">
        {''.join([f'<li>{b}</li>' for b in (exp.get("bullets", []) if isinstance(exp, dict) else exp.bullets)])}
      </ul>
    </div>
    ''' for exp in (work_list or [])])}
  </div>

  <div class="cv-section">
    <h2 class="cv-section-title">SKILLS & QUALIFICATIONS</h2>
    <p class="cv-text"><strong>Technical Skills:</strong> {', '.join([str(s) for s in tailored_skills])}</p>
    <p class="cv-text"><strong>Certifications:</strong> {', '.join([str(c) for c in profile.certifications])}</p>
  </div>
</div>
"""

    return tex_source, html_preview
