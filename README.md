# Offer 捕手 🎯

AI 驱动的智能求职匹配平台。上传简历，AI 自动解析并与真实岗位数据深度匹配，提供针对性的简历优化建议。

## ✨ 功能

- **📄 简历解析** — 上传 PDF/DOCX/TXT 或粘贴文字，AI 自动提取教育、技能、实习等信息
- **🎯 智能匹配** — 5 阶段严格打分：硬性条件 → 技能匹配 → 语义相似 → 细节分析 → LLM 深度评估
- **💡 简历优化** — 针对每个岗位生成具体可操作的简历改写建议和 ATS 关键词提示
- **🔍 自动补全** — 全国 375 所高校 + 371 个专业 + 661 个城市，输入时自动下拉
- **📊 全行业覆盖** — 35 个真实岗位覆盖互联网、金融、制造、医疗、教育等 12 个行业

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | Python FastAPI + SQLAlchemy + SQLite |
| AI | DeepSeek / OpenAI 兼容 API |
| NLP | jieba 分词 + scikit-learn TF-IDF |
| 爬虫 | Playwright + httpx + BeautifulSoup |

## 🚀 快速开始

### 后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env    # 编辑 .env 填入 DEEPSEEK_API_KEY
python3 scripts/seed_jobs.py   # 初始化岗位数据
python3 -m uvicorn app.main:app --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173

### 爬取真实岗位（可选）

```bash
cd backend
PYTHONPATH=. python3 scripts/run_scraper.py
```

## 📋 匹配打分机制

| 维度 | 权重 | 说明 |
|---|---|---|
| 技能匹配 | 35% | 精确技能名 + 核心技能加权 + 缺失扣分 |
| 硬性条件 | 15% | 城市/学历/经验/薪资重叠度 |
| 语义相似 | 15% | 技能词在 JD 描述中的命中密度 |
| 细节匹配 | 10% | 学校档次(985/211) + 专业相关性 + 实习质量 |
| LLM 深度 | 25% | AI 模型对 5 个子维度的综合评分 |

## 📁 项目结构

```
offer-catcher/
├── backend/
│   ├── app/
│   │   ├── api/          # REST API (auth, resumes, jobs, matches, autocomplete)
│   │   ├── core/         # 配置 & JWT 安全
│   │   ├── db/           # SQLAlchemy 模型
│   │   ├── services/     # 核心业务 (解析、匹配、LLM客户端)
│   │   └── scrapers/     # 爬虫 (51job)
│   └── scripts/          # 种子数据 & 爬虫运行
├── frontend/
│   └── src/
│       ├── pages/        # Home, UploadResume, MatchResults, JobDetail, Dashboard
│       ├── api/          # API 客户端
│       └── stores/       # Zustand 状态管理
└── README.md
```

## 📝 License

MIT © mycbdys
