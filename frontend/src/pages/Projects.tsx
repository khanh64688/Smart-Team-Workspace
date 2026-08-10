import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { Project } from "../services/api";
import { Layout } from "../components/Layout";
import { 
  FolderGit2, 
  Calendar, 
  User, 
  Plus, 
  CheckCircle2, 
  Lock, 
  Layers,
  ArrowRight
} from "lucide-react";

export const Projects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await api.projects.create(name, description);
      setName("");
      setDescription("");
      setShowCreateModal(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.message || "Tạo dự án thất bại.");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dự án của bạn</h2>
            <p className="text-xs text-slate-500 mt-1">Quản lý và xem tiến độ các dự án đang tham gia</p>
          </div>

          {user && user.role !== "MEMBER" && (
            <button
              onClick={() => {
                setError("");
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:from-indigo-500 hover:to-violet-500 transition shadow-sm"
            >
              <Plus className="h-4.5 w-4.5 stroke-[3]" />
              <span>Tạo dự án mới</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-white/60">
            <FolderGit2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h4 className="text-lg font-bold text-slate-700 mb-1">Bạn chưa có dự án nào</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Bạn chưa được chỉ định vào dự án nào, hoặc chưa tạo dự án mới làm trưởng nhóm.
            </p>
            {user && user.role !== "MEMBER" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-sm"
              >
                Tạo dự án đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                to={`/projects/${proj.id}`}
                className="group relative rounded-2xl border border-slate-200/90 bg-white/90 p-6 flex flex-col justify-between gap-5 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition duration-200 shadow-xs backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition duration-300">
                      <FolderGit2 className="h-5.5 w-5.5" />
                    </div>
                    {proj.status === "ACTIVE" ? (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                        Đang làm
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Đã đóng
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm tracking-wide leading-snug group-hover:text-indigo-600 transition duration-200 truncate">
                      {proj.name}
                    </h4>
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                      {proj.description || "Không có mô tả dự án."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(proj.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-sans text-indigo-600 font-bold group-hover:text-indigo-800 transition">
                    <span>Vào bảng việc</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tạo dự án mới</h3>
            {error && (
              <div className="mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tên dự án *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Website Sàn Thương mại điện tử..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mô tả dự án</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu của dự án phát triển..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setName("");
                    setDescription("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition shadow-sm"
                >
                  Tạo dự án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
};

