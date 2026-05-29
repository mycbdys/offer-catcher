"""Debug matching pipeline synchronously."""
import asyncio
import sys
sys.path.insert(0, "/Users/muyoucun/offer-catcher/backend")

from app.db import async_session, init_db
from app.db.models import Resume, Job
from sqlalchemy import select

async def debug():
    await init_db()

    async with async_session() as db:
        # Get first resume
        result = await db.execute(select(Resume).order_by(Resume.created_at.desc()).limit(1))
        resume = result.scalar_one_or_none()

        if not resume:
            print("No resume found!")
            return

        print(f"Resume: {resume.id[:8]}...")
        print(f"  raw_text: {resume.raw_text[:100]}...")
        print(f"  parsed_data: {resume.parsed_data}")
        print(f"  skills: {resume.skills}")
        print(f"  prefs: {resume.job_preferences}")

        # Get all jobs
        result2 = await db.execute(select(Job).where(Job.is_active == True))
        jobs = result2.scalars().all()
        print(f"\nTotal jobs: {len(jobs)}")

        # Run hard filter manually
        prefs = resume.job_preferences or {}
        expected_city = prefs.get("city", "")

        from app.services.job_matcher import EDUCATION_RANK

        resume_edu_rank = max(
            EDUCATION_RANK.get(e.get("degree", ""), 0)
            for e in resume.parsed_data.get("education", [{}])
        )
        print(f"  expected_city: '{expected_city}'")
        print(f"  resume_edu_rank: {resume_edu_rank}")

        candidates = []
        for job in jobs:
            score = 100.0

            # City filter
            if expected_city and job.location_city:
                if expected_city not in job.location_city and job.location_city not in expected_city:
                    if "全国" not in job.location_city:
                        score -= 30

            # Education filter
            job_edu = job.education_require
            if job_edu and "不限" not in job_edu and "学历不限" not in job_edu:
                job_edu_rank = EDUCATION_RANK.get(job_edu, 0)
                if resume_edu_rank < job_edu_rank:
                    score -= 20

            if score >= 40:
                candidates.append((job, score))
                print(f"  PASS: {job.title} @ {job.company_name} ({job.location_city}), score={score}, edu='{job_edu}'")
            else:
                print(f"  FAIL: {job.title} @ {job.company_name} ({job.location_city}), score={score}")

        print(f"\nCandidates: {len(candidates)}")

        # Run keyword matching
        if candidates:
            resume_skills = [s.lower() for s in resume.skills]
            print(f"Resume skills: {resume_skills}")

            for i, (job, score) in enumerate(candidates):
                job_skills = [s.lower() for s in job.skills_required]
                if job_skills:
                    overlap = len([s for s in resume_skills if any(js in s or s in js for js in job_skills)])
                    skill_ratio = overlap / len(job_skills)
                else:
                    overlap = sum(1 for s in resume_skills if s in job.description.lower())
                    skill_ratio = overlap / max(len(resume_skills), 1)

                new_score = score + skill_ratio * 40
                candidates[i] = (job, new_score)
                print(f"  KW: {job.title}, skills={job_skills}, overlap={overlap}, ratio={skill_ratio:.2f}, score={new_score:.1f}")

asyncio.run(debug())
