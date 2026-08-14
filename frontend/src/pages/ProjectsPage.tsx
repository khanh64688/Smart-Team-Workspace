import React, { useState } from 'react';
import { Plus, Users, Calendar, ArrowRight, FolderKanban, Edit3, Trash2, ShieldCheck } from 'lucide-react';
import type { Project } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { ProjectModal } from '../components/projects/ProjectModal';
import { MemberManagementModal } from '../components/projects/MemberManagementModal';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

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
  const { showSuccess, showError } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Project | null>(null);
  const [selectedForMembers, setSelectedForMembers] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  // Permission helpers based on backend constraints
  const getProjectUserMember = (project: Project) => {
    return project.members?.find((m) => m.user_id === user?.id);
  };

  const getProjectUserRole = (project: Project) => {
    if (user?.role === 'ADMIN') return 'OWNER';
    if (project.owner_id === user?.id) return 'OWNER';
    const member = getProjectUserMember(project);
    return member?.project_role || null;
  };

  const hasConfigPermission = (project: Project) => {
    if (user?.role === 'ADMIN' || user?.role === 'PM') return true;
    if (project.owner_id === user?.id) return true;
    const member = getProjectUserMember(project);
    if (member?.project_role === 'OWNER' || member?.project_role === 'MANAGER') return true;
    return !!member?.can_config;
  };

  const canEdit = (project: Project) => {
    return hasConfigPermission(project);
  };

  const canManageMembers = (project: Project) => {
    return hasConfigPermission(project);
  };

  const canClose = (project: Project) => {
    if (user?.role === 'ADMIN' || user?.role === 'PM') return true;
    const role = getProjectUserRole(project);
    return role === 'OWNER' || hasConfigPermission(project);
  };

  const canDelete = () => {
    return user?.role === 'ADMIN';
  };

  const handleCloseProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to close "${project.name}"? This will lock the project to read-only.`)) return;
    setActionLoading(project.id);
    try {
      await api.patch(`/projects/${project.id}/close`);
      showSuccess('Đã đóng/lưu trữ dự án thành công!');
      onRefreshProjects();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to close project.';
      showError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`WARNING: Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`)) return;
    setActionLoading(project.id);
    try {
      await api.delete(`/projects/${project.id}`);
      showSuccess('Đã xóa dự án thành công!');
      onRefreshProjects();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete project.';
      showError(msg);
    } finally {
      setActionLoading(null);
    }
  };

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
              className={`glass-panel glass-panel-hover p-6 rounded-3xl border border-gray-800/80 flex flex-col justify-between relative group transition-all ${
                actionLoading === project.id ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        project.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-gray-700/30 text-gray-400 border border-gray-700/30'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {project.name}
                </h3>

                {getProjectUserMember(project)?.can_config && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md mt-1 mb-1" title="You have configuration permission on this project">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    Can Config
                  </span>
                )}

                <p className="text-xs text-gray-400 mt-2 line-clamp-2 min-h-[2.5rem]">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Actions row inside card */}
              <div className="mt-6 pt-4 border-t border-gray-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Members list */}
                  <div className="flex -space-x-2 overflow-hidden mr-1">
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

                  {/* Manage Members button */}
                  {canManageMembers(project) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedForMembers(project);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-800/60 rounded-lg transition-colors"
                      title="Manage members"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  )}

                  {/* Edit settings button */}
                  {canEdit(project) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedForEdit(project);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-800/60 rounded-lg transition-colors"
                      title="Edit Project"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Close Project button */}
                  {canClose(project) && project.status === 'ACTIVE' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseProject(project);
                      }}
                      className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      title="Close Project"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Project button */}
                  {canDelete() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
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

      {/* Project Modal (Create/Edit) */}
      <ProjectModal
        isOpen={isCreateOpen || !!selectedForEdit}
        onClose={() => {
          setIsCreateOpen(false);
          setSelectedForEdit(null);
        }}
        project={selectedForEdit}
        onSuccess={() => {
          onRefreshProjects();
        }}
      />

      {/* Member management */}
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
