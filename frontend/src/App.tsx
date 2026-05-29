import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UploadResume from "./pages/UploadResume";
import MatchResults from "./pages/MatchResults";
import JobDetail from "./pages/JobDetail";
import Dashboard from "./pages/Dashboard";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuthStore();
  if (loading) return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  if (!isLoggedIn) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/upload" element={<ProtectedRoute><UploadResume /></ProtectedRoute>} />
        <Route path="/match/:sessionId" element={<ProtectedRoute><MatchResults /></ProtectedRoute>} />
        <Route path="/job/:jobId" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}
