import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from groq import Groq

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Validation"])


class ValidateKeyRequest(BaseModel):
    api_key: str = Field(..., description="Groq API key string starting with gsk_")


class ValidateKeyResponse(BaseModel):
    valid: bool = True
    message: str = "Groq API key is valid."


@router.post("/validate-key", response_model=ValidateKeyResponse)
def validate_groq_key(payload: ValidateKeyRequest):
    """Validate a user-provided Groq API key against Groq servers."""
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(
            status_code=400,
            detail="API Key cannot be empty."
        )

    try:
        client = Groq(api_key=key)
        # Quick, lightweight API call to test key validity
        client.models.list()
        return ValidateKeyResponse(valid=True, message="Groq API key is valid.")
    except Exception as exc:
        logger.warning(f"Groq key validation failed: {exc}")
        raise HTTPException(
            status_code=400,
            detail="Invalid Groq API key. Please verify your key at console.groq.com."
        ) from exc
