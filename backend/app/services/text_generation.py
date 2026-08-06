import json
import logging
from typing import Any, Dict
from app.models.profile import StructuredProfile
from app.models.generate import TextContentResponse, InterviewQuestionsResponse
from app.services.llm import call_groq_json

from app.prompts.cover_letter import SYSTEM_PROMPT as CL_SYS, USER_PROMPT_TEMPLATE as CL_USER
from app.prompts.outreach_email import SYSTEM_PROMPT as EMAIL_SYS, USER_PROMPT_TEMPLATE as EMAIL_USER
from app.prompts.linkedin_dm import SYSTEM_PROMPT as DM_SYS, USER_PROMPT_TEMPLATE as DM_USER
from app.prompts.interview_questions import SYSTEM_PROMPT as IQ_SYS, USER_PROMPT_TEMPLATE as IQ_USER

logger = logging.getLogger(__name__)


def generate_cover_letter(profile: StructuredProfile, job_description: str) -> TextContentResponse:
    profile_json_str = json.dumps(profile.model_dump(), ensure_ascii=False)
    user_prompt = CL_USER.format(profile_json=profile_json_str, job_description=job_description.strip())
    raw_json = call_groq_json(system_prompt=CL_SYS, user_prompt=user_prompt, temperature=0.3)
    return TextContentResponse(content=str(raw_json.get("content", "")))


def generate_outreach_email(profile: StructuredProfile, job_description: str) -> TextContentResponse:
    profile_json_str = json.dumps(profile.model_dump(), ensure_ascii=False)
    user_prompt = EMAIL_USER.format(profile_json=profile_json_str, job_description=job_description.strip())
    raw_json = call_groq_json(system_prompt=EMAIL_SYS, user_prompt=user_prompt, temperature=0.3)
    return TextContentResponse(content=str(raw_json.get("content", "")))


def generate_linkedin_dm(profile: StructuredProfile, job_description: str, extras: Dict[str, Any] = None) -> TextContentResponse:
    profile_json_str = json.dumps(profile.model_dump(), ensure_ascii=False)
    recruiter_context = ""
    if extras and isinstance(extras, dict):
        recruiter_context = str(extras.get("recruiter_context", "") or extras.get("context", "")).strip()

    context_str = recruiter_context if recruiter_context else "None provided."
    user_prompt = DM_USER.format(
        profile_json=profile_json_str,
        job_description=job_description.strip(),
        recruiter_context=context_str
    )
    raw_json = call_groq_json(system_prompt=DM_SYS, user_prompt=user_prompt, temperature=0.3)
    return TextContentResponse(content=str(raw_json.get("content", "")))


def generate_interview_questions(profile: StructuredProfile, job_description: str) -> InterviewQuestionsResponse:
    profile_json_str = json.dumps(profile.model_dump(), ensure_ascii=False)
    user_prompt = IQ_USER.format(profile_json=profile_json_str, job_description=job_description.strip())
    raw_json = call_groq_json(system_prompt=IQ_SYS, user_prompt=user_prompt, temperature=0.3)
    return InterviewQuestionsResponse.model_validate(raw_json)
