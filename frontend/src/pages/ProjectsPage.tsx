import React, { useState } from 'react';
import { Plus, Users, Calendar, ArrowRight, Edit3, Lock, Trash2 } from 'lucide-react';
import type { Project } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { ProjectModal } from '../components/projects/ProjectModal';
import { MemberManagementModal } from '../components/projects/MemberManagementModal';
import { ProjectCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';

interface ProjectsPageProps {
  projects: Project[];
  loading?: boolean;
  onSelectProject: (project: Project) => void;
  onRefreshProjects: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  loading = false,
  onSelectProject,
  onRefreshProjects,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Project | null>(null);
  const [selectedForMembers, setSelectedForMembers] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  const getProjectUserRole = (project: Project) => {
    if (user?.role === 'ADMIN') return 'OWNER';
    const member = project.members?.find((m) => m.user_id === user?.id);
    return member?.project_role || null;
  };

  const canEdit = (project: Project) => {
    if (user?.role === 'ADMIN') return true;
    const role = getProjectUserRole(project);
    return role === 'OWNER' || role === 'MANAGER';
  };

  const canClose = (project: Project) => {
    if (user?.role === 'ADMIN') return true;
    const role = getProjectUserRole(project);
    return role === 'OWNER';
  };

  const canDelete = () => {
    return user?.role === 'ADMIN';
  };

  const handleCloseProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to close "${project.name}"? This will lock the project to read-only.`)) return;
    setActionLoading(project.id);
    try {
      await api.patch(`/projects/${project.id}/close`);
      toast.success('Project closed', `"${project.name}" is now marked as CLOSED.`);
      onRefreshProjects();
    } catch (err: any) {
      toast.error('Failed to close project', err.response?.data?.detail || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`WARNING: Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`)) return;
    setActionLoading(project.id);
    try {
      await api.delete(`/projects/${project.id}`);
      toast.success('Project deleted', `"${project.name}" has been permanently removed.`);
      onRefreshProjects();
    } catch (err: any) {
      toast.error('Failed to delete project', err.response?.data?.detail || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Projects Workspace</h1>
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
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="Không tìm thấy dự án nào"
          description="Chưa có dự án nào khớp với bộ lọc hiện tại. Bắt đầu bằng cách tạo dự án mới cho nhóm của bạn."
          actionText={user?.role === 'PM' || user?.role === 'ADMIN' ? '+ Tạo dự án mới' : undefined}
          onAction={() => setIsCreateOpen(true)}
        />
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

              {/* Actions row inside card */}
              <div className="mt-6 pt-4 border-t border-gray-800/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
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
                  {(user?.role === 'PM' || user?.role === 'ADMIN' || project.owner_id === user?.id) && (
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
          toast.success(
            selectedForEdit ? 'Project updated' : 'Project created',
            selectedForEdit ? 'Project details updated successfully.' : 'New project created successfully.'
          );
          onRefreshProjects();
        }}
      />

      {/* Member management */}
      <MemberManagementModal
        isOpen={!!selectedForMembers}
        onClose={() => setSelectedForMembers(null)}
        project={selectedForMembers}
        onMembersUpdated={() => {
          toast.success('Members updated', 'Project team members updated successfully.');
          onRefreshProjects();
        }}
      />
    </div>
  );
};

