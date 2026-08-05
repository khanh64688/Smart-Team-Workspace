import React, { useState } from 'react';
import { Plus, Users, Calendar, ArrowRight, FolderKanban } from 'lucide-react';
import type { Project } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { MemberManagementModal } from '../components/projects/MemberManagementModal';

interface ProjectsPageProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onRefreshProjects: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  onSelectProject,
  onRefreshProjects,
}) => {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForMembers, setSelectedForMembers] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="p-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects Workspace</h1>
          <p className="text-xs text-gray-400 mt-1">Select a project to manage tasks, Sprints, and view AI progress reports</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800">
            {['ALL', 'ACTIVE', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {(user?.role === 'PM' || user?.role === 'ADMIN') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-gray-800/80 my-8">
          <FolderKanban className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white">No Projects Found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 mb-6">
            You don't have active projects matching the current filter. Create a new project to get started.
          </p>
          {(user?.role === 'PM' || user?.role === 'ADMIN') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
            >
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="glass-panel glass-panel-hover p-6 rounded-3xl border border-gray-800/80 flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      project.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-gray-700/30 text-gray-400 border border-gray-700/30'
                    }`}
                  >
                    {project.status}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-xs text-gray-400 mt-2 line-clamp-2 min-h-[2.5rem]">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2 overflow-hidden">
                    {project.members && project.members.slice(0, 3).map((m, idx) => (
                      <div
                        key={idx}
                        className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border-2 border-gray-900 flex items-center justify-center text-[10px] font-bold text-white"
                        title={m.user?.full_name}
                      >
                        {m.user?.full_name?.charAt(0) || 'U'}
                      </div>
                    ))}
                    {project.members && project.members.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center text-[9px] font-bold text-gray-300">
                        +{project.members.length - 3}
                      </div>
                    )}
                  </div>
                  {(user?.role === 'PM' || user?.role === 'ADMIN' || project.owner_id === user?.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedForMembers(project);
                      }}
                      className="p-1 text-gray-400 hover:text-indigo-400 hover:bg-gray-800/60 rounded-lg transition-colors"
                      title="Manage members"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectProject(project)}
                  className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  Open Board
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onProjectCreated={() => {
          onRefreshProjects();
        }}
      />

      <MemberManagementModal
        isOpen={!!selectedForMembers}
        onClose={() => setSelectedForMembers(null)}
        project={selectedForMembers}
        onMembersUpdated={() => {
          onRefreshProjects();
        }}
      />
    </div>
  );
};
