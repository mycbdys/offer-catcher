"""Scraper manager: orchestrates all platform scrapers."""

import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.db import async_session
from app.db.models import Job, ScrapingLog
from app.scrapers.job51 import Job51Scraper


async def run_all_scrapers() -> dict:
    results = {}

    async with async_session() as db:
        for scraper_cls in [Job51Scraper]:
            scraper = scraper_cls()
            log = ScrapingLog(platform=scraper.platform, status="running")
            db.add(log)
            await db.commit()

            try:
                jobs = await scraper.scrape()
                new_count = 0
                update_count = 0

                for job_data in jobs:
                    try:
                        result = await db.execute(
                            select(Job).where(
                                Job.platform == job_data["platform"],
                                Job.platform_job_id == job_data["platform_job_id"],
                            )
                        )
                        existing = result.scalar_one_or_none()

                        if existing:
                            for key, val in job_data.items():
                                if key not in ("platform", "platform_job_id"):
                                    setattr(existing, key, val)
                            update_count += 1
                        else:
                            db.add(Job(**job_data))
                            new_count += 1
                    except Exception as e:
                        await db.rollback()
                        continue

                await db.commit()

                log.status = "success"
                log.jobs_scraped = len(jobs)
                log.jobs_new = new_count
                log.jobs_updated = update_count
                log.finished_at = datetime.now(timezone.utc)

                results[scraper.platform] = {
                    "total_scraped": len(jobs),
                    "new": new_count,
                    "updated": update_count,
                }
                print(f"[manager] {scraper.platform}: {len(jobs)} scraped, {new_count} new, {update_count} updated")

            except Exception as e:
                log.status = "failed"
                log.error_message = str(e)
                log.finished_at = datetime.now(timezone.utc)
                results[scraper.platform] = {"error": str(e)}
                print(f"[manager] {scraper.platform} failed: {e}")

            finally:
                await scraper.close()
                await db.commit()

    return results
