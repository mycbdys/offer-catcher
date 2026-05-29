from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.db.models import MatchResult, Resume, Job
from app.api.deps import require_auth
from app.schemas.match import MatchRequest, MatchResultItem, MatchResultDetail, MatchSessionResponse

router = APIRouter()

# In-memory session store (MVP, replace with DB table for production)
match_sessions: dict[str, dict] = {}


@router.post("", response_model=dict)
async def start_matching(
    data: MatchRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    # Verify resume exists and belongs to user
    result = await db.execute(select(Resume).where(Resume.id == data.resume_id, Resume.user_id == user_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    session_id = data.resume_id  # Simple: one session per resume
    match_sessions[session_id] = {"status": "processing", "results": [], "total_matches": 0}

    background_tasks.add_task(_run_matching, session_id, data.resume_id, user_id)
    return {"session_id": session_id, "status": "processing"}


async def _run_matching(session_id: str, resume_id: str, user_id: str):
    """Background task: run the matching pipeline."""
    from app.db import async_session
    from app.services.job_matcher import match_resume_to_jobs

    try:
        async with async_session() as db:
            await match_resume_to_jobs(db, resume_id, user_id, session_id, match_sessions)
        match_sessions[session_id]["status"] = "completed"
    except Exception as e:
        match_sessions[session_id]["status"] = "failed"
        match_sessions[session_id]["error"] = str(e)


@router.get("/{session_id}", response_model=MatchSessionResponse)
async def get_match_status(
    session_id: str,
    user_id: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    session = match_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Match session not found")

    return MatchSessionResponse(
        session_id=session_id,
        status=session["status"],
        total_matches=session.get("total_matches", 0),
        results=session.get("results", []),
    )


@router.get("/{session_id}/results", response_model=list[MatchResultItem])
async def get_match_results(
    session_id: str,
    page: int = 1,
    page_size: int = 20,
    user_id: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MatchResult)
        .where(MatchResult.resume_id == session_id, MatchResult.user_id == user_id)
        .order_by(MatchResult.total_score.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    matches = result.scalars().all()
    return [MatchResultItem.model_validate(m) for m in matches]


@router.get("/result/{match_id}", response_model=MatchResultDetail)
async def get_match_detail(
    match_id: str,
    user_id: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MatchResult).where(MatchResult.id == match_id, MatchResult.user_id == user_id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match result not found")

    job_result = await db.execute(select(Job).where(Job.id == match.job_id))
    job = job_result.scalar_one_or_none()

    resume_result = await db.execute(select(Resume).where(Resume.id == match.resume_id))
    resume = resume_result.scalar_one_or_none()

    return MatchResultDetail(
        id=match.id,
        job_id=match.job_id,
        total_score=match.total_score,
        hard_filter_score=match.hard_filter_score,
        skill_match_score=match.skill_match_score,
        semantic_score=match.semantic_score,
        optimization=match.optimization,
        is_favorited=match.is_favorited,
        created_at=match.created_at,
        match_detail=match.match_detail,
        job={
            "title": job.title if job else "",
            "company_name": job.company_name if job else "",
            "location_city": job.location_city if job else "",
            "salary_min": job.salary_min if job else 0,
            "salary_max": job.salary_max if job else 0,
            "description": job.description if job else "",
            "skills_required": job.skills_required if job else [],
        },
        resume={
            "parsed_data": resume.parsed_data if resume else {},
            "skills": resume.skills if resume else [],
        },
    )


@router.post("/result/{match_id}/favorite")
async def toggle_favorite(
    match_id: str,
    user_id: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MatchResult).where(MatchResult.id == match_id, MatchResult.user_id == user_id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match result not found")

    match.is_favorited = not match.is_favorited
    await db.commit()
    return {"is_favorited": match.is_favorited}
