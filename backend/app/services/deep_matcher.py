"""Deep matching and optimization services using LLM."""

import json
import random
from app.services.llm_client import chat, chat_json

MATCH_SYSTEM = """你是一位专业的招聘匹配顾问。分析候选人简历与岗位要求的匹配程度。

对5个维度评分（1-10分）：
1. 技能匹配度：简历技能与岗位技能要求的对比
2. 经验相关性：实习/项目经历与岗位职责的相关程度
3. 教育背景匹配：学历和专业是否满足要求
4. 项目匹配度：项目经验与岗位技术栈的吻合程度
5. 综合适配度：整体评估是否适合此岗位

输出纯JSON格式：
{
  "scores": {"skill_match": 8, "experience_relevance": 7, "education_match": 9, "project_match": 6, "overall_fit": 7},
  "analysis": "综合分析，80字以内",
  "skill_overlap": {"matched": ["匹配的技能"], "missing": ["缺失的技能"]},
  "strengths": ["优势"],
  "gaps": ["差距"]
}"""

OPTIMIZATION_SYSTEM = """你是一位资深的简历优化顾问，专门帮助应届生修改简历以提高岗位初筛通过率。

请针对岗位要求，为候选人的简历提供具体、可操作的优化建议。用中文输出Markdown格式：

## 整体策略
（1-2句话整体方向）

## 技能补充建议
（针对缺失技能给出具体补充方案）

## 简历措辞优化
（提供具体的before/after改写对比）

## ATS关键词建议
（列出需要在简历中添加的关键词）

## 面试准备重点
（针对该岗位的面试准备建议）"""


async def deep_match_resume_to_job(resume_data: dict, job_data: dict) -> dict:
    """Use LLM to deeply match a resume against a job."""
    prompt = f"""## 候选人简历
{json.dumps(resume_data, ensure_ascii=False, indent=2)[:2000]}

## 岗位要求
- 职位：{job_data.get('title', '')}
- 公司：{job_data.get('company_name', '')}
- 描述：{job_data.get('description', '')[:1500]}
- 技能要求：{', '.join(job_data.get('skills_required', []))}"""

    result = await chat_json(prompt, system=MATCH_SYSTEM, temperature=0.3)
    if result:
        return result
    return _mock_match_result(resume_data, job_data)


async def generate_optimization(resume_data: dict, job_data: dict, match_detail: dict) -> str:
    """Generate resume optimization suggestions."""
    prompt = f"""## 岗位信息
- 职位：{job_data.get('title', '')}
- 公司：{job_data.get('company_name', '')}
- 岗位描述：{job_data.get('description', '')[:2000]}
- 技能要求：{', '.join(job_data.get('skills_required', []))}

## 候选人信息
{json.dumps(resume_data, ensure_ascii=False, indent=2)[:1500]}

## 当前匹配分析
{json.dumps(match_detail, ensure_ascii=False, indent=2)[:1000]}"""

    result = await chat(prompt, system=OPTIMIZATION_SYSTEM, max_tokens=2000, temperature=0.5)
    if result:
        return result
    return _mock_optimization(job_data)


def _mock_match_result(resume_data: dict, job_data: dict) -> dict:
    """Mock match when LLM is unavailable."""
    skills = resume_data.get("skills", [])
    required = job_data.get("skills_required", [])
    matched = [s for s in skills if any(r.lower() in s.lower() or s.lower() in r.lower() for r in required)]
    missing = [r for r in required if not any(s.lower() in r.lower() or r.lower() in s.lower() for s in skills)]

    overlap = len(matched) / max(len(required), 1)
    skill_score = min(10, max(1, int(overlap * 10)))

    return {
        "scores": {
            "skill_match": skill_score,
            "experience_relevance": random.randint(5, 8),
            "education_match": random.randint(6, 9),
            "project_match": random.randint(5, 8),
            "overall_fit": random.randint(5, 8),
        },
        "analysis": f"候选人在{', '.join(matched[:3]) if matched else '部分'}技能上匹配，缺少{', '.join(missing[:3]) if missing else '关键'}技能。",
        "skill_overlap": {"matched": matched, "missing": missing},
        "strengths": [f"具备{m}相关经验" for m in matched[:2]],
        "gaps": [f"需要补充{m}相关技能" for m in missing[:2]],
    }


def _mock_optimization(job_data: dict) -> str:
    """Mock optimization when LLM is unavailable."""
    skills = ', '.join(job_data.get('skills_required', [])[:10])
    return f"""## 整体策略
建议围绕{job_data.get('title', '目标岗位')}的核心要求，突出相关技能和项目经验。

## 技能补充建议
- 根据岗位JD补充相关技术关键词
- 在技能列表中突出{skills}
- 补充相关证书或培训经历

## 简历措辞优化
- 将"参与"改为"负责/主导"，体现主动性
- 用量化数据体现项目成果（如"提升了XX%"、"服务了XX用户"）
- 使用岗位JD中的关键词描述你的经历

## ATS关键词建议
确保简历包含：{skills}

## 面试准备重点
- 准备1-2个与岗位相关的项目案例
- 复习岗位核心技术栈
- 准备职业规划和求职动机的回答
"""
