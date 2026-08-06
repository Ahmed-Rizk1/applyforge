import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError
from app.models.profile import StructuredProfile, ContactInfo, WorkExperience, Education, Project
from app.prompts.profile_extraction import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.services.llm import call_groq_json

logger = logging.getLogger(__name__)


def _sanitize_dict(data: Any) -> Any:
    """Recursively replace None with empty strings in dicts, except for lists."""
    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            if v is None:
                cleaned[k] = ""
            else:
                cleaned[k] = _sanitize_dict(v)
        return cleaned
    elif isinstance(data, list):
        return [_sanitize_dict(item) for item in data if item is not None]
    return data


def parse_raw_text_to_profile(raw_text: str, custom_api_key: Optional[str] = None) -> StructuredProfile:
    """Send raw CV text to Groq LLM and return a validated Pydantic StructuredProfile."""
    user_prompt = USER_PROMPT_TEMPLATE.format(raw_text=raw_text)
    
    raw_json = call_groq_json(system_prompt=SYSTEM_PROMPT, user_prompt=user_prompt, temperature=0.1, custom_api_key=custom_api_key)
    
    # Pre-sanitize json dictionary
    json_data = _sanitize_dict(raw_json)
    
    # Top-level fallback for contact details if LLM returned them at top level instead of in contact dict
    contact_data = json_data.get("contact", {})
    if not isinstance(contact_data, dict):
        contact_data = {}
    
    if not contact_data.get("email") and json_data.get("email"):
        contact_data["email"] = json_data.get("email")
    if not contact_data.get("phone") and json_data.get("phone"):
        contact_data["phone"] = json_data.get("phone")
    if not contact_data.get("location") and json_data.get("location"):
        contact_data["location"] = json_data.get("location")
    if not contact_data.get("linkedin") and json_data.get("linkedin"):
        contact_data["linkedin"] = json_data.get("linkedin")
    if not contact_data.get("github") and json_data.get("github"):
        contact_data["github"] = json_data.get("github")
        
    json_data["contact"] = contact_data

    try:
        profile = StructuredProfile.model_validate(json_data)
        
        # Cross-populate name between profile root and contact info
        if profile.name and not profile.contact.name:
            profile.contact.name = profile.name
        elif profile.contact.name and not profile.name:
            profile.name = profile.contact.name
            
        return profile
    except ValidationError as ve:
        logger.error(f"Pydantic schema validation error on profile output: {ve}")
        
        # Partial graceful extraction for work experience, education, projects
        parsed_work = []
        for exp in json_data.get("work_experience", []):
            if isinstance(exp, dict):
                try:
                    parsed_work.append(WorkExperience.model_validate(exp))
                except Exception:
                    pass

        parsed_edu = []
        for edu in json_data.get("education", []):
            if isinstance(edu, dict):
                try:
                    parsed_edu.append(Education.model_validate(edu))
                except Exception:
                    pass

        parsed_proj = []
        for proj in json_data.get("projects", []):
            if isinstance(proj, dict):
                try:
                    parsed_proj.append(Project.model_validate(proj))
                except Exception:
                    pass

        try:
            parsed_contact = ContactInfo.model_validate(contact_data)
        except Exception:
            parsed_contact = ContactInfo(
                name=str(json_data.get("name", "")),
                email=str(contact_data.get("email", "")),
                phone=str(contact_data.get("phone", "")),
                location=str(contact_data.get("location", "")),
                linkedin=str(contact_data.get("linkedin", "")),
                github=str(contact_data.get("github", "")),
            )

        skills_raw = json_data.get("skills", [])
        if isinstance(skills_raw, dict):
            skills_flat = []
            for v in skills_raw.values():
                if isinstance(v, list):
                    skills_flat.extend([str(i) for i in v])
                elif isinstance(v, str):
                    skills_flat.extend([i.strip() for i in v.split(",")])
            skills_raw = skills_flat
        elif not isinstance(skills_raw, list):
            skills_raw = []

        return StructuredProfile(
            name=str(json_data.get("name", parsed_contact.name)),
            contact=parsed_contact,
            summary=str(json_data.get("summary", "")),
            work_experience=parsed_work,
            education=parsed_edu,
            projects=parsed_proj,
            skills=[str(s) for s in skills_raw if s],
            certifications=[str(c) for c in json_data.get("certifications", []) if isinstance(c, str)],
            languages=[str(l) for l in json_data.get("languages", []) if isinstance(l, str)]
        )
