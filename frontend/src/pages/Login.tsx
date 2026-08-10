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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-indigo-200/40 blur-[100px] animate-pulse duration-10000" />
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-200/30 blur-[120px] animate-pulse duration-7000" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="h-7 w-7 stroke-[2]" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
            Smart Team Workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Hệ thống quản lý Sprint & Task tích hợp AI
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-xl shadow-xl">
          <div className="p-8">
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-sm text-rose-700">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition duration-200 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition duration-200 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-md shadow-indigo-500/20 transition duration-300 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Đăng nhập hệ thống</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 p-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 text-center">
              Chọn tài khoản demo nhanh
            </h4>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button
                onClick={() => selectDemoUser("pm@twl.dev")}
                className="rounded-xl border border-slate-200 bg-white py-2 px-3 hover:bg-indigo-50 hover:border-indigo-200 transition text-left"
              >
                <div className="font-semibold text-indigo-600">Project Manager</div>
                <div className="text-slate-400 font-mono text-[10px]">pm@twl.dev</div>
              </button>
              <button
                onClick={() => selectDemoUser("an@twl.dev")}
                className="rounded-xl border border-slate-200 bg-white py-2 px-3 hover:bg-indigo-50 hover:border-indigo-200 transition text-left"
              >
                <div className="font-semibold text-indigo-600">Team Member</div>
                <div className="text-slate-400 font-mono text-[10px]">an@twl.dev</div>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline">
            Đăng ký miễn phí
          </Link>
        </p>
      </div>
    </div>
  );
};

