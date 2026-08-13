import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProjectsPage } from './pages/ProjectsPage';
import { KanbanBoardPage } from './pages/KanbanBoardPage';
import { DashboardPage } from './pages/DashboardPage';
import { AISprintSummaryModal } from './components/ai/AISprintSummaryModal';
import type { Project, Task } from './types/api';
import { api } from './lib/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>('projects');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // --- Projects state ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectsLoading, setIsProjectsLoading] = useState<boolean>(false);

  // --- Tasks state ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksProjectId, setTasksProjectId] = useState<string | null>(null);
  const [isTasksLoading, setIsTasksLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);

  // Fetch projects whenever user logs in
  useEffect(() => {
    if (user) {
      setTasks([]);
      setTasksProjectId(null);
      fetchProjects(true);
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
    setIsProjectsLoading(true);
    try {
      const res = await api.get<{ data: Project[]; meta: { total: number } }>('/projects');
      const list = res.data?.data ?? [];
      setProjects(list);
      if (shouldResetSelection) {
        setSelectedProject(list[0] ?? null);
      } else {
        setSelectedProject((prev) => prev ?? list[0] ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsProjectsLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async (projectId: string) => {
    setIsTasksLoading(true);
    try {
      const res = await api.get<Task[]>('/tasks', { params: { project_id: projectId } });
      const list = Array.isArray(res.data) ? res.data : [];
      setTasks(list);
      setTasksProjectId(projectId);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setTasks([]);
      setTasksProjectId(projectId);
    } finally {
      setIsTasksLoading(false);
    }
  }, []);

  const handleSelectProject = useCallback((proj: Project) => {
    setSelectedProject(proj);
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
        onOpenAISummary={() => setIsAISummaryOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 ml-0 lg:ml-64 overflow-y-auto transition-all duration-300">
          {activeTab === 'projects' && (
            <ProjectsPage
              projects={projects}
              loading={isProjectsLoading}
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
              loading={isTasksLoading}
              searchQuery={searchQuery}
              onOpenAISummary={() => setIsAISummaryOpen(true)}
              onTasksChange={setTasks}
              onRefreshTasks={() => selectedProject && fetchTasks(selectedProject.id)}
              onGoToProjects={() => setActiveTab('projects')}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              tasks={tasks}
              loading={isTasksLoading}
              onOpenAISummary={() => setIsAISummaryOpen(true)}
            />
          )}

          {activeTab === 'admin' && user.role === 'ADMIN' && (
            <AdminPanel />
          )}
        </main>
      </div>

      <AISprintSummaryModal
        isOpen={isAISummaryOpen}
        onClose={() => setIsAISummaryOpen(false)}
        sprintId={''}
      />
    </div>
  );
};

// Simple admin panel — fetches real users from API
const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<{ full_name: string; email: string; role: string; is_active: boolean }[]>([]);

  useEffect(() => {
    api.get<{ full_name: string; email: string; role: string; is_active: boolean }[]>('/users')
      .then((res) => { if (Array.isArray(res.data)) setUsers(res.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">User Administration</h1>
      <p className="text-xs text-gray-400 mb-6">System Admin Panel — Manage system users & account status</p>
      <div className="glass-panel p-6 rounded-3xl border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Registered Users</h3>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400">
            {users.length} Users
          </span>
        </div>
        <div className="divide-y divide-gray-800/60">
          {users.map((u, i) => (
            <div key={i} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-white">{u.full_name}</p>
                <p className="text-[11px] text-gray-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300">{u.role}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700/30 text-gray-400'}`}>
                  {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

