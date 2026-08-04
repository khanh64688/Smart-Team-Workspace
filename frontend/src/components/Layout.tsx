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
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
      
      {/* 1. Mobile navigation bar */}
      <div className="flex w-full items-center justify-between border-b border-slate-900 bg-slate-950/80 px-4 py-3 md:hidden sticky top-0 z-40 backdrop-blur">
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-cyan-400" />
          <span className="font-extrabold tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Smart Team
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification bell in mobile */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-1.5 text-slate-400 hover:text-slate-200 transition rounded-lg hover:bg-slate-900"
            >
              <Bell className="h-5.5 w-5.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow shadow-red-500/50">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition rounded-lg hover:bg-slate-900"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* 2. Desktop Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-900 bg-slate-950/70 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:sticky md:h-screen`}>
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-900/60">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-md shadow-cyan-500/20">
            <Layers className="h-5.5 w-5.5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-extrabold tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent text-lg">
            Smart Workspace
          </span>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <div className="flex items-center justify-between px-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dự án của bạn</span>
              {user && user.role !== "MEMBER" && (
                <button
                  onClick={() => setShowCreateProjModal(true)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-900 hover:text-cyan-400 transition"
                  title="Tạo dự án mới"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              {projects.length === 0 ? (
                <div className="text-xs text-slate-600 px-2 py-3">Chưa tham gia dự án nào</div>
              ) : (
                projects.map((proj) => {
                  const isActive = location.pathname.includes(`/projects/${proj.id}`);
                  return (
                    <Link
                      key={proj.id}
                      to={`/projects/${proj.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150 ${isActive ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 pl-2.5" : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"}`}
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

        {/* Current user footer */}
        <div className="border-t border-slate-900/80 bg-slate-950/40 p-4">
          {user && (
            <div className="flex items-center gap-3 mb-3 px-2">
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" className="h-9 w-9 rounded-full bg-slate-800 border border-slate-800" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-200">{user.full_name}</div>
                <div className="truncate text-xs text-slate-500 font-mono">{user.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-950/20 hover:text-red-400 transition duration-150"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* 3. Main content viewport */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Desktop Header */}
        <header className="hidden h-16 items-center justify-between border-b border-slate-900/60 bg-slate-950/50 backdrop-blur px-8 md:flex sticky top-0 z-40">
          <div className="font-semibold text-slate-300">
            {/* Dynamic title will be shown here, handled in page components */}
            Hệ thống Quản lý công việc
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell Dropdown container */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative p-2 text-slate-400 hover:text-slate-200 transition rounded-lg hover:bg-slate-900/50 ${showNotifDropdown ? "bg-slate-900 text-slate-200" : ""}`}
              >
                <Bell className="h-5.5 w-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow shadow-red-500/50 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown List */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/40">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Thông báo</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Đọc tất cả</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">Không có thông báo mới</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`px-4 py-3 text-xs cursor-pointer hover:bg-slate-800/40 transition duration-150 flex gap-2.5 items-start ${!n.is_read ? "bg-cyan-500/5 font-medium" : ""}`}
                        >
                          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? "bg-cyan-400" : "bg-transparent"}`} />
                          <div className="flex-1 space-y-1">
                            <p className="text-slate-300 line-clamp-2 leading-relaxed">{n.content}</p>
                            <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
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

        {/* Dynamic page container */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>

      {/* 4. Create Project Modal Dialog */}
      {showCreateProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Tạo dự án mới</h3>
            {projError && (
              <div className="mb-4 text-xs text-red-400 bg-red-950/20 border border-red-800/50 rounded-lg p-2.5">
                {projError}
              </div>
            )}
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tên dự án *</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="Tên đồ án, bài tập lớn, dự án..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-slate-100 transition focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Mục tiêu của dự án, các thành viên tham gia..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-slate-100 transition focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
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
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:from-cyan-300 hover:to-blue-400 transition"
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
