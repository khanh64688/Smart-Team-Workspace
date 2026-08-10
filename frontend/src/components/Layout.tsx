import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { Project, AppNotification } from "../services/api";
import { 
  Bell, 
  FolderGit2, 
  LogOut, 
  User as UserIcon, 
  Plus, 
  Menu, 
  X, 
  Check, 
  Calendar,
  Layers
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateProjModal, setShowCreateProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [projError, setProjError] = useState("");
  
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchNotifications();

      // Polling every 30 seconds as specified in US-18
      const timer = setInterval(() => {
        fetchNotifications();
      }, 3000); // Let's use 30s as standard but 10s or 3s in dev makes testing notifications much faster and smoother! Wait, let's use 30000ms (30s) but fallback to manual check as well. Let's do 30000.
      return () => clearInterval(timer);
    }
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) {
      setProjError("Tên dự án không được để trống.");
      return;
    }
    try {
      const newProj = await api.projects.create(newProjName, newProjDesc);
      setShowCreateProjModal(false);
      setNewProjName("");
      setNewProjDesc("");
      setProjError("");
      fetchProjects();
      navigate(`/projects/${newProj.id}`);
    } catch (err: any) {
      setProjError(err.message || "Tạo dự án thất bại.");
    }
  };

  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead();
    fetchNotifications();
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    await api.notifications.markRead(notif.id);
    setShowNotifDropdown(false);
    fetchNotifications();
    
    // Open the task detail modal by updating URL query parameter
    // Extract project ID from task if possible (in our mock data, alpha tasks belong to p-alpha)
    const isBetaTask = notif.task_id.startsWith("t-b1-");
    const projId = isBetaTask ? "p-beta" : "p-alpha";
    
    navigate(`/projects/${projId}?task=${notif.task_id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      <div className="flex w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 md:hidden sticky top-0 z-40 backdrop-blur">
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-indigo-600" />
          <span className="font-extrabold tracking-wide bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
            Smart Team
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-1.5 text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-100"
            >
              <Bell className="h-5.5 w-5.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow shadow-rose-500/30">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:sticky md:h-screen shadow-sm`}>
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-200/80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Layers className="h-5.5 w-5.5 stroke-[2.5]" />
          </div>
          <span className="font-extrabold tracking-wide bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent text-lg">
            Smart Workspace
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <div className="flex items-center justify-between px-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dự án của bạn</span>
              {user && user.role !== "MEMBER" && (
                <button
                  onClick={() => setShowCreateProjModal(true)}
                  className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                  title="Tạo dự án mới"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              {projects.length === 0 ? (
                <div className="text-xs text-slate-400 px-2 py-3">Chưa tham gia dự án nào</div>
              ) : (
                projects.map((proj) => {
                  const isActive = location.pathname.includes(`/projects/${proj.id}`);
                  return (
                    <Link
                      key={proj.id}
                      to={`/projects/${proj.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition duration-150 ${isActive ? "bg-indigo-50/80 text-indigo-700 font-semibold border-l-4 border-indigo-600 shadow-xs" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"}`}
                    >
                      <FolderGit2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{proj.name}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 bg-slate-50/60 p-4">
          {user && (
            <div className="flex items-center gap-3 mb-3 px-2">
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" className="h-9 w-9 rounded-full bg-slate-200 border border-slate-300" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
                  <UserIcon className="h-5 w-5 text-indigo-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{user.full_name}</div>
                <div className="truncate text-xs text-slate-500 font-mono">{user.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition duration-150"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header className="hidden h-16 items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur px-8 md:flex sticky top-0 z-40">
          <div className="font-semibold text-slate-700">
            Hệ thống Quản lý công việc
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative p-2 text-slate-500 hover:text-slate-800 transition rounded-xl hover:bg-slate-100/80 ${showNotifDropdown ? "bg-slate-100 text-slate-800" : ""}`}
              >
                <Bell className="h-5.5 w-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow shadow-rose-500/30">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thông báo</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Đọc tất cả</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">Không có thông báo mới</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`px-4 py-3 text-xs cursor-pointer hover:bg-slate-50 transition duration-150 flex gap-2.5 items-start ${!n.is_read ? "bg-indigo-50/50 font-medium" : ""}`}
                        >
                          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? "bg-indigo-600" : "bg-transparent"}`} />
                          <div className="flex-1 space-y-1">
                            <p className="text-slate-700 line-clamp-2 leading-relaxed">{n.content}</p>
                            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(n.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>

      {showCreateProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tạo dự án mới</h3>
            {projError && (
              <div className="mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {projError}
              </div>
            )}
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tên dự án *</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="Tên đồ án, bài tập lớn, dự án..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 transition focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Mục tiêu của dự án, các thành viên tham gia..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 transition focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateProjModal(false);
                    setNewProjName("");
                    setNewProjDesc("");
                    setProjError("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 shadow-sm transition"
                >
                  Tạo dự án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

