import React from 'react';
import { Search, ChevronDown, Menu } from 'lucide-react';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import type { Project } from '../../types/api';

interface HeaderProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectTask?: (taskId: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  searchQuery,
  setSearchQuery,
  onSelectTask,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="h-16 glass-panel border-b border-gray-800/60 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 ml-0 lg:ml-64 transition-all duration-300">
      {/* Left controls: Mobile menu toggle & Project selector */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
            title="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative max-w-[180px] sm:max-w-xs">
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const proj = projects.find((p) => p.id === e.target.value);
              if (proj) onSelectProject(proj);
            }}
            className="w-full appearance-none bg-gray-900/80 border border-gray-700/60 text-white text-xs sm:text-sm font-semibold rounded-xl px-3 sm:px-4 py-2 pr-8 sm:pr-10 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer truncate"
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id} className="bg-gray-900 text-white">
                {proj.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Right controls: Search bar & Notifications */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative w-36 sm:w-64 md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks, members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl pl-9 pr-3 sm:pr-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <NotificationDrawer onSelectTask={onSelectTask} />
      </div>
    </header>
  );
};

