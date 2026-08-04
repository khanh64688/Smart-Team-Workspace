import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Lock, Mail, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/projects");
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const selectDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123");
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-900">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-gradient-to-tr from-cyan-500/25 to-blue-600/10 blur-[90px] animate-pulse duration-10000" />
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-violet-600/20 to-fuchsia-500/15 blur-[120px] animate-pulse duration-7000" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/35">
            <ShieldCheck className="h-7 w-7 text-slate-950 stroke-[2]" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Smart Team Workspace
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Hệ thống quản lý Sprint & Task tích hợp AI
          </p>
        </div>

        {/* Login Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <div className="p-8">
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-950/40 border border-red-800/50 p-3.5 text-sm text-red-200">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition duration-200 focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition duration-200 focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition duration-300 hover:from-cyan-300 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-70"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                ) : (
                  <>
                    <span>Đăng nhập hệ thống</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Demo Logins Section */}
          <div className="border-t border-slate-800/80 bg-slate-950/40 p-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Chọn tài khoản demo nhanh
            </h4>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button
                onClick={() => selectDemoUser("pm@twl.dev")}
                className="rounded-lg border border-slate-800 bg-slate-900/60 py-2 px-3 hover:bg-slate-800/60 hover:border-slate-700 transition"
              >
                <div className="font-semibold text-cyan-400">Project Manager</div>
                <div className="text-slate-500 font-mono text-[10px]">pm@twl.dev</div>
              </button>
              <button
                onClick={() => selectDemoUser("an@twl.dev")}
                className="rounded-lg border border-slate-800 bg-slate-900/60 py-2 px-3 hover:bg-slate-800/60 hover:border-slate-700 transition"
              >
                <div className="font-semibold text-cyan-400">Team Member</div>
                <div className="text-slate-500 font-mono text-[10px]">an@twl.dev</div>
              </button>
            </div>
          </div>
        </div>

        {/* Register Prompt */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="font-medium text-cyan-400 transition hover:text-cyan-300 hover:underline">
            Đăng ký miễn phí
          </Link>
        </p>
      </div>
    </div>
  );
};
