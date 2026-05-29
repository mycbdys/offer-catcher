"""End-to-end flow test."""
import requests
import time
import json

BASE = "http://localhost:8000/api"

# 1. Register
print("=== Step 1: Register ===")
resp = requests.post(f"{BASE}/auth/register", json={
    "email": f"e2e_{int(time.time())}@test.com",
    "password": "123456",
    "nickname": "端到端测试"
})
auth = resp.json()
token = auth["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"  User: {auth['user']['nickname']} ({auth['user']['id'][:8]}...)")

# 2. Upload resume
print("\n=== Step 2: Upload Resume ===")
resume = {
    "raw_text": """张三 | 13800138000 | zhangsan@example.com

教育背景：
2019-2023 北京大学 计算机科学 本科

实习经历：
2022.06-2022.09 字节跳动 后端开发实习生
- 使用Python和Django开发内部管理系统
- 参与数据库查询优化，SQL性能提升30%

项目经历：
智能客服系统 | 后端开发
- 基于Python FastAPI开发RESTful API
- 使用Redis缓存热点数据

技能：Python, Java, SQL, Django, FastAPI, Redis, Git, Linux, Docker

期望城市：北京
期望薪资：15k-25k"""
}
resp = requests.post(f"{BASE}/resumes", headers=headers, json=resume)
resume_data = resp.json()
resume_id = resume_data["id"]
print(f"  Resume ID: {resume_id[:8]}...")
print(f"  Parsed skills: {resume_data['skills']}" if resume_data.get('skills') else "  Skills not yet parsed")

# 3. Start matching
print("\n=== Step 3: Start Matching ===")
resp = requests.post(f"{BASE}/matches", headers=headers, json={"resume_id": resume_id})
print(f"  Match session: {resp.json()}")

# 4. Poll for results
print("\n=== Step 4: Polling for Results ===")
for i in range(30):
    time.sleep(3)
    resp = requests.get(f"{BASE}/matches/{resume_id}", headers=headers)
    session = resp.json()
    status = session["status"]
    count = session["total_matches"]
    print(f"  [{i+1}] Status: {status}, Matches: {count}")

    if status in ("completed", "failed"):
        if session.get("results"):
            top = session["results"][0]
            print(f"\n=== Top Match ===")
            print(f"  Score: {top['total_score']}")
            print(f"  Skill: {top['skill_match_score']}")
            print(f"  Semantic: {top['semantic_score']}")
            print(f"  Optimization preview: {top.get('optimization', '')[:200]}...")
        break

print("\n=== Flow test complete ===")
