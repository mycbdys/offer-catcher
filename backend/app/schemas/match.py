from datetime import datetime
from pydantic import BaseModel


class MatchRequest(BaseModel):
    resume_id: str


class MatchResultItem(BaseModel):
    id: str
    job_id: str
    total_score: float
    hard_filter_score: float
    skill_match_score: float
    semantic_score: float
    optimization: str
    is_favorited: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MatchResultDetail(MatchResultItem):
    match_detail: dict
    job: dict
    resume: dict


class MatchSessionResponse(BaseModel):
    session_id: str
    status: str  # processing, completed, failed
    total_matches: int = 0
    results: list[MatchResultItem] = []
