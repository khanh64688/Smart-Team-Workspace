import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  KanbanSquare, 
  Users, 
  LogOut,
  Layers,
  Settings,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProjectName?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedProjectName,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
}) => {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'kanban', label: 'Kanban Board', icon: KanbanSquare },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(user?.role === 'ADMIN' ? [{ id: 'admin', label: 'User Admin', icon: Users }] : []),
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`glass-panel border-r border-gray-800/60 h-screen flex flex-col justify-between p-4 fixed left-0 top-0 z-40 transition-all duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-64 lg:w-16 lg:p-2' : 'w-64'}`}
      >
        <div>
          {/* Brand Header */}
          <div className={`flex items-center justify-between py-3 mb-6 ${isCollapsed ? 'px-3 lg:px-0 lg:justify-center' : 'px-3'}`}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0"
                title="Smart Team Workspace"
              >
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div className={isCollapsed ? 'lg:hidden' : ''}>
                <h1 className="font-bold text-lg text-white leading-tight">Smart Team Workspace</h1>
                <span className="text-xs text-indigo-400 font-medium">Agile & AI Workspace</span>
              </div>
            </div>

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Selected Active Context */}
          {selectedProjectName && (
            <div className={`mx-2 mb-5 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 ${isCollapsed ? 'lg:hidden' : ''}`}>
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
                  onClick={() => handleNavClick(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isCollapsed ? 'lg:justify-center lg:px-0' : ''
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-gray-800/80">
          <div className={`flex items-center justify-between px-2 ${isCollapsed ? 'lg:flex-col lg:gap-2 lg:px-0' : ''}`}>
            <button
              onClick={() => setIsProfileOpen(true)}
              className={`flex items-center gap-3 text-left hover:opacity-80 transition-opacity focus:outline-none ${
                isCollapsed ? 'lg:max-w-full' : 'max-w-[80%]'
              }`}
              title={user?.full_name || 'View profile settings'}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow-inner shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className={`overflow-hidden ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
                <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1">
                  <Settings className="w-3 h-3 text-gray-500" />
                  SETTINGS
                </span>
              </div>
            </button>
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

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};

