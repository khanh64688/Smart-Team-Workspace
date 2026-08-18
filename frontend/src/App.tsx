import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProjectsPage } from './pages/ProjectsPage';
import { KanbanBoardPage } from './pages/KanbanBoardPage';
import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { ChatWidget } from './components/chat/ChatWidget';
import type { Project, Task } from './types/api';
import { api } from './lib/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>('projects');

  // --- Projects state (lifted up) ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // --- Tasks state (lifted up so it persists across tab switches) ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksProjectId, setTasksProjectId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Nhớ trạng thái thu gọn sidebar giữa các lần tải trang.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // Fetch projects whenever user logs in
  useEffect(() => {
    if (user) {
      setTasks([]);
      setTasksProjectId(null);
      fetchProjects(true); // Reset project selection when user changes
    } else {
      setProjects([]);
      setSelectedProject(null);
      setTasks([]);
      setTasksProjectId(null);
    }
  }, [user]);

  // Fetch tasks whenever selected project changes
  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = useCallback(async (shouldResetSelection = false) => {
    try {
      // API returns either Project[] or { data: Project[], meta: { total: number } }
      const res = await api.get<any>('/projects');
      const list: Project[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      setProjects(list);
      if (shouldResetSelection) {
        setSelectedProject(list[0] ?? null);
      } else {
        setSelectedProject((prev) => (prev ? (list.find((p) => p.id === prev.id) ?? list[0] ?? null) : (list[0] ?? null)));
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, []);

  const fetchTasks = useCallback(async (projectId: string) => {
    try {
      // Backend: GET /tasks?project_id=<uuid>
      const res = await api.get<Task[]>('/tasks', { params: { project_id: projectId } });
      const list = Array.isArray(res.data) ? res.data : [];
      setTasks(list);
      setTasksProjectId(projectId);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setTasks([]);
      setTasksProjectId(projectId);
    }
  }, []);

  const handleSelectProject = useCallback((proj: Project) => {
    setSelectedProject(proj);
    // Immediately clear stale tasks from old project
    if (proj.id !== tasksProjectId) {
      setTasks([]);
      setTasksProjectId(null);
    }
  }, [tasksProjectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedProjectName={selectedProject?.name}
        isCollapsed={isSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            isSidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}
        >
          {activeTab === 'projects' && (
            <ProjectsPage
              projects={projects}
              onSelectProject={(proj) => {
                handleSelectProject(proj);
                setActiveTab('kanban');
              }}
              onRefreshProjects={fetchProjects}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanBoardPage
              project={selectedProject}
              tasks={tasks}
              searchQuery={searchQuery}
              onTasksChange={setTasks}
              onRefreshTasks={() => selectedProject && fetchTasks(selectedProject.id)}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage tasks={tasks} />
          )}

          {activeTab === 'admin' && user.role === 'ADMIN' && (
            <UserManagementPage />
          )}
        </main>
      </div>

      {/* Trợ lý AI — nút nổi dùng được ở mọi trang */}
      <ChatWidget project={selectedProject} tasks={tasks} />
    </div>
  );
};

import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
