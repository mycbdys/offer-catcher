from app.api.auth import router as auth_router
from app.api.resumes import router as resumes_router
from app.api.jobs import router as jobs_router
from app.api.matches import router as matches_router

__all__ = ["auth", "resumes", "jobs", "matches"]
