import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import { matchesApi } from "../api/matches";
import type { Job } from "../types/job";
import type { MatchResultDetail } from "../types/match";
import { useAuthStore } from "../stores/authStore";

function parseMarkdown(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Bold
    const processed = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900">$1</strong>');

    // H2
    if (/^##\s/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += `<h2 class="text-lg font-bold text-slate-900 mt-6 mb-3">${line.replace(/^##\s*/, '')}</h2>`;
    }
    // H3
    else if (/^###\s/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += `<h3 class="text-base font-semibold text-slate-800 mt-4 mb-2">${line.replace(/^###\s*/, '')}</h3>`;
    }
    // Unordered list
    else if (/^-\s/.test(line)) {
      if (!inList) { html += '<ul class="space-y-1.5 my-3">'; inList = true; }
      html += `<li class="text-sm text-slate-600 ml-4 list-disc">${processed.replace(/^-\s*/, '')}</li>`;
    }
    // Ordered list
    else if (/^\d+\.\s/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (!inOrderedList) { html += '<ol class="space-y-1.5 my-3 list-decimal">'; inOrderedList = true; }
      html += `<li class="text-sm text-slate-600 ml-4">${processed.replace(/^\d+\.\s*/, '')}</li>`;
    }
    // Empty line
    else if (!line.trim()) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
    }
    // Regular paragraph
    else {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += `<p class="text-sm text-slate-600 mb-2">${processed}</p>`;
    }
  }

  if (inList) html += '</ul>';
  if (inOrderedList) html += '</ol>';
  return html;
}

function formatSalary(min: number, max: number): string {
  if (!min && !max) return "薪资面议";
  if (min && max) return `${(min/1000).toFixed(0)}k-${(max/1000).toFixed(0)}k/月`;
  return min ? `${(min/1000).toFixed(0)}k起` : `最高${(max/1000).toFixed(0)}k`;
}

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("matchId");

  const [job, setJob] = useState<Job | null>(null);
  const [match, setMatch] = useState<MatchResultDetail | null>(null);
  const [tab, setTab] = useState<"jd"|"analysis"|"optimization">("jd");
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!jobId) return;
    Promise.all([
      jobsApi.getById(jobId).then(setJob).catch(() => {}),
      matchId ? matchesApi.getDetail(matchId).then(m => { setMatch(m); if (m.optimization) setTab("analysis"); }).catch(() => {}) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [jobId, matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="glass-strong sticky top-0 z-50"><div className="max-w-5xl mx-auto px-6 py-4"><div className="skeleton h-8 w-40" /></div></header>
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">岗位信息加载失败</p>
          <Link to="/dashboard" className="text-indigo-600 hover:underline font-medium">返回</Link>
        </div>
      </div>
    );
  }

  // Score color
  const score = match?.total_score || 0;
  const scoreColor = score >= 70 ? "from-emerald-400 to-green-500" : score >= 50 ? "from-indigo-400 to-violet-500" : score >= 30 ? "from-amber-400 to-orange-500" : "from-red-400 to-rose-500";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-black text-gradient">Offer 捕手</Link>
          <span className="text-sm text-slate-500">{user?.nickname}</span>
        </div>
      </header>

      {/* Job hero */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${scoreColor}`}>
                  {job.job_type}
                </span>
                <span className="text-xs text-slate-400">{job.platform} · {job.posted_date}</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">{job.title}</h1>
              <p className="text-lg text-slate-600 mb-4">{job.company_name} {job.company_industry ? `· ${job.company_industry}` : ""}</p>
              <div className="flex flex-wrap gap-2">
                {[job.location_city, job.location_district, formatSalary(job.salary_min, job.salary_max), job.education_require, job.experience_require].filter(Boolean).map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm border border-slate-100">{tag}</span>
                ))}
              </div>
            </div>
            {match && (
              <div className="shrink-0 text-center">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${scoreColor} flex items-center justify-center shadow-lg mb-2 animate-scale-in`}>
                  <span className="text-2xl font-black text-white">{Math.round(score)}</span>
                </div>
                <span className="text-xs text-slate-400">匹配度</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white sticky top-[73px] z-40">
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          {[
            { key: "jd", label: "📋 岗位详情" },
            { key: "analysis", label: "🔍 匹配分析" },
            { key: "optimization", label: "💡 优化建议" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-5 py-3 text-sm font-semibold transition border-b-2 ${
                tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tab: JD */}
        {tab === "jd" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 animate-fade-in">
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {job.description}
            </div>
            {job.skills_required.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 mb-4">技能要求</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills_required.map(s => (
                    <span key={s} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {job.benefits.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 mb-4">福利待遇</h3>
                <div className="flex flex-wrap gap-2">
                  {job.benefits.map(b => (
                    <span key={b} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm">{b}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Analysis */}
        {tab === "analysis" && match && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <h3 className="font-bold text-slate-900 mb-6 text-lg">匹配维度分析</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "技能匹配", score: match.skill_match_score, color: "from-blue-400 to-cyan-500" },
                  { label: "语义匹配", score: match.semantic_score, color: "from-violet-400 to-purple-500" },
                  { label: "硬性条件", score: match.hard_filter_score, color: "from-amber-400 to-orange-500" },
                  { label: "综合评分", score: match.total_score, color: scoreColor },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className={`text-3xl font-black bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-1`}>
                      {Math.round(item.score)}
                    </div>
                    <div className="text-xs text-slate-500">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* LLM analysis text */}
              {match.match_detail && (
                <div className="p-5 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
                  <p className="text-sm text-indigo-900 leading-relaxed">
                    {(match.match_detail as Record<string,Record<string,string>>)?.llm_analysis?.analysis || "暂无详细分析"}
                  </p>
                </div>
              )}

              {/* Skill overlap */}
              {match.match_detail && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <h4 className="text-sm font-semibold text-emerald-700 mb-2">✓ 匹配的技能</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(match.match_detail as Record<string,Record<string,Record<string,string[]>>>).llm_analysis?.skill_overlap?.matched?.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-white text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">{s}</span>
                      )) || <span className="text-xs text-emerald-400">暂无</span>}
                    </div>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                    <h4 className="text-sm font-semibold text-rose-700 mb-2">✗ 缺失的技能</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(match.match_detail as Record<string,Record<string,Record<string,string[]>>>).llm_analysis?.skill_overlap?.missing?.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-white text-rose-700 rounded-full text-xs font-medium border border-rose-200">{s}</span>
                      )) || <span className="text-xs text-rose-400">暂无</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Optimization */}
        {tab === "optimization" && match && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 animate-fade-in">
            {match.optimization ? (
              <div
                className="prose prose-slate max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(match.optimization) }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">暂无优化建议</p>
                <Link to="/upload" className="mt-4 inline-block text-indigo-600 hover:underline font-medium">上传简历开始匹配</Link>
              </div>
            )}
          </div>
        )}

        {tab !== "jd" && !match && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center animate-fade-in">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-slate-400 mb-4">请先匹配此岗位后再查看分析结果</p>
            <Link to="/upload" className="px-6 py-2.5 bg-glow-gradient text-white rounded-xl font-medium text-sm hover:opacity-90 transition">
              前往上传简历
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
