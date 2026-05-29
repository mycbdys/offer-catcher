"""Run all scrapers to collect real job data."""
import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db import init_db
from app.scrapers.manager import run_all_scrapers


async def main():
    print("Initializing database...")
    await init_db()

    print("Running scrapers...")
    results = await run_all_scrapers()

    print("\n=== Results ===")
    for platform, result in results.items():
        print(f"{platform}: {result}")


if __name__ == "__main__":
    asyncio.run(main())
