from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from app.models.profile import StructuredProfile


class GenerateRequest(BaseModel):
    profile: StructuredProfile
    job_description: str
    extras: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator("job_description", mode="before")
    @classmethod
    def check_jd(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)


class MatchScoreResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    summary: str = ""

    @field_validator("score", mode="before")
    @classmethod
    def coerce_score(cls, v: Any) -> int:
        try:
            val = int(round(float(v)))
            return max(0, min(100, val))
        except (ValueError, TypeError):
            return 50

    @field_validator("matched_skills", "missing_skills", mode="before")
    @classmethod
    def coerce_string_list(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(item).strip() for item in v if item is not None and str(item).strip()]
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return []

    @field_validator("summary", mode="before")
    @classmethod
    def coerce_summary(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()


class TextContentResponse(BaseModel):
    content: str = ""

    @field_validator("content", mode="before")
    @classmethod
    def coerce_content(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()


class InterviewQuestionItem(BaseModel):
    question: str = ""
    reasoning: str = ""

    @field_validator("question", "reasoning", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()


class InterviewQuestionsResponse(BaseModel):
    questions: List[InterviewQuestionItem] = Field(default_factory=list)

    @field_validator("questions", mode="before")
    @classmethod
    def coerce_questions(cls, v: Any) -> List[InterviewQuestionItem]:
        if v is None:
            return []
        if isinstance(v, list):
            res = []
            for item in v:
                if isinstance(item, dict):
                    try:
                        res.append(InterviewQuestionItem.model_validate(item))
                    except Exception:
                        pass
                elif isinstance(item, str) and item.strip():
                    res.append(InterviewQuestionItem(question=item.strip(), reasoning="Relevant to your profile and job description."))
            return res[:6]
        return []


class TailoredCvResponse(BaseModel):
    html_preview: str = ""
    tex_source: str = ""


class CompilePdfRequest(BaseModel):
    tex_source: str

    @field_validator("tex_source", mode="before")
    @classmethod
    def check_tex(cls, v: Any) -> str:
        if not v or not str(v).strip():
            raise ValueError("tex_source cannot be empty")
        return str(v)


class SalarySource(BaseModel):
    title: str = ""
    url: str = ""
    snippet: str = ""

    @field_validator("title", "url", "snippet", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()


class SalaryEstimateResponse(BaseModel):
    range_low: int = 0
    range_high: int = 0
    currency: str = "USD"
    sources: List[SalarySource] = Field(default_factory=list)
    summary: str = ""

    @field_validator("range_low", "range_high", mode="before")
    @classmethod
    def coerce_int(cls, v: Any) -> int:
        try:
            val = int(round(float(str(v).replace(",", "").replace("$", "").replace("£", "").replace("€", ""))))
            return max(0, val)
        except (ValueError, TypeError):
            return 0

    @field_validator("currency", "summary", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()


class CoverLetterPdfRequest(BaseModel):
    content: str
    name: Optional[str] = "Candidate"
    contact: Optional[str] = ""

    @field_validator("content", mode="before")
    @classmethod
    def check_content(cls, v: Any) -> str:
        if not v or not str(v).strip():
            raise ValueError("Cover letter content cannot be empty")
        return str(v)


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

    @field_validator("role", "content", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()


class ChatRequest(BaseModel):
    profile: StructuredProfile
    job_description: str
    messages: List[ChatMessage] = Field(default_factory=list)
    detail_level: str = "standard"  # "concise", "standard", "detailed"
    tone_mode: str = "professional"  # "professional", "conversational", "enthusiastic_persuasive", "bold_impact", "star_storyteller"

    @field_validator("job_description", mode="before")
    @classmethod
    def check_jd(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)


class ChatResponse(BaseModel):
    reply: str = ""

    @field_validator("reply", mode="before")
    @classmethod
    def coerce_reply(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()




