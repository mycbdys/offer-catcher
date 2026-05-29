import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resumesApi } from "../api/resumes";
import { matchesApi } from "../api/matches";
import { useAuthStore } from "../stores/authStore";
import type { Resume } from "../types/resume";
import type { MatchResultItem } from "../types/match";

export default function Dashboard() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchResultItem[]>([]);
  const [tab, setTab] = useState<"matches"|"resumes">("matches");
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const list = await resumesApi.list().catch(() => [] as Resume[]);
      setResumes(list);
      for (const r of list) {
        try { const results = await matchesApi.getResults(r.id); setMatchHistory(prev => [...prev, ...results]); } catch {}
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass-strong sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-black text-gradient">Offer 捕手</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/upload" className="text-indigo-600 hover:text-indigo-700 font-medium">上传新简历</Link>
            <span className="text-slate-400">{user?.nickname || user?.email}</span>
            <button onClick={() => { logout(); navigate("/"); }} className="text-slate-400 hover:text-red-500 transition">退出</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-black text-slate-900 mb-8">个人中心</h2>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-8 w-fit">
          {["matches", "resumes"].map(t => (
            <button key={t} onClick={() => setTab(t as typeof tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {t === "matches" ? "📊 匹配历史" : "📄 我的简历"}
            </button>
          ))}
        </div>

        {tab === "matches" && (
          <div className="space-y-3">
            {matchHistory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center animate-fade-in">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-slate-400 mb-4">暂无匹配记录</p>
                <Link to="/upload" className="px-6 py-2.5 bg-glow-gradient text-white rounded-xl font-medium text-sm hover:opacity-90 transition">
                  上传简历开始匹配
                </Link>
              </div>
            ) : (
              matchHistory.map(match => (
                <Link key={match.id} to={`/job/${match.job_id}?matchId=${match.id}`}
                  className="card-lift block bg-white rounded-xl border border-slate-100 p-5 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white ${
                        match.total_score >= 70 ? "bg-gradient-to-br from-emerald-400 to-green-500" :
                        match.total_score >= 50 ? "bg-gradient-to-br from-indigo-400 to-violet-500" : "bg-gradient-to-br from-amber-400 to-orange-500"
                      }`}>
                        {Math.round(match.total_score)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">匹配度 {Math.round(match.total_score)}%</p>
                        <p className="text-sm text-slate-400">{new Date(match.created_at).toLocaleDateString("zh-CN")} {match.is_favorited ? "★ 已收藏" : ""}</p>
                      </div>
                    </div>
                    <span className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">→</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "resumes" && (
          <div className="space-y-3">
            {resumes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center animate-fade-in">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-slate-400 mb-4">暂无简历</p>
                <Link to="/upload" className="px-6 py-2.5 bg-glow-gradient text-white rounded-xl font-medium text-sm hover:opacity-90 transition">
                  上传第一份简历
                </Link>
              </div>
            ) : (
              resumes.map(resume => (
                <div key={resume.id} className="bg-white rounded-xl border border-slate-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{resume.file_name || `简历 ${resume.id.slice(0,8)}`}</p>
                      <p className="text-sm text-slate-500">技能：{resume.skills?.join("、") || "未解析"}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(resume.created_at).toLocaleDateString("zh-CN")} 上传</p>
                    </div>
                    <div className="flex gap-2">
                      {resume.skills?.length > 0 && (
                        <Link to={`/match/${resume.id}`}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                          查看匹配
                        </Link>
                      )}
                      <button onClick={async () => {
                        await resumesApi.delete(resume.id);
                        setResumes(prev => prev.filter(r => r.id !== resume.id));
                      }} className="px-3 py-1.5 text-red-500 text-sm hover:bg-red-50 rounded-lg transition">删除</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
