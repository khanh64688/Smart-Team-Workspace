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
import { AISprintSummaryModal } from './components/ai/AISprintSummaryModal';
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
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);

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
      // API returns { data: Project[], meta: { page, size, total } }
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
        onOpenAISummary={() => setIsAISummaryOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="flex-1 ml-64 overflow-y-auto">
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
              onOpenAISummary={() => setIsAISummaryOpen(true)}
              onTasksChange={setTasks}
              onRefreshTasks={() => selectedProject && fetchTasks(selectedProject.id)}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              tasks={tasks}
              onOpenAISummary={() => setIsAISummaryOpen(true)}
            />
          )}

          {activeTab === 'admin' && user.role === 'ADMIN' && (
            <UserManagementPage />
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
