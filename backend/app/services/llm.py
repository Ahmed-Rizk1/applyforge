import json
import logging
from typing import Any, Dict
from fastapi import HTTPException
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)


def get_groq_client() -> Groq:
    """Return a configured Groq client or raise an HTTPException if API key is missing."""
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the backend server. Please add it to your .env file."
        )
    return Groq(api_key=settings.groq_api_key)


def call_groq_json(system_prompt: str, user_prompt: str, temperature: float = 0.1) -> Dict[str, Any]:
    """Call Groq API requesting JSON response format."""
    client = get_groq_client()
    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        return json.loads(content)
    except json.JSONDecodeError as err:
        logger.error(f"Failed to decode JSON from LLM: {err}")
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON structure.") from err
    except Exception as exc:
        logger.error(f"Groq API error: {exc}")
        # Provide helpful error if key is invalid
        raise HTTPException(status_code=502, detail=f"LLM Provider Error: {str(exc)}") from exc
