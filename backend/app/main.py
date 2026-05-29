from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.api import auth, resumes, jobs, matches, autocomplete


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Offer Catcher API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(resumes.router, prefix="/api/resumes", tags=["resumes"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(autocomplete.router, prefix="/api/autocomplete", tags=["autocomplete"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
