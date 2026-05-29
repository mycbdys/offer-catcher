"""Lagou scraper: mobile API approach."""

from app.scrapers.base import BaseScraper


class LagouScraper(BaseScraper):
    platform = "lagou"

    KEYWORDS = [
        "Python", "Java", "前端", "后端", "数据分析",
        "算法", "产品经理", "测试", "AI", "实习生",
    ]

    async def scrape(self) -> list[dict]:
        jobs = []
        for keyword in self.KEYWORDS[:5]:  # Limit for MVP
            try:
                kw_jobs = await self._scrape_keyword(keyword)
                jobs.extend(kw_jobs)
                print(f"[lagou] {keyword}: {len(kw_jobs)} jobs")
            except Exception as e:
                print(f"[lagou] Error scraping {keyword}: {e}")
            await self.delay()
        return jobs

    async def _scrape_keyword(self, keyword: str) -> list[dict]:
        jobs = []
        headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
            "Referer": "https://www.lagou.com/",
            "Content-Type": "application/json",
        }

        for page in range(1, 6):  # 5 pages
            try:
                url = "https://www.lagou.com/wn/zhaopin"
                payload = {
                    "first": page == 1,
                    "pn": page,
                    "kd": keyword,
                }
                resp = await self.client.post(url, headers=headers, json=payload)
                data = resp.json()

                if data.get("state") != 1:
                    print(f"[lagou] API error: {data.get('message', 'unknown')}")
                    break

                position_result = data.get("content", {}).get("positionResult", {})
                items = position_result.get("result", [])

                for item in items:
                    jobs.append({
                        "platform": self.platform,
                        "platform_job_id": str(item.get("positionId", "")),
                        "url": f"https://www.lagou.com/jobs/{item.get('positionId')}.html",
                        "title": item.get("positionName", ""),
                        "company_name": item.get("companyFullName", ""),
                        "company_size": item.get("companySize", ""),
                        "company_industry": item.get("industryField", ""),
                        "location_city": item.get("city", ""),
                        "location_district": item.get("district", ""),
                        "salary_min": self._parse_salary_val(item.get("salary", ""))[0],
                        "salary_max": self._parse_salary_val(item.get("salary", ""))[1],
                        "education_require": item.get("education", ""),
                        "experience_require": item.get("workYear", ""),
                        "job_type": item.get("jobNature", "全职"),
                        "description": self._clean_html(item.get("positionDetail", "")),
                        "skills_required": item.get("positionLables", []),
                        "benefits": item.get("positionAdvantage", "").split("，"),
                        "posted_date": item.get("createTime", ""),
                    })

                await self.delay()
                if not items:
                    break

            except Exception as e:
                print(f"[lagou] Error on page {page}: {e}")
                break

        return jobs

    def _parse_salary_val(self, salary_text: str) -> tuple[int, int]:
        """Parse salary like '15k-25k' into int values."""
        import re
        if not salary_text:
            return 0, 0
        nums = re.findall(r'\d+', salary_text)
        if len(nums) >= 2:
            return int(nums[0]) * 1000, int(nums[1]) * 1000
        return 0, 0

    def _clean_html(self, html: str) -> str:
        """Strip HTML tags from description."""
        import re
        if not html:
            return ""
        return re.sub(r'<[^>]+>', ' ', html).strip()
