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


def call_groq_chat(system_prompt: str, messages: list, temperature: float = 0.4) -> str:
    """Call Groq API with system prompt and list of chat messages, returning raw text reply."""
    client = get_groq_client()
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content.strip():
            formatted_messages.append({"role": role, "content": content.strip()})

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=formatted_messages,
            temperature=temperature,
        )
        reply = response.choices[0].message.content or ""
        return reply.strip()
    except Exception as exc:
        logger.error(f"Groq Chat API error: {exc}")
        raise HTTPException(status_code=502, detail=f"LLM Provider Error: {str(exc)}") from exc

