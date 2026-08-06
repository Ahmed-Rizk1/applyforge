import logging
import re
from app.models.generate import ChatRequest, ChatResponse
from app.prompts.chat_copilot import build_chat_copilot_system_prompt
from app.services.llm import call_groq_chat

logger = logging.getLogger(__name__)


def strip_markdown_form_artifacts(text: str) -> str:
    """Strip markdown headers (#), bold (**), and section markers so text is 100% plain text ready for application forms."""
    if not text:
        return ""
    # Remove # at start of lines: ### Header Title -> Header Title
    text = re.sub(r'^[ \t]*#+[ \t]*', '', text, flags=re.MULTILINE)
    # Remove bold asterisks: **word** -> word
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    # Remove italic asterisks: *word* -> word
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    # Clean up excess consecutive line breaks
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


from typing import Optional

def generate_chat_reply(request: ChatRequest, custom_api_key: Optional[str] = None) -> ChatResponse:
    system_prompt = build_chat_copilot_system_prompt(
        profile=request.profile,
        job_description=request.job_description,
        detail_level=request.detail_level,
        tone_mode=request.tone_mode
    )

    formatted_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    ]

    reply_text = call_groq_chat(
        system_prompt=system_prompt,
        messages=formatted_messages,
        temperature=0.4,
        custom_api_key=custom_api_key
    )

    clean_reply = strip_markdown_form_artifacts(reply_text)
    return ChatResponse(reply=clean_reply)
