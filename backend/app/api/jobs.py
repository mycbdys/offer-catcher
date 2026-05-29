from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.db.models import Job
from app.schemas.job import JobResponse, JobListResponse

router = APIRouter()


@router.get("", response_model=JobListResponse)
async def search_jobs(
    keyword: str = Query(default=""),
    city: str = Query(default=""),
    salary_min: int | None = Query(default=None),
    salary_max: int | None = Query(default=None),
    education: str = Query(default=""),
    experience: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Job).where(Job.is_active == True)
    count_query = select(func.count(Job.id)).where(Job.is_active == True)

    if keyword:
        query = query.where(Job.title.contains(keyword) | Job.description.contains(keyword))
        count_query = count_query.where(Job.title.contains(keyword) | Job.description.contains(keyword))
    if city:
        query = query.where(Job.location_city.contains(city))
        count_query = count_query.where(Job.location_city.contains(city))
    if salary_min is not None:
        query = query.where(Job.salary_max >= salary_min)
        count_query = count_query.where(Job.salary_max >= salary_min)
    if salary_max is not None:
        query = query.where(Job.salary_min <= salary_max)
        count_query = count_query.where(Job.salary_min <= salary_max)
    if education:
        query = query.where(Job.education_require == education)
        count_query = count_query.where(Job.education_require == education)
    if experience:
        query = query.where(Job.experience_require == experience)
        count_query = count_query.where(Job.experience_require == experience)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(query.order_by(Job.scraped_at.desc()).offset(offset).limit(page_size))
    jobs = result.scalars().all()

    return JobListResponse(
        items=[JobResponse.model_validate(j) for j in jobs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse.model_validate(job)
