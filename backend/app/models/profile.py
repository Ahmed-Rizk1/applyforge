from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


class ContactInfo(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""
    location: str = ""
    website: str = ""

    @field_validator("name", "email", "phone", "linkedin", "github", "location", "website", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)


class WorkExperience(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    is_current: bool = False
    bullets: List[str] = Field(default_factory=list)

    @field_validator("title", "company", "location", "start_date", "end_date", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)

    @field_validator("is_current", mode="before")
    @classmethod
    def coerce_bool(cls, v: Any) -> bool:
        if v is None:
            return False
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "present")
        return bool(v)

    @field_validator("bullets", mode="before")
    @classmethod
    def coerce_list(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [line.strip("-• ").strip() for line in v.split("\n") if line.strip()]
        if isinstance(v, list):
            res = []
            for item in v:
                if isinstance(item, dict):
                    res.append(str(next(iter(item.values()), "")))
                elif item is not None:
                    res.append(str(item))
            return res
        return []


class Education(BaseModel):
    degree: str = ""
    institution: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""

    @field_validator("degree", "institution", "location", "start_date", "end_date", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)


class Project(BaseModel):
    name: str = ""
    description: str = ""
    technologies: List[str] = Field(default_factory=list)
    link: str = ""

    @field_validator("name", "description", "link", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)

    @field_validator("technologies", mode="before")
    @classmethod
    def coerce_list(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        if isinstance(v, list):
            return [str(t) for t in v if t is not None]
        return []


class StructuredProfile(BaseModel):
    name: str = ""
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: str = ""
    work_experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)

    @field_validator("name", "summary", mode="before")
    @classmethod
    def coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)

    @field_validator("skills", "certifications", "languages", mode="before")
    @classmethod
    def coerce_tag_lists(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, dict):
            flat = []
            for val in v.values():
                if isinstance(val, list):
                    flat.extend([str(item) for item in val if item])
                elif isinstance(val, str):
                    flat.extend([item.strip() for item in val.split(",") if item.strip()])
            return flat
        if isinstance(v, list):
            return [str(item) for item in v if item is not None]
        return []

    @field_validator("work_experience", "education", "projects", mode="before")
    @classmethod
    def coerce_item_lists(cls, v: Any) -> Any:
        if v is None:
            return []
        return v


class ParseProfileRequest(BaseModel):
    raw_text: str
