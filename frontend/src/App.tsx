import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProjectsPage } from './pages/ProjectsPage';
import { KanbanBoardPage } from './pages/KanbanBoardPage';
import { DashboardPage } from './pages/DashboardPage';
import { AISprintSummaryModal } from './components/ai/AISprintSummaryModal';
import type { Project } from './types/api';
import { api } from './lib/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>('kanban');
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: 'Website Thương mại điện tử',
      description: 'Đồ án môn Phát triển ứng dụng Web — xây dựng sàn TMĐT thu nhỏ.',
      status: 'ACTIVE',
      owner_id: 2,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      members: [
        { user_id: 2, project_id: 1, user: { id: 2, email: 'pm@twl.dev', full_name: 'Trần Minh Quản', role: 'PM', is_active: true, created_at: '' } },
        { user_id: 4, project_id: 1, user: { id: 4, email: 'an@twl.dev', full_name: 'Lê Thị An', role: 'MEMBER', is_active: true, created_at: '' } },
        { user_id: 5, project_id: 1, user: { id: 5, email: 'binh@twl.dev', full_name: 'Phạm Quốc Bình', role: 'MEMBER', is_active: true, created_at: '' } },
        { user_id: 6, project_id: 1, user: { id: 6, email: 'chi@twl.dev', full_name: 'Đỗ Ngọc Chi', role: 'MEMBER', is_active: true, created_at: '' } },
      ],
    },
    {
      id: 2,
      name: 'Ứng dụng Quản lý Chi tiêu',
      description: 'Bài tập lớn môn Lập trình di động — app ghi chép thu chi cá nhân.',
      status: 'ACTIVE',
      owner_id: 3,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      members: [
        { user_id: 3, project_id: 2, user: { id: 3, email: 'lap@twl.dev', full_name: 'Hoàng Văn Lập', role: 'PM', is_active: true, created_at: '' } },
        { user_id: 6, project_id: 2, user: { id: 6, email: 'chi@twl.dev', full_name: 'Đỗ Ngọc Chi', role: 'MEMBER', is_active: true, created_at: '' } },
      ],
    },
  ]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const res = await api.get<Project[]>('/projects');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setProjects(res.data);
        if (!selectedProject) setSelectedProject(res.data[0]);
      }
    } catch {
      // Retain sample projects
    }
  };

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
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedProjectName={selectedProject?.name}
        onOpenAISummary={() => setIsAISummaryOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={(proj) => {
            setSelectedProject(proj);
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="flex-1 ml-64 overflow-y-auto">
          {activeTab === 'projects' && (
            <ProjectsPage
              projects={projects}
              onSelectProject={(proj) => {
                setSelectedProject(proj);
                setActiveTab('kanban');
              }}
              onRefreshProjects={fetchProjects}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanBoardPage
              project={selectedProject}
              searchQuery={searchQuery}
              onOpenAISummary={() => setIsAISummaryOpen(true)}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              project={selectedProject}
              onOpenAISummary={() => setIsAISummaryOpen(true)}
            />
          )}

          {activeTab === 'admin' && (
            <div className="p-8">
              <h1 className="text-2xl font-bold text-white mb-2">User Administration</h1>
              <p className="text-xs text-gray-400 mb-6">System Admin Panel — Manage system users & account status</p>

              <div className="glass-panel p-6 rounded-3xl border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Registered Users</h3>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400">
                    8 Users
                  </span>
                </div>

                <div className="divide-y divide-gray-800/60">
                  {[
                    { name: 'Nguyễn Quản Trị', email: 'admin@twl.dev', role: 'ADMIN', status: 'ACTIVE' },
                    { name: 'Trần Minh Quản', email: 'pm@twl.dev', role: 'PM', status: 'ACTIVE' },
                    { name: 'Hoàng Văn Lập', email: 'lap@twl.dev', role: 'PM', status: 'ACTIVE' },
                    { name: 'Lê Thị An', email: 'an@twl.dev', role: 'MEMBER', status: 'ACTIVE' },
                    { name: 'Phạm Quốc Bình', email: 'binh@twl.dev', role: 'MEMBER', status: 'ACTIVE' },
                    { name: 'Đỗ Ngọc Chi', email: 'chi@twl.dev', role: 'MEMBER', status: 'ACTIVE' },
                  ].map((u, i) => (
                    <div key={i} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-[11px] text-gray-400">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300">
                          {u.role}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          {u.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI Summary Modal */}
      <AISprintSummaryModal
        isOpen={isAISummaryOpen}
        onClose={() => setIsAISummaryOpen(false)}
        sprintId={1}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
