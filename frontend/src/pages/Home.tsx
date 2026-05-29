import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const features = [
  { icon: "📄", title: "一键解析", desc: "上传简历文件，AI 自动提取教育背景、技能标签、项目经历等关键信息", color: "from-blue-500 to-cyan-500" },
  { icon: "🎯", title: "智能匹配", desc: "多维度分析简历与岗位匹配度，从技能、经验、学历等维度给出精准评分", color: "from-violet-500 to-purple-500" },
  { icon: "✨", title: "简历优化", desc: "针对每个心仪岗位，AI 提供具体简历改写建议和 ATS 关键词优化方案", color: "from-amber-500 to-orange-500" },
  { icon: "📊", title: "数据分析", desc: "可视化匹配报告，清晰展示技能差距和改进方向，让求职更有针对性", color: "from-emerald-500 to-teal-500" },
];

export default function Home() {
  const { isLoggedIn } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      {/* ════ Header ════ */}
      <header className="glass-strong sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black text-gradient">Offer 捕手</Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link to="/upload" className="px-5 py-2.5 bg-glow-gradient text-white rounded-xl font-medium text-sm hover:opacity-90 transition shadow-lg shadow-indigo-200">
                  上传简历
                </Link>
                <Link to="/dashboard" className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-medium transition">
                  个人中心
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-medium transition">登录</Link>
                <Link to="/register" className="px-5 py-2.5 bg-glow-gradient text-white rounded-xl font-medium text-sm hover:opacity-90 transition shadow-lg shadow-indigo-200">
                  免费注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ════ Hero ════ */}
      <section className="relative min-h-[600px] flex items-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-animated opacity-10" />
        {/* Floating orbs */}
        <div className="particle particle-1 animate-float" />
        <div className="particle particle-2 animate-float-delayed" />
        <div className="particle particle-3 animate-float-slow" />
        <div className="particle particle-4 animate-float" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-indigo-200 mb-8 animate-slide-up">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-indigo-600">AI 驱动的智能求职平台</span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 mb-6 leading-tight animate-slide-up">
              让每一份简历
              <br />
              <span className="text-gradient">精准命中</span> 目标岗位
            </h1>

            <p className="text-xl text-slate-500 mb-10 max-w-xl mx-auto leading-relaxed animate-slide-up">
              上传简历，AI 自动解析并与真实岗位数据深度匹配，提供针对性的简历优化建议，大幅提升初筛通过率。
            </p>

            {/* CTA buttons */}
            <div className="flex items-center justify-center gap-4 animate-slide-up">
              <Link to={isLoggedIn ? "/upload" : "/register"}
                className="group relative px-8 py-4 bg-glow-gradient text-white text-lg font-bold rounded-2xl hover:opacity-95 transition shadow-xl shadow-indigo-300 hover:shadow-2xl hover:shadow-indigo-400 hover:-translate-y-0.5">
                <span className="relative z-10">免费开始使用</span>
                <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition" />
              </Link>
              <Link to="/upload"
                className="px-8 py-4 glass rounded-2xl text-slate-700 font-bold text-lg hover:bg-white/90 transition">
                了解更多
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 animate-fade-in">
              {[
                { value: "35+", label: "岗位数据" },
                { value: "12+", label: "行业覆盖" },
                { value: "AI", label: "智能匹配" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-black text-gradient mb-1">{s.value}</div>
                  <div className="text-sm text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ Features ════ */}
      <section className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">为什么选择 <span className="text-gradient">Offer 捕手</span>？</h2>
          <p className="text-slate-500">一站式解决学生求职的核心痛点</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card-lift glass rounded-2xl p-6 group cursor-default">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════ CTA Section ════ */}
      <section className="relative max-w-4xl mx-auto px-6 pb-24">
        <div className="bg-dark-gradient rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">准备好找到心仪的工作了吗？</h2>
            <p className="text-indigo-200 mb-8 text-lg">上传简历，让 AI 为你精准匹配最合适的岗位</p>
            <Link to={isLoggedIn ? "/upload" : "/register"}
              className="inline-flex px-10 py-4 bg-white text-indigo-700 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
              立即开始 →
            </Link>
          </div>
        </div>
      </section>

      {/* ════ Footer ════ */}
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        岗位数据来源于真实招聘平台 | Offer 捕手 © 2026
      </footer>
    </div>
  );
}
