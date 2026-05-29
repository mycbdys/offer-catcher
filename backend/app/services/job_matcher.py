"""Strict matching pipeline with differentiated scoring."""

import json
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Resume, Job, MatchResult
from app.schemas.match import MatchResultItem

# ──── Score weights ────
W_HARD = 0.20      # Hard requirements (city, edu, exp)
W_SKILL = 0.40     # Skill match (keyword overlap + quality)
W_SEMANTIC = 0.20  # Semantic / text similarity
W_DETAIL = 0.20    # Detailed match (internships, projects, school tier)

# ──── Constants ────
EDUCATION_RANK = {"大专": 1, "本科": 2, "硕士": 3, "博士": 4, "学历不限": 0, "不限": 0, "": 0}

EXPERIENCE_YEARS = {
    "应届生": (0, 0.5), "在校/应届": (0, 0.5), "1年以内": (0, 1),
    "1-3年": (1, 3), "3-5年": (3, 5), "5-10年": (5, 10),
    "经验不限": (0, 99), "不限": (0, 99), "": (0, 99),
}

SCHOOL_TIER_SCORE = {"985": 100, "211": 85, "双一流": 80, "双非": 60, "": 50}

# Skill importance keywords (these are "core" skills that matter more)
CORE_SKILL_WEIGHTS = {
    "python": 1.0, "java": 1.0, "c++": 0.9, "go": 0.9, "javascript": 0.8,
    "typescript": 0.8, "react": 0.8, "vue": 0.8, "sql": 0.9,
    "mysql": 0.8, "redis": 0.8, "docker": 0.7, "kubernetes": 0.7,
    "机器学习": 0.9, "深度学习": 0.9, "nlp": 0.9, "数据分析": 0.8,
    "spring": 0.8, "django": 0.7, "fastapi": 0.7, "linux": 0.6,
    "git": 0.5, "aws": 0.7, "azure": 0.7, "pytorch": 0.9,
    "tensorflow": 0.9, "node.js": 0.7, "微服务": 0.8,
}


async def match_resume_to_jobs(
    db: AsyncSession, resume_id: str, user_id: str,
    session_id: str, session_store: dict,
):
    """5-stage strict matching pipeline."""
    from app.services.resume_parser import parse_resume_with_llm
    from app.services.deep_matcher import deep_match_resume_to_job, generate_optimization
    from app.services.school_data import UNIVERSITIES

    # Init session
    if session_id not in session_store:
        session_store[session_id] = {}
    session_store[session_id]["status"] = "processing"

    # Get resume
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        session_store[session_id]["status"] = "failed"
        session_store[session_id]["error"] = "Resume not found"
        return

    # Stage 1: Parse
    if not resume.parsed_data or not resume.skills:
        try:
            parsed = await parse_resume_with_llm(resume.raw_text)
            resume.parsed_data = parsed
            resume.skills = parsed.get("skills", [])
            prefs = parsed.get("preferences", {})
            resume.job_preferences = {
                "city": prefs.get("expected_city", ""),
                "positions": prefs.get("expected_positions", []),
                "salary_min": prefs.get("expected_salary_min", 0),
                "salary_max": prefs.get("expected_salary_max", 0),
                "industry": prefs.get("expected_industry", ""),
                "job_type": prefs.get("job_type", "全职"),
            }
            await db.commit()
            await db.refresh(resume)
        except Exception as e:
            session_store[session_id]["status"] = "failed"
            session_store[session_id]["error"] = f"Parse failed: {e}"
            return

    # ──── Extract resume info ────
    prefs = resume.job_preferences or {}
    parsed = resume.parsed_data or {}
    resume_skills_raw = resume.skills or []
    resume_skills_lower = [s.lower() for s in resume_skills_raw]
    expected_city = prefs.get("city", "")
    expected_salary_min = prefs.get("salary_min", 0) or 0
    expected_salary_max = prefs.get("salary_max", 0) or 0

    # Education
    edu_list = parsed.get("education", [])
    resume_degree = edu_list[0].get("degree", "") if edu_list else ""
    resume_school = edu_list[0].get("school", "") if edu_list else ""
    resume_major = edu_list[0].get("major", "") if edu_list else ""
    resume_edu_rank = EDUCATION_RANK.get(resume_degree, 0)

    # School tier
    resume_school_tier = ""
    for u in UNIVERSITIES:
        if u["name"] == resume_school:
            resume_school_tier = u["tier"]
            break

    # Internships & projects
    internships = parsed.get("internships", [])
    projects = parsed.get("projects", [])

    # ──── Stage 2: Score every job ────
    all_jobs_result = await db.execute(select(Job).where(Job.is_active == True))
    all_jobs = all_jobs_result.scalars().all()

    # Delete old match results
    await db.execute(delete(MatchResult).where(MatchResult.resume_id == resume_id))
    await db.commit()

    scored_jobs = []
    for job in all_jobs:
        hard_score = _calc_hard_filter(job, expected_city, expected_salary_min, expected_salary_max,
                                       resume_edu_rank, resume_degree)
        skill_score = _calc_skill_match(job, resume_skills_lower, resume_skills_raw)
        detail_score = _calc_detail_match(job, resume_school_tier, resume_major, internships, projects)

        # Composite (before LLM)
        base_score = (hard_score * W_HARD + skill_score * W_SKILL + detail_score * W_DETAIL) / (W_HARD + W_SKILL + W_DETAIL)

        scored_jobs.append((job, base_score, hard_score, skill_score, detail_score))

    # Sort by base score, take top 25 for deep matching
    scored_jobs.sort(key=lambda x: x[1], reverse=True)
    top_candidates = scored_jobs[:25]

    # ──── Stage 3: Semantic / Text similarity ────
    for i, (job, base, hard, skill, detail) in enumerate(top_candidates):
        semantic = _calc_semantic_similarity(resume_skills_raw, job)
        top_candidates[i] = (job, base, hard, skill, detail, semantic)

    # ──── Stage 4: Deep LLM matching + Final score ────
    resume_data = {"parsed_data": parsed, "skills": resume_skills_raw}
    results = []

    for idx, (job, base, hard, skill, detail, semantic) in enumerate(top_candidates):
        job_data = {
            "title": job.title, "company_name": job.company_name,
            "description": job.description, "skills_required": job.skills_required,
            "education_require": job.education_require,
            "experience_require": job.experience_require,
            "location_city": job.location_city,
        }

        # LLM deep match
        llm_result = await deep_match_resume_to_job(resume_data, job_data)
        llm_scores = llm_result.get("scores", {})
        llm_overall = llm_scores.get("overall_fit", 5) / 10.0  # Normalize to 0-1

        # Final weighted score
        final_score = (
            hard * 0.15 +
            skill * 0.35 +
            semantic * 0.15 +
            detail * 0.10 +
            llm_overall * 100 * 0.25
        )
        final_score = round(min(100, max(0, final_score)), 1)

        # Optimization for top 12
        optimization = ""
        if idx < 12:
            optimization = await generate_optimization(resume_data, job_data, llm_result)

        match_result = MatchResult(
            user_id=user_id, resume_id=resume_id, job_id=job.id,
            total_score=final_score,
            hard_filter_score=round(hard, 1),
            skill_match_score=round(skill, 1),
            semantic_score=round(semantic, 1),
            match_detail={
                "llm_analysis": llm_result,
                "base_score": round(base, 1),
                "detail_score": round(detail, 1),
                "hard_filter": {"city": expected_city, "edu_rank": resume_edu_rank},
            },
            optimization=optimization,
        )
        db.add(match_result)
        await db.commit()
        await db.refresh(match_result)
        results.append(MatchResultItem.model_validate(match_result).model_dump())

    # Sort final results by score descending
    results.sort(key=lambda r: r["total_score"], reverse=True)

    session_store[session_id]["status"] = "completed"
    session_store[session_id]["results"] = results
    session_store[session_id]["total_matches"] = len(results)


# ──── Scoring functions ────

def _calc_hard_filter(job, city: str, sal_min: int, sal_max: int,
                      resume_edu_rank: int, resume_degree: str) -> float:
    """Score hard requirements: city, education, experience, salary. Returns 0-100."""
    score = 0.0
    total = 0.0

    # City match (30 points)
    total += 30
    if not city or not job.location_city:
        score += 15  # neutral if unspecified
    elif city in job.location_city or job.location_city in city:
        score += 30  # exact match
    else:
        score += 0   # mismatch

    # Education match (25 points)
    total += 25
    job_edu = job.education_require
    if not job_edu or "不限" in job_edu or "学历不限" in job_edu:
        score += 20  # no requirement
    else:
        job_edu_rank = EDUCATION_RANK.get(job_edu, 0)
        if resume_edu_rank >= job_edu_rank:
            score += 25  # meets or exceeds
        elif resume_edu_rank == job_edu_rank - 1:
            score += 10  # one level below
        else:
            score += 0   # far below

    # Experience match (20 points)
    total += 20
    job_exp = job.experience_require
    if not job_exp or "不限" in job_exp or "经验不限" in job_exp:
        score += 15
    elif "应届" in job_exp or "在校" in job_exp:
        score += 20  # student positions match students
    else:
        score += 5   # requires experience, student unlikely to match

    # Salary overlap (25 points)
    total += 25
    if sal_max > 0 and job.salary_max > 0:
        overlap_min = max(sal_min, job.salary_min) if sal_min > 0 else job.salary_min
        overlap_max = min(sal_max, job.salary_max) if sal_max > 0 else job.salary_max
        if overlap_max > overlap_min:
            overlap_pct = (overlap_max - overlap_min) / (job.salary_max - job.salary_min) if job.salary_max > job.salary_min else 0.5
            score += min(25, int(overlap_pct * 25))
        else:
            # No overlap - but if candidate's max is close to job's min, give partial
            gap = job.salary_min - sal_max if sal_max < job.salary_min else sal_min - job.salary_max
            if gap > 0 and gap < job.salary_min * 0.3:
                score += 10  # within 30% tolerance
            else:
                score += 0
    else:
        score += 12  # neutral

    return round(score / total * 100, 1)


def _calc_skill_match(job, resume_skills_lower: list[str], resume_skills_raw: list[str]) -> float:
    """Score skill overlap with weighted importance. Returns 0-100."""
    job_skills = job.skills_required or []
    if not job_skills:
        # Extract skills from title + description
        skill_keywords = [
            "python", "java", "c++", "go", "javascript", "typescript", "react", "vue",
            "sql", "mysql", "redis", "docker", "kubernetes", "linux", "git",
            "机器学习", "深度学习", "数据分析", "spring", "django",
        ]
        job_skills = [k for k in skill_keywords if k in job.title.lower() or k in (job.description or "").lower()]

    if not job_skills:
        return 50  # No skills to compare

    total_weight = 0
    matched_weight = 0
    matched_skills = []
    missing_skills = []

    for js in job_skills:
        js_lower = js.lower()
        weight = CORE_SKILL_WEIGHTS.get(js_lower, 0.6)
        total_weight += weight

        # Try exact match first, then partial
        matched = False
        for rs in resume_skills_lower:
            if js_lower == rs or js_lower in rs or rs in js_lower:
                matched_weight += weight
                matched_skills.append(js)
                matched = True
                break
        if not matched:
            missing_skills.append(js)

    if total_weight == 0:
        return 50

    skill_ratio = matched_weight / total_weight

    # Score: base 20 + up to 80 based on match ratio
    score = 20 + skill_ratio * 80

    # Penalty for missing core skills
    core_missing = [s for s in missing_skills if CORE_SKILL_WEIGHTS.get(s.lower(), 0.6) >= 0.8]
    if core_missing:
        score -= len(core_missing) * 8  # Heavy penalty for each missing core skill

    return round(max(0, min(100, score)), 1)


def _calc_semantic_similarity(resume_skills: list[str], job) -> float:
    """Calculate text-based semantic similarity. Returns 0-100."""
    score = 50.0
    job_text = (job.title + " " + (job.description or "")).lower()
    skill_hits = 0
    skill_total = len(resume_skills) if resume_skills else 1

    for skill in resume_skills:
        if skill.lower() in job_text:
            skill_hits += 1

    skill_density = skill_hits / skill_total
    score += skill_density * 40

    # Bonus for title keyword match
    title_lower = job.title.lower()
    for skill in resume_skills[:5]:  # Top 5 skills
        if skill.lower() in title_lower:
            score += 5

    return round(min(100, score), 1)


def _calc_detail_match(job, school_tier: str, major: str,
                       internships: list, projects: list) -> float:
    """Score detailed match: school tier, major relevance, experience quality. Returns 0-100."""
    score = 0.0
    total = 0.0

    # School tier (15)
    total += 15
    if school_tier:
        score += SCHOOL_TIER_SCORE.get(school_tier, 50) / 100 * 15

    # Major relevance (15)
    total += 15
    if major:
        job_text = (job.title + " " + (job.description or "")[:500]).lower()
        major_lower = major.lower()
        if major_lower in job_text or any(
            word in job_text for word in major_lower.replace("与", " ").replace("和", " ").split()
        ):
            score += 15  # Major directly mentioned
        elif "计算机" in major_lower or "软件" in major_lower:
            if any(t in job.title.lower() for t in ["开发", "工程师", "后端", "前端", "算法"]):
                score += 12  # CS-adjacent for tech roles
            else:
                score += 8
        else:
            score += 5  # Unrelated major

    # Internship quality (35)
    total += 35
    if internships:
        job_text = (job.title + job.company_name + (job.description or "")[:300]).lower()
        for intern in internships[:3]:
            company = intern.get("company", "").lower()
            position = intern.get("position", "").lower()
            desc = intern.get("description", "").lower()

            # Big company bonus
            big_companies = ["字节跳动", "阿里巴巴", "腾讯", "百度", "美团", "华为", "京东",
                           "网易", "快手", "小红书", "滴滴", "蚂蚁", "微软", "google"]
            if any(bc in company for bc in big_companies):
                score += 8
                break
            elif company:
                score += 4
                break

        # Position relevance
        for intern in internships[:2]:
            position = intern.get("position", "").lower()
            if position and any(w in job_text for w in position.split()):
                score += 5
                break

        # Description keyword overlap
        all_intern_text = " ".join(i.get("description", "") for i in internships).lower()
        job_keywords = set((job.title + " " + (job.description or "")[:500]).lower().split())
        intern_keywords = set(all_intern_text.split())
        overlap = len(job_keywords & intern_keywords) / max(len(job_keywords), 1)
        score += min(12, overlap * 30)
    else:
        score += 5  # No internship, give minimal

    # Projects (35)
    total += 35
    if projects:
        job_skills_lower = [s.lower() for s in (job.skills_required or [])]
        for proj in projects[:2]:
            proj_text = (proj.get("name", "") + " " + proj.get("description", "")).lower()
            # Tech stack match
            tech_hits = sum(1 for s in job_skills_lower if s in proj_text)
            if tech_hits >= 3:
                score += 15
            elif tech_hits >= 1:
                score += 8
            elif proj_text.strip():
                score += 3
    else:
        score += 3  # No projects

    return round(score / total * 100, 1)
