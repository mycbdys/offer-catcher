"""51job scraper using internal API endpoints (fast, reliable)."""

import re
import asyncio
import time
import httpx

from app.scrapers.base import BaseScraper


class Job51Scraper(BaseScraper):
    platform = "51job"

    # API endpoint discovered from 51job's SPA network requests
    API_BASE = "https://we.51job.com/api/job/search-pc"
    DETAIL_API = "https://cupid.51job.com/pc/open/noauth/recommend/pc-job-mini-detail"

    SEARCHES = [
        ("北京", "Python"), ("北京", "Java"), ("北京", "前端"), ("北京", "销售"), ("北京", "会计"),
        ("上海", "Python"), ("上海", "Java"), ("上海", "数据分析"), ("上海", "运营"), ("上海", "人事"),
        ("深圳", "Java"), ("深圳", "前端"), ("深圳", "产品经理"), ("深圳", "测试"),
        ("广州", "Python"), ("广州", "Java"), ("广州", "运维"), ("广州", "UI"),
        ("杭州", "Java"), ("杭州", "前端"), ("杭州", "数据分析"),
        ("成都", "Python"), ("成都", "Java"), ("成都", "测试"), ("成都", "客服"),
        ("南京", "Java"), ("南京", "前端"), ("武汉", "Python"), ("武汉", "Java"),
        ("西安", "Java"), ("西安", "Python"), ("长沙", "Java"), ("郑州", "销售"),
        ("厦门", "前端"), ("青岛", "Java"), ("大连", "Python"), ("天津", "运营"),
    ]

    AREA_CODES = {
        "北京": "010000", "上海": "020000", "深圳": "040000", "广州": "030200",
        "杭州": "080200", "成都": "090200", "南京": "070200", "武汉": "180200",
        "西安": "200200", "长沙": "190200", "郑州": "170200", "厦门": "110300",
        "青岛": "120300", "大连": "230300", "天津": "050000",
        "苏州": "070300", "重庆": "060000", "合肥": "150200", "济南": "120200",
        "福州": "110200", "昆明": "250200", "贵阳": "240200", "南宁": "200300",
        "海口": "210200", "石家庄": "030200", "太原": "040200", "南昌": "140200",
        "乌鲁木齐": "310200", "兰州": "270200", "银川": "280200", "西宁": "290200",
        "呼和浩特": "060200", "沈阳": "070000", "长春": "080000", "哈尔滨": "090200",
    }

    async def scrape(self) -> list[dict]:
        all_jobs = []
        seen = set()

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for city, keyword in self.SEARCHES:
                try:
                    area = self.AREA_CODES.get(city, "000000")
                    jobs = await self._search_api(client, city, area, keyword)
                    new = 0
                    for j in jobs:
                        key = f"{j['platform_job_id']}"
                        if key not in seen:
                            seen.add(key)
                            all_jobs.append(j)
                            new += 1
                    print(f"[51job] {city} {keyword}: {len(jobs)} found, {new} new (total unique: {len(all_jobs)})")
                except Exception as e:
                    print(f"[51job] Error {city} {keyword}: {e}")
                await asyncio.sleep(1.5)

        return all_jobs

    async def _search_api(self, client: httpx.AsyncClient, city: str, area: str, keyword: str) -> list[dict]:
        jobs = []
        ts = int(time.time() * 1000)

        for page in [1, 2, 3]:
            try:
                url = (
                    f"{self.API_BASE}?api_key=51job&timestamp={ts}"
                    f"&keyword={keyword}&searchType=2&function=&industry="
                    f"&jobArea={area}&jobArea2=&landmark=&metro=&salary=&workYear="
                    f"&degree=&companyType=&companySize=&jobType=&issueDate="
                    f"&sortType=0&pageNum={page}&requestId=&pageSize=20"
                    f"&source=1&accountId=&pageCode=sou|sou|soulb"
                )

                resp = await client.get(url, headers={
                    "User-Agent": self.random_ua(),
                    "Referer": "https://we.51job.com/",
                })
                data = resp.json()

                if data.get("code") != "0" and data.get("success") != True:
                    break

                items = data.get("resultbody", {}).get("job", {}).get("items", [])
                if not items:
                    # Try alternate data path
                    items = data.get("data", {}).get("results", [])
                if not items:
                    # Try direct list
                    engine_data = data.get("resultbody", {}).get("job", {})
                    if isinstance(engine_data, list):
                        items = engine_data
                    else:
                        break

                for item in items:
                    try:
                        job_id = str(item.get("jobId", item.get("jobid", "")))
                        title = item.get("jobName", item.get("title", ""))
                        company = item.get("companyName", item.get("coName", item.get("company_name", "")))
                        salary_text = item.get("salary", item.get("providesalaryText", item.get("salaryText", "")))

                        sal_min, sal_max = self._parse_salary(salary_text)

                        detail_url = item.get("jobUrl", item.get("detailUrl", f"https://jobs.51job.com/{area}/{job_id}.html"))

                        # Skills extraction
                        tags = item.get("attribute", [])
                        if isinstance(tags, str):
                            tags = [t.strip() for t in tags.split(",")]
                        skills = [t for t in tags if t] if tags else self._extract_skills(title, "")

                        # Education/experience
                        edu = item.get("degree", item.get("education", "")) or ""
                        exp = item.get("workYear", item.get("experience", "")) or ""

                        # Description - try to get from item
                        desc = item.get("jobDesc", item.get("description", item.get("duty", ""))) or ""
                        if not desc:
                            # Use summary fields
                            desc_parts = [
                                item.get("jobTags", ""),
                                item.get("welfare", ""),
                                item.get("companyDesc", ""),
                            ]
                            desc = " | ".join(p for p in desc_parts if p)

                        jobs.append({
                            "platform": self.platform,
                            "platform_job_id": job_id,
                            "url": detail_url,
                            "title": title or f"{keyword}相关职位",
                            "company_name": company or "未知",
                            "company_size": item.get("companySize", item.get("coSize", "")) or "",
                            "company_industry": item.get("industry", item.get("coIndustry", "")) or "",
                            "location_city": city,
                            "location_district": item.get("areaDistrict", item.get("workArea", "")) or "",
                            "salary_min": sal_min,
                            "salary_max": sal_max,
                            "education_require": edu or "本科及以上" if "工程师" in title else "不限",
                            "experience_require": exp or "应届生",
                            "job_type": "全职",
                            "description": desc or title,
                            "skills_required": skills,
                            "benefits": [w.strip() for w in item.get("welfare", "").split(",") if w.strip()] if isinstance(item.get("welfare"), str) else [],
                            "posted_date": item.get("issuedate", item.get("updateDate", "")) or "",
                        })
                    except Exception as e:
                        continue

                await asyncio.sleep(0.5)

            except Exception as e:
                break

        return jobs

    def _parse_salary(self, text: str) -> tuple:
        if not text or "面议" in text:
            return 0, 0
        nums = re.findall(r'[\d.]+', text)
        if len(nums) < 2:
            # Single number
            if nums:
                n = float(nums[0])
                return (0, int(n*1000)) if n < 50 else (int(n), int(n*1.5))
            return 0, 0
        try:
            a, b = float(nums[0]), float(nums[1])
            if "万/年" in text: return int(a*10000/12), int(b*10000/12)
            if "千/月" in text: return int(a*1000), int(b*1000)
            if "万/月" in text: return int(a*10000), int(b*10000)
            if a < 50: return int(a*1000), int(b*1000)
            return int(a), int(b)
        except ValueError:
            return 0, 0

    def _extract_skills(self, title: str, desc: str) -> list[str]:
        all_skills = [
            "Python", "Java", "C++", "Go", "JavaScript", "TypeScript", "React",
            "Vue", "Node.js", "Spring", "Django", "Flask", "FastAPI",
            "MySQL", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes",
            "Linux", "Git", "SQL", "HTML", "CSS", "AWS",
            "机器学习", "深度学习", "NLP", "数据分析", "Excel",
        ]
        text = (title + " " + (desc or "")).lower()
        return [s for s in all_skills if s.lower() in text]
