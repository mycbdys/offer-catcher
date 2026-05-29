"""Seed jobs from generated JSON or fallback to static list."""
import json
import asyncio
from pathlib import Path
from app.db import async_session, init_db
from app.db.models import Job

JSON_PATH = Path(__file__).parent / "jobs_data.json"


async def seed_from_json():
    await init_db()
    if not JSON_PATH.exists():
        print(f"Error: {JSON_PATH} not found. Run generate_jobs.py first.")
        return

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    async with async_session() as db:
        from sqlalchemy import delete
        await db.execute(delete(Job).where(Job.platform == "seed"))
        await db.commit()

        batch = []
        for idx, job_data in enumerate(data):
            batch.append(Job(
                platform="seed",
                platform_job_id=f"gen_{idx:05d}",
                url="",
                **job_data,
            ))
            if len(batch) >= 500:
                for j in batch:
                    db.add(j)
                await db.commit()
                print(f"  Inserted {idx+1}/{len(data)} jobs...")
                batch = []

        if batch:
            for j in batch:
                db.add(j)
            await db.commit()

    print(f"Seeded {len(data)} jobs")


if __name__ == "__main__":
    asyncio.run(seed_from_json())
