"""Resume parsing: LLM + enhanced regex fallback."""

import re
from app.services.llm_client import chat_json

RESUME_SYSTEM = """你是一位专业的校招简历解析专家。请严格按照以下JSON格式提取简历中的所有信息。不要遗漏、不要编造。

{
  "personal": {"name": "", "phone": "", "email": "", "gender": "", "birth_year": 0, "political_status": ""},
  "education": [{"school": "", "degree": "本科/硕士/博士/大专", "major": "", "minor": "", "gpa": "", "ranking": "", "start": "YYYY-MM", "end": "YYYY-MM"}],
  "skills": [],
  "internships": [{"company": "", "position": "", "start": "YYYY-MM", "end": "YYYY-MM", "description": ""}],
  "projects": [{"name": "", "role": "", "description": ""}],
  "preferences": {"expected_city": "", "expected_positions": [], "expected_salary_min": 0, "expected_salary_max": 0, "expected_industry": "", "job_type": "全职/实习"},
  "certificates": [],
  "languages": [{"language": "", "level": "", "score": ""}],
  "awards": [],
  "self_evaluation": ""
}

规则：
1. 必须逐字从原文提取，不要猜测或编造信息
2. 学历用"本科/硕士/博士/大专"，不要写"学士"
3. 日期统一为YYYY-MM格式，如2020-09
4. 姓名从简历开头或"姓名:"标签后提取，2-4个汉字
5. 手机号是11位数字，邮箱含@符号
6. 技能从"技能:"、技术栈、或自我描述中提取
7. 期望城市从"期望城市:"或"求职意向:"中提取
8. 薪资数字提取纯数字，单位统一为元/月（如"15k-25k"→15000,25000）
9. 没有的信息用空数组[]、空字符串""或数字0"""


async def parse_resume_with_llm(resume_text: str) -> dict:
    """Parse resume using LLM. Falls back to regex if unavailable."""
    result = await chat_json(
        prompt=f"请解析以下校招简历内容，逐字段提取信息：\n\n{resume_text[:5000]}",
        system=RESUME_SYSTEM,
        temperature=0.0,
    )
    if result:
        return _validate_and_fix(result, resume_text)
    return _enhanced_extract(resume_text)


def _validate_and_fix(parsed: dict, raw: str) -> dict:
    """Validate parsed fields against raw text and fix obvious errors."""
    # Ensure all top-level keys exist
    defaults = {
        "personal": {}, "education": [], "skills": [], "internships": [],
        "projects": [], "preferences": {}, "certificates": [], "languages": [],
        "awards": [], "self_evaluation": "",
    }
    for k, v in defaults.items():
        if k not in parsed:
            parsed[k] = v

    # Fix education degree
    for edu in parsed.get("education", []):
        degree = edu.get("degree", "")
        if "学士" in degree or "本科" in degree:
            edu["degree"] = "本科"
        elif "硕士" in degree:
            edu["degree"] = "硕士"
        elif "博士" in degree:
            edu["degree"] = "博士"
        elif "专科" in degree or "大专" in degree:
            edu["degree"] = "大专"

    # Fix phone - must be 11 digits
    phone = parsed.get("personal", {}).get("phone", "")
    if phone:
        digits = re.sub(r'\D', '', phone)
        if len(digits) == 11:
            parsed["personal"]["phone"] = digits

    # Fix email
    email = parsed.get("personal", {}).get("email", "")
    if email and "@" not in email:
        # Try to find email in raw text
        found = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', raw)
        if found:
            parsed["personal"]["email"] = found.group(0)
        else:
            parsed["personal"]["email"] = ""

    # Fix salary - ensure it's monthly in RMB
    prefs = parsed.get("preferences", {})
    sal_min = prefs.get("expected_salary_min", 0)
    sal_max = prefs.get("expected_salary_max", 0)

    # Detect salary format and convert
    sal_text = re.search(r'(?:期望薪资|薪资要求|薪资)[:：]?\s*(\d+[.]?\d*)\s*[-~至到]\s*(\d+[.]?\d*)\s*(万|k|千|元)?', raw)
    if sal_text:
        try:
            min_v = float(sal_text.group(1))
            max_v = float(sal_text.group(2))
            unit = sal_text.group(3) or ""
            # Check context for yearly
            if "万/年" in raw or "年薪" in raw:
                min_v = int(min_v * 10000 / 12)
                max_v = int(max_v * 10000 / 12)
            elif unit == "万":
                min_v = int(min_v * 10000)
                max_v = int(max_v * 10000)
            elif unit == "k":
                min_v = int(min_v * 1000)
                max_v = int(max_v * 1000)
            elif unit == "千":
                min_v = int(min_v * 1000)
                max_v = int(max_v * 1000)
            elif min_v < 100:  # If numbers are small (e.g. "1.5-2.5"), likely in 万
                min_v = int(min_v * 10000)
                max_v = int(max_v * 10000)
            elif min_v < 1000:  # Likely in k
                min_v = int(min_v * 1000)
                max_v = int(max_v * 1000)
            prefs["expected_salary_min"] = int(min_v)
            prefs["expected_salary_max"] = int(max_v)
        except (ValueError, IndexError):
            pass

    # Fix birth year
    birth = parsed.get("personal", {}).get("birth_year", 0)
    if isinstance(birth, str):
        try: birth = int(birth); parsed["personal"]["birth_year"] = birth
        except: parsed["personal"]["birth_year"] = 0
    if birth and (birth < 1980 or birth > 2015):
        # Invalid, try to find from text
        year_match = re.search(r'(?:出生|生日)[^\d]*(\d{4})', raw)
        if year_match:
            y = int(year_match.group(1))
            if 1980 <= y <= 2015:
                parsed["personal"]["birth_year"] = y
            else:
                parsed["personal"]["birth_year"] = 0
        else:
            parsed["personal"]["birth_year"] = 0

    return parsed


def _enhanced_extract(raw: str) -> dict:
    """Enhanced regex extraction when LLM unavailable."""
    result = {
        "personal": {"name": "", "phone": "", "email": "", "gender": "", "birth_year": 0, "political_status": ""},
        "education": [],
        "skills": [],
        "internships": [],
        "projects": [],
        "preferences": {"expected_city": "", "expected_positions": [], "expected_salary_min": 0, "expected_salary_max": 0, "expected_industry": "", "job_type": "全职"},
        "certificates": [],
        "languages": [],
        "awards": [],
        "self_evaluation": "",
    }

    lines = raw.strip().split("\n")
    first_line = lines[0].strip() if lines else ""

    # ── Name ──
    for pattern in [r'姓名[:：]\s*(\S+)', r'^([一-龥]{2,4})\s*[|｜\s]']:
        m = re.search(pattern, first_line + "\n" + raw[:200])
        if m:
            result["personal"]["name"] = m.group(1).strip(" |｜")
            break

    # ── Phone ──
    m = re.search(r'(?:手机|电话|联系方式)[:：]\s*(\d{11})', raw)
    if not m: m = re.search(r'(?<!\d)(1[3-9]\d{9})(?!\d)', raw)
    if m: result["personal"]["phone"] = m.group(1)

    # ── Email ──
    m = re.search(r'(?:邮箱|Email|E-mail)[:：]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', raw)
    if not m: m = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', raw)
    if m: result["personal"]["email"] = m.group(1)

    # ── Gender ──
    if re.search(r'性别[:：]\s*男', raw) or raw[:100].count("男") > raw[:100].count("女"):
        result["personal"]["gender"] = "男"
    elif re.search(r'性别[:：]\s*女', raw):
        result["personal"]["gender"] = "女"

    # ── Birth year ──
    m = re.search(r'(?:出生年份|出生年月|出生日期|出生)[:：\s]*(\d{4})', raw)
    if m:
        y = int(m.group(1))
        if 1985 <= y <= 2010:
            result["personal"]["birth_year"] = y

    # ── Political status ──
    for s in ["中共党员", "预备党员", "共青团员", "群众"]:
        if s in raw[:500]:
            result["personal"]["political_status"] = s
            break

    # ── Education ──
    schools = re.findall(r'([一-龥]{2,20}(?:大学|学院|研究所))', raw)
    degree_m = re.search(r'(博士|硕士|本科|学士|大专|专科)', raw)
    major_m = re.search(r'(?:专业|系)[:：]\s*([一-龥\w]{2,30})', raw)

    if schools or degree_m:
        edu = {"school": "", "degree": "", "major": "", "minor": "", "gpa": "", "ranking": "", "start": "", "end": ""}
        if schools: edu["school"] = schools[0]
        if degree_m:
            d = degree_m.group(1)
            edu["degree"] = "本科" if d in ("学士","本科") else ("大专" if d in ("专科","大专") else d)
        if major_m: edu["major"] = major_m.group(1)

        # Date range
        date_m = re.search(r'(\d{4}\.?\d{0,2})\s*[-~至到]\s*(\d{4}\.?\d{0,2}|至今|现在)', raw)
        if date_m:
            edu["start"] = date_m.group(1).replace(".", "-")[:7]
            edu["end"] = date_m.group(2).replace(".", "-")[:7] if date_m.group(2) not in ("至今","现在") else date_m.group(2)

        gpa_m = re.search(r'(?:GPA|绩点)[:：]\s*([\d.]+)', raw)
        if gpa_m: edu["gpa"] = gpa_m.group(1)

        rank_m = re.search(r'(?:排名)[:：]\s*(前?\d+%?|top\s*\d+%?)', raw, re.I)
        if rank_m: edu["ranking"] = rank_m.group(0)

        result["education"] = [edu]

    # ── Skills ──
    all_skills = [
        "Python", "Java", "C++", "Go", "Rust", "JavaScript", "TypeScript", "React", "Vue", "Angular",
        "Node.js", "Next.js", "Spring Boot", "Django", "Flask", "FastAPI", "MySQL", "PostgreSQL",
        "MongoDB", "Redis", "Docker", "Kubernetes", "Linux", "Git", "AWS", "Azure",
        "机器学习", "深度学习", "NLP", "计算机视觉", "数据分析", "SQL", "HTML", "CSS",
        "TensorFlow", "PyTorch", "Spark", "Hadoop", "Figma", "MATLAB", "R语言",
        "Office", "Excel", "PPT", "PR", "AE", "PS", "Tableau", "PowerBI",
        "Spring", "Hibernate", "MyBatis", "Kafka", "RabbitMQ", "Nginx", "Tomcat",
        "Jenkins", "GitLab", "Swagger", "Postman", "Jira", "Confluence",
    ]
    # Extract from "技能:" section
    skill_section = re.search(r'技能[:：]\s*(.+?)(?:\n\s*\n|\n(?:[一-龥]{2,4})[:：]|\Z)', raw, re.DOTALL)
    if skill_section:
        section_text = skill_section.group(1)
        result["skills"] = [kw for kw in all_skills if kw.lower() in section_text.lower() or kw.lower() in raw.lower()]
    else:
        result["skills"] = [kw for kw in all_skills if kw.lower() in raw.lower()]

    # Deduplicate and limit
    result["skills"] = list(dict.fromkeys(result["skills"]))[:20]

    # ── Internships ──
    # Find blocks like "公司: XXX" or "XXX公司"
    intern_blocks = re.split(r'\n(?=\d{4}\.\d{1,2}|实习经历|工作经历)', raw)
    for block in intern_blocks[:5]:
        company_m = re.search(r'(?:公司|实习单位)[:：]\s*([^\n]+)', block)
        if not company_m:
            company_m = re.search(r'([一-龥A-Za-z]{2,20}(?:公司|科技|集团|银行|网络|游戏|传媒|证券|基金|软件|信息|数据|云计算|智能))', block)
        if company_m and "教育" not in block[:50] and "学校" not in block[:50]:
            result["internships"].append({
                "company": company_m.group(1).strip(),
                "position": "",
                "start": "", "end": "",
                "description": block[:300].strip(),
            })
    result["internships"] = result["internships"][:3]

    # ── Expected city ──
    CITIES = ["北京", "上海", "深圳", "广州", "杭州", "成都", "南京", "武汉", "西安", "苏州", "合肥", "长沙", "重庆", "天津", "厦门", "青岛", "大连"]
    city_m = re.search(r'(?:期望城市|意向城市|工作城市|期望工作地)[:：]\s*([^\n]{2,10})', raw)
    if city_m:
        for c in CITIES:
            if c in city_m.group(1):
                result["preferences"]["expected_city"] = c
                break
    if not result["preferences"]["expected_city"]:
        for c in CITIES:
            if c in raw[:500]:
                result["preferences"]["expected_city"] = c
                break

    # ── Expected position ──
    pos_m = re.search(r'(?:期望职位|求职意向|意向岗位|应聘岗位)[:：]\s*([^\n]{2,30})', raw)
    if pos_m:
        result["preferences"]["expected_positions"] = [pos_m.group(1).strip()]

    # ── Salary ──
    sal_m = re.search(r'(?:期望薪资|薪资要求)[:：][^\d]*(\d+[.]?\d*)\s*[-~至到]\s*(\d+[.]?\d*)\s*(万|k|千|元)?', raw)
    if sal_m:
        try:
            min_v = float(sal_m.group(1)); max_v = float(sal_m.group(2))
            unit = sal_m.group(3) or ""
            if unit == "万" or min_v < 100:
                min_v = int(min_v * 10000); max_v = int(max_v * 10000)
            elif unit == "k" or unit == "千":
                min_v = int(min_v * 1000); max_v = int(max_v * 1000)
            elif min_v < 1000:
                min_v = int(min_v * 1000); max_v = int(max_v * 1000)
            result["preferences"]["expected_salary_min"] = int(min_v)
            result["preferences"]["expected_salary_max"] = int(max_v)
        except (ValueError, IndexError):
            pass

    # ── Certificates ──
    certs = re.findall(r'(CET-[46]|TEM-[48]|雅思\s*[\d.]+|托福\s*\d+|计算机[一二三四]级|CPA|CFA|FRM|ACCA|PMP|软考|教师资格证|驾驶证|会计证|证券从业|基金从业|期货从业)', raw)
    result["certificates"] = list(dict.fromkeys(certs))

    # ── Languages ──
    if "CET-6" in raw.upper() or "六级" in raw or "英语六级" in raw:
        score_m = re.search(r'(?:CET-6|六级)[^\d]*(\d+)', raw)
        result["languages"].append({"language": "英语", "level": "CET-6", "score": score_m.group(1) if score_m else ""})
    elif "CET-4" in raw.upper() or "四级" in raw or "英语四级" in raw:
        score_m = re.search(r'(?:CET-4|四级)[^\d]*(\d+)', raw)
        result["languages"].append({"language": "英语", "level": "CET-4", "score": score_m.group(1) if score_m else ""})

    ielts = re.search(r'雅思[:：]?\s*([\d.]+)', raw)
    if ielts: result["languages"].append({"language": "英语", "level": f"雅思{ielts.group(1)}", "score": ielts.group(1)})

    # ── Awards ──
    awards_m = re.findall(r'([一-龥\w]{2,30}(?:奖学金|荣誉称号|三好学生|优秀\S+|大赛|竞赛|比赛\S+奖))', raw)
    result["awards"] = list(dict.fromkeys(awards_m))[:8]

    # ── Self evaluation ──
    eval_m = re.search(r'自我评价[:：]\s*(.+?)(?:\n\s*\n|\n(?:[一-龥]{2,4})[:：]|\Z)', raw, re.DOTALL)
    if eval_m:
        result["self_evaluation"] = eval_m.group(1).strip()[:500]

    return result
