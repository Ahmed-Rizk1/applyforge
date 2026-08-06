import json
import logging
from app.models.profile import StructuredProfile
from app.models.generate import MatchScoreResponse
from app.prompts.match_score import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.services.llm import call_groq_json

logger = logging.getLogger(__name__)


def generate_match_score(profile: StructuredProfile, job_description: str) -> MatchScoreResponse:
    """Analyze profile against job description and generate match score metrics."""
    profile_json_str = json.dumps(profile.model_dump(), ensure_ascii=False)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        profile_json=profile_json_str,
        job_description=job_description.strip()
    )

    raw_json = call_groq_json(system_prompt=SYSTEM_PROMPT, user_prompt=user_prompt, temperature=0.1)

    try:
        return MatchScoreResponse.model_validate(raw_json)
    except Exception as exc:
        logger.error(f"Failed to validate MatchScoreResponse from raw JSON: {exc}. Raw response: {raw_json}")
        # Fallback parsing if model_validate fails
        return MatchScoreResponse(
            score=int(raw_json.get("score", 50)) if isinstance(raw_json.get("score"), (int, float, str)) else 50,
            matched_skills=raw_json.get("matched_skills", []),
            missing_skills=raw_json.get("missing_skills", []),
            summary=str(raw_json.get("summary", "Match evaluation completed."))
        )
