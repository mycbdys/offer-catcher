import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); navigate("/upload"); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "登录失败"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-animated opacity-5" />
      <div className="particle particle-1 animate-float" />
      <div className="particle particle-2 animate-float-delayed" />

      <div className="relative w-full max-w-md animate-scale-in">
        <Link to="/" className="block text-center text-2xl font-black text-gradient mb-8">Offer 捕手</Link>

        <div className="glass-strong rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">欢迎回来</h2>
          <p className="text-slate-500 mb-6">登录你的 Offer 捕手账号</p>

          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm border border-red-100">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white/80" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white/80" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-glow-gradient text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition font-semibold shadow-lg shadow-indigo-200">
              {loading ? "登录中..." : "登录"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            还没有账号？<Link to="/register" className="text-indigo-600 hover:underline font-semibold">去注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
