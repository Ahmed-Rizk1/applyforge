from fastapi import APIRouter, HTTPException
from app.models.profile import ParseProfileRequest, StructuredProfile
from app.services.profile_parser import parse_raw_text_to_profile

router = APIRouter()


@router.post("/parse-profile", response_model=StructuredProfile)
async def parse_profile(request: ParseProfileRequest) -> StructuredProfile:
    """Parse raw CV text into a structured JSON profile using Groq LLM.
    
    Validates input and returns a structured candidate profile.
    """
    raw_text = request.raw_text.strip()
    if not raw_text:
        raise HTTPException(
            status_code=400,
            detail="Raw text cannot be empty. Please upload a valid PDF CV first."
        )

    try:
        profile = parse_raw_text_to_profile(raw_text)
        return profile
    except HTTPException:
        # Re-raise HTTPExceptions from llm service directly
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while parsing profile: {str(exc)}"
        ) from exc
