import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Boolean, Integer, Float, Text, JSON, LargeBinary, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.sqlite import BLOB
from sqlalchemy.orm import relationship

from app.db import Base


def gen_uuid():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(100), default="")
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    match_results = relationship("MatchResult", back_populates="user", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(500), default="")
    raw_text = Column(Text, default="")
    parsed_data = Column(JSON, default=dict)
    skills = Column(JSON, default=list)
    embedding = Column(LargeBinary, nullable=True)
    job_preferences = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    user = relationship("User", back_populates="resumes")
    match_results = relationship("MatchResult", back_populates="resume", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    platform = Column(String(50), nullable=False)
    platform_job_id = Column(String(100), nullable=False)
    url = Column(Text, default="")
    title = Column(String(300), nullable=False)
    company_name = Column(String(300), nullable=False)
    company_size = Column(String(50), default="")
    company_industry = Column(String(100), default="")
    location_city = Column(String(50), default="")
    location_district = Column(String(50), default="")
    salary_min = Column(Integer, default=0)
    salary_max = Column(Integer, default=0)
    education_require = Column(String(50), default="")
    experience_require = Column(String(50), default="")
    job_type = Column(String(50), default="全职")
    description = Column(Text, default="")
    skills_required = Column(JSON, default=list)
    benefits = Column(JSON, default=list)
    posted_date = Column(String(20), default="")
    is_active = Column(Boolean, default=True)
    scraped_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    __table_args__ = (UniqueConstraint("platform", "platform_job_id", name="uq_platform_job"),)


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    total_score = Column(Float, default=0.0)
    hard_filter_score = Column(Float, default=0.0)
    skill_match_score = Column(Float, default=0.0)
    semantic_score = Column(Float, default=0.0)
    match_detail = Column(JSON, default=dict)
    optimization = Column(Text, default="")
    is_viewed = Column(Boolean, default=False)
    is_favorited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)

    user = relationship("User", back_populates="match_results")
    resume = relationship("Resume", back_populates="match_results")
    job = relationship("Job")


class ScrapingLog(Base):
    __tablename__ = "scraping_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    platform = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default="running")
    jobs_scraped = Column(Integer, default=0)
    jobs_new = Column(Integer, default=0)
    jobs_updated = Column(Integer, default=0)
    error_message = Column(Text, default="")
    started_at = Column(DateTime, default=now)
    finished_at = Column(DateTime, nullable=True)
