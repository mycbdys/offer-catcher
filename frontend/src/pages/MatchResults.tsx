import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { matchesApi } from "../api/matches";
import { jobsApi } from "../api/jobs";
import type { MatchSession } from "../types/match";
import type { Job } from "../types/job";
import { useAuthStore } from "../stores/authStore";

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const p = (Math.min(score, 100) / 100) * c;
  const gradientId = `ring-${size}-${Math.round(score)}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={score >= 70 ? "#10b981" : score >= 50 ? "#6366f1" : score >= 30 ? "#f59e0b" : "#ef4444"} />
            <stop offset="100%" stopColor={score >= 70 ? "#34d399" : score >= 50 ? "#8b5cf6" : score >= 30 ? "#fbbf24" : "#f87171"} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#${gradientId})`} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={c - p} strokeLinecap="round"
          className="score-ring" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-slate-800">{Math.round(score)}</span>
        <span className="text-[10px] text-slate-400">匹配度</span>
      </div>
    </div>
  );
}

function formatSalary(min: number, max: number): string {
  if (!min && !max) return "薪资面议";
  if (min && max) return `${(min/1000).toFixed(0)}k-${(max/1000).toFixed(0)}k`;
  if (min) return `${(min/1000).toFixed(0)}k起`;
  return `最高${(max/1000).toFixed(0)}k`;
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="bg-white rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="skeleton w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-24" />
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16 rounded-full" />
                <div className="skeleton h-6 w-16 rounded-full" />
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MatchResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<MatchSession | null>(null);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const { user } = useAuthStore();

  const fetchResults = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await matchesApi.getStatus(sessionId);
      setSession(data);
      const jobMap: Record<string, Job> = {};
      for (const r of data.results) {
        try { jobMap[r.job_id] = await jobsApi.getById(r.job_id); } catch {}
      }
      setJobs(jobMap);
      if (data.status === "completed" || data.status === "failed") {
        setPolling(false); setLoading(false);
      }
    } catch { setLoading(false); setPolling(false); }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let interval: ReturnType<typeof setInterval>;
    fetchResults();
    if (polling) interval = setInterval(fetchResults, 2000);
    return () => { if (interval) clearInterval(interval); };
  }, [sessionId, polling, fetchResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="glass-strong sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-xl font-black text-gradient">Offer 捕手</Link>
            <span className="text-sm text-slate-500">{user?.nickname}</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-12"><Skeleton /></main>
      </div>
    );
  }

  if (!session || session.status === "failed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
          <p className="text-slate-600 mb-4">匹配失败，请重试</p>
          <Link to="/upload" className="text-indigo-600 hover:underline font-medium">返回上传页</Link>
        </div>
      </div>
    );
  }

  const topScore = session.results[0]?.total_score || 0;
  const highCount = session.results.filter(r => r.total_score >= 70).length;
  const midCount = session.results.filter(r => r.total_score >= 50 && r.total_score < 70).length;
  const lowCount = session.results.filter(r => r.total_score < 50).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-black text-gradient">Offer 捕手</Link>
          <span className="text-sm text-slate-500">{user?.nickname}</span>
        </div>
      </header>

      {/* Summary banner */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-6">
          <ScoreRing score={topScore} size={96} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">匹配结果</h2>
            <p className="text-slate-500">
              共匹配 <span className="font-bold text-indigo-600 text-lg">{session.total_matches}</span> 个岗位
              {polling && <span className="ml-2 text-sm text-slate-400 animate-pulse">分析中...</span>}
            </p>
          </div>
          <div className="hidden md:grid grid-cols-3 gap-4">
            <div className="text-center px-4">
              <div className="text-2xl font-black text-emerald-500">{highCount}</div>
              <div className="text-xs text-slate-400">高度匹配</div>
            </div>
            <div className="text-center px-4">
              <div className="text-2xl font-black text-indigo-500">{midCount}</div>
              <div className="text-xs text-slate-400">中度匹配</div>
            </div>
            <div className="text-center px-4">
              <div className="text-2xl font-black text-amber-500">{lowCount}</div>
              <div className="text-xs text-slate-400">低度匹配</div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Match list */}
          <div className="lg:col-span-3 space-y-3">
            {session.results.map((result, idx) => {
              const job = jobs[result.job_id];
              const rankColors = ["from-amber-400 to-orange-500", "from-slate-300 to-slate-400", "from-amber-600 to-amber-700"];
              const rankColor = idx < 3 ? rankColors[idx] : "from-slate-200 to-slate-300";

              return (
                <Link key={result.id} to={`/job/${result.job_id}?matchId=${result.id}`}
                  className="card-lift block bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer group">
                  <div className="flex items-start gap-4">
                    {/* Rank badge */}
                    <div className={`shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br ${rankColor} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                      {idx + 1}
                    </div>
                    <ScoreRing score={result.total_score} size={64} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 mb-1 truncate group-hover:text-indigo-600 transition-colors">
                        {job?.title || "岗位"}
                      </h3>
                      <p className="text-sm text-slate-500 mb-2">
                        {job?.company_name || ""}{job?.location_city ? ` · ${job.location_city}` : ""}
                      </p>
                      <p className="text-sm font-semibold text-indigo-600">
                        {job ? formatSalary(job.salary_min, job.salary_max) : ""}
                      </p>
                      {job?.skills_required && job.skills_required.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.skills_required.slice(0, 4).map(s => (
                            <span key={s} className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-xs border border-slate-100">
                              {s}
                            </span>
                          ))}
                          {job.skills_required.length > 4 && (
                            <span className="text-xs text-slate-400 py-0.5">+{job.skills_required.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">→</div>
                  </div>
                </Link>
              );
            })}
            {session.results.length === 0 && !polling && (
              <div className="text-center py-16 animate-fade-in">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-slate-400">暂无匹配结果</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="glass rounded-2xl p-6 sticky top-24 space-y-4">
              <h3 className="font-bold text-slate-900">快速操作</h3>
              <Link to="/upload" className="block w-full py-2.5 bg-glow-gradient text-white rounded-xl text-center text-sm font-medium hover:opacity-90 transition shadow-lg shadow-indigo-200">
                上传新简历
              </Link>
              <Link to="/dashboard" className="block w-full py-2.5 glass rounded-xl text-center text-sm text-slate-600 hover:bg-white/90 transition">
                查看匹配历史
              </Link>
              <div className="pt-4 border-t border-slate-200/50">
                <p className="text-xs text-slate-400 text-center">
                  分数越高表示简历<br />与岗位的匹配度越高
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
