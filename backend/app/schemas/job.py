from datetime import datetime
from pydantic import BaseModel


class JobResponse(BaseModel):
    id: str
    platform: str
    url: str
    title: str
    company_name: str
    company_size: str
    company_industry: str
    location_city: str
    location_district: str
    salary_min: int
    salary_max: int
    education_require: str
    experience_require: str
    job_type: str
    description: str
    skills_required: list[str]
    benefits: list[str]
    posted_date: str

    model_config = {"from_attributes": True}


class JobSearchParams(BaseModel):
    keyword: str = ""
    city: str = ""
    salary_min: int | None = None
    salary_max: int | None = None
    education: str = ""
    experience: str = ""
    page: int = 1
    page_size: int = 20


class JobListResponse(BaseModel):
    items: list[JobResponse]
    total: int
    page: int
    page_size: int
