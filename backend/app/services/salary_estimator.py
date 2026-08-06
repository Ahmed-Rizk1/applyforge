import json
import logging
from app.models.profile import StructuredProfile
from app.models.generate import SalaryEstimateResponse, SalarySource
from app.prompts.salary_estimate import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.services.tavily_search import search_tavily
from app.services.llm import call_groq_json

logger = logging.getLogger(__name__)


def _extract_search_target(job_description: str, profile: StructuredProfile) -> tuple[str, str]:
    """Extract target job title and location hint from job description or profile."""
    jd_lines = [line.strip() for line in job_description.splitlines() if line.strip()]
    first_line = jd_lines[0] if jd_lines else ""
    
    # Extract title from first line if concise
    candidate_title = first_line.split("-")[0].split("|")[0].split(":")[0].strip()
    if 3 <= len(candidate_title) <= 50:
        title = candidate_title
    else:
        title = profile.work_experience[0].title if profile.work_experience else "Software Engineer"

    # Search for location hints in JD text
    location = ""
    jd_lower = job_description[:800].lower()
    for loc in ["london", "uk", "united kingdom", "new york", "san francisco", "berlin", "germany", "dubai", "uae", "cairo", "egypt", "toronto", "canada", "remote", "us", "usa"]:
        if loc in jd_lower:
            location = loc.title()
            break
            
    if not location:
        location = profile.contact.location or "US"

    return title, location


from typing import Optional

logger = logging.getLogger(__name__)


def generate_salary_estimate(profile: StructuredProfile, job_description: str, custom_api_key: Optional[str] = None) -> SalaryEstimateResponse:
    """Extract job role & location from JD, fetch Tavily search grounding, and synthesize salary range via LLM."""
    profile_json_str = json.dumps(profile.model_dump(), ensure_ascii=False)
    
    title_hint, location_hint = _extract_search_target(job_description, profile)
    query = f"{title_hint} salary {location_hint} 2025"

    logger.info(f"Executing Tavily search query for salary estimation: '{query}'")
    search_results = search_tavily(query, max_results=4)
    logger.info(f"Tavily returned {len(search_results)} search results for query '{query}'")

    user_prompt = USER_PROMPT_TEMPLATE.format(
        profile_json=profile_json_str,
        job_description=job_description.strip(),
        search_results_json=json.dumps(search_results, ensure_ascii=False)
    )

    # Set temperature=0.0 for deterministic, non-fluctuating salary bounds
    raw_json = call_groq_json(system_prompt=SYSTEM_PROMPT, user_prompt=user_prompt, temperature=0.0, custom_api_key=custom_api_key)

    # Attach search sources if LLM omitted them
    if not raw_json.get("sources") and search_results:
        raw_json["sources"] = search_results

    try:
        return SalaryEstimateResponse.model_validate(raw_json)
    except Exception as exc:
        logger.error(f"Validation error on SalaryEstimateResponse: {exc}. Fallback construction.")
        sources = [SalarySource.model_validate(s) for s in search_results if isinstance(s, dict)]
        return SalaryEstimateResponse(
            range_low=int(raw_json.get("range_low", 80000)),
            range_high=int(raw_json.get("range_high", 110000)),
            currency=str(raw_json.get("currency", "USD")),
            sources=sources,
            summary=str(raw_json.get("summary", "Estimated market compensation benchmark."))
        )
