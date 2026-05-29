"""Debug matching pipeline synchronously."""
import asyncio
import sys
sys.path.insert(0, "/Users/muyoucun/offer-catcher/backend")

from app.db import async_session, init_db
from app.db.models import Resume
from app.services.job_matcher import match_resume_to_jobs
from sqlalchemy import select

async def debug():
    await init_db()

    async with async_session() as db:
        result = await db.execute(select(Resume).order_by(Resume.created_at.desc()).limit(1))
        resume = result.scalar_one_or_none()
        if not resume:
            # Create test resume
            print("Creating test resume...")
            resume = Resume(
                user_id="c33ed930-0079-4f89-b17f-4a4526ef4bc5",  # test user from earlier
                raw_text="""张三 | 13800138000 | zhangsan@example.com

教育背景：
2019-2023 北京大学 计算机科学 本科

实习经历：
2022.06-2022.09 字节跳动 后端开发实习生
- 使用Python和Django开发内部管理系统
- 参与数据库查询优化，SQL性能提升30%

技能：Python, Java, SQL, Django, FastAPI, Redis, Git, Linux, Docker

期望城市：北京
期望薪资：15k-25k"""
            )
            db.add(resume)
            await db.commit()
            await db.refresh(resume)

        print(f"Resume ID: {resume.id}")
        print(f"Parsed data before: {resume.parsed_data}")
        print(f"Skills before: {resume.skills}")

        session_store = {}
        await match_resume_to_jobs(db, resume.id, resume.user_id, resume.id, session_store)

        print(f"\nSession: {session_store}")
        print(f"Status: {session_store.get(resume.id, {}).get('status')}")
        print(f"Total matches: {session_store.get(resume.id, {}).get('total_matches')}")

        # Check DB
        from app.db.models import MatchResult
        result2 = await db.execute(select(MatchResult).where(MatchResult.resume_id == resume.id))
        matches = result2.scalars().all()
        print(f"MatchResults in DB: {len(matches)}")
        for m in matches[:3]:
            print(f"  score={m.total_score}")

        # Re-read resume
        await db.refresh(resume)
        print(f"Parsed data after: keys={list(resume.parsed_data.keys()) if resume.parsed_data else 'empty'}")
        print(f"Skills after: {resume.skills}")

asyncio.run(debug())
