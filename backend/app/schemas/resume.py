from datetime import datetime
from pydantic import BaseModel


class ResumeCreate(BaseModel):
    raw_text: str
    file_name: str = ""


class ResumeUpdate(BaseModel):
    parsed_data: dict | None = None
    skills: list[str] | None = None
    job_preferences: dict | None = None


class ResumeResponse(BaseModel):
    id: str
    file_name: str
    raw_text: str
    parsed_data: dict
    skills: list[str]
    job_preferences: dict
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ParseStatusResponse(BaseModel):
    status: str  # parsing, completed, failed
    parsed_data: dict | None = None
    error: str | None = None
