import asyncio
import random
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone

import httpx

from app.core.config import settings

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
]


class BaseScraper(ABC):
    """Abstract base scraper with rate limiting and error handling."""

    platform: str = "base"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)

    def random_ua(self) -> str:
        return random.choice(USER_AGENTS)

    async def delay(self, min_s: float = None, max_s: float = None):
        min_s = min_s or settings.SCRAPER_DELAY_MIN
        max_s = max_s or settings.SCRAPER_DELAY_MAX
        await asyncio.sleep(random.uniform(min_s, max_s))

    def now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    @abstractmethod
    async def scrape(self) -> list[dict]:
        """Scrape jobs and return list of job dicts."""
        ...

    async def close(self):
        await self.client.aclose()
