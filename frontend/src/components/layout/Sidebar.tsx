import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  KanbanSquare, 
  Users, 
  Sparkles, 
  LogOut,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProjectName?: string;
  onOpenAISummary: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedProjectName,
  onOpenAISummary
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'kanban', label: 'Kanban Board', icon: KanbanSquare },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(user?.role === 'ADMIN' ? [{ id: 'admin', label: 'User Admin', icon: Users }] : []),
  ];

  return (
    <aside className="w-64 glass-panel border-r border-gray-800/60 h-screen flex flex-col justify-between p-4 fixed left-0 top-0 z-30">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">Smart Workspace</h1>
            <span className="text-xs text-indigo-400 font-medium">Agile & AI Workspace</span>
          </div>
        </div>

        {/* Selected Active Context */}
        {selectedProjectName && (
          <div className="mx-2 mb-5 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20">
            <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold mb-1">Active Project</p>
            <p className="text-sm font-semibold text-white truncate">{selectedProjectName}</p>
          </div>
        )}

        {/* Navigation items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* AI Action Highlight */}
        <div className="mt-8 mx-2 p-4 rounded-xl bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            AI Assistant
          </div>
          <p className="text-xs text-gray-300 mb-3">Instant Sprint summary, blocker breakdown & risks.</p>
          <button
            onClick={onOpenAISummary}
            className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Sprint Report
          </button>
        </div>
      </div>

      {/* User Footer */}
      <div className="pt-4 border-t border-gray-800/80">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow-inner">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{user?.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
