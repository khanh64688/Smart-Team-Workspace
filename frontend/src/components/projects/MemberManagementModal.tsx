import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Users, ShieldCheck, LogOut } from 'lucide-react';
import type { Project, MemberOut, User, ProjectRole } from '../../types/api';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

import { useToast } from '../../context/ToastContext';

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onMembersUpdated: () => void;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  isOpen,
  onClose,
  project,
  onMembersUpdated,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState('');
  const [canConfig, setCanConfig] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membersList, setMembersList] = useState<MemberOut[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      fetchMembers();
    } else {
      setMembersList([]);
    }
  }, [isOpen, project?.id]);

  const fetchMembers = async () => {
    if (!project) return;
    setFetchingMembers(true);
    try {
      const res = await api.get<MemberOut[]>(`/projects/${project.id}/members`);
      if (Array.isArray(res.data)) {
        setMembersList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setFetchingMembers(false);
    }
  };

  if (!isOpen || !project) return null;

  const handleAddMember = async (targetEmail: string) => {
    if (!targetEmail.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const usersRes = await api.get<{ data: User[] }>('/users', { params: { q: targetEmail.trim() } });
      const list = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data ?? [];
      const matchedUser = list.find(
        (u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase()
      );

      if (!matchedUser) {
        const msg = 'No user found with this email address.';
        setError(msg);
        showError(msg);
        setLoading(false);
        return;
      }

      await api.post(`/projects/${project.id}/members`, {
        user_id: matchedUser.id,
        project_role: selectedRole,
        can_config: canConfig,
      });

      showSuccess('Thêm thành viên vào dự án thành công!');
      setEmail('');
      setCanConfig(false);
      setSelectedRole('MEMBER');
      fetchMembers();
      onMembersUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to add member.';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ProjectRole) => {
    try {
      await api.patch(`/projects/${project.id}/members/${userId}`, { project_role: newRole });
      showSuccess('Cập nhật vai trò thành viên thành công!');
      fetchMembers();
      onMembersUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update member role.';
      setError(msg);
      showError(msg);
    }
  };

  const handleToggleConfig = async (userId: string, currentVal: boolean) => {
    try {
      await api.patch(`/projects/${project.id}/members/${userId}/config`, { can_config: !currentVal });
      showSuccess('Cập nhật quyền cấu hình thành công!');
      fetchMembers();
      onMembersUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update member config permission.';
      setError(msg);
      showError(msg);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/projects/${project.id}/members/${userId}`);
      showSuccess('Đã xóa thành viên khỏi dự án!');
      fetchMembers();
      onMembersUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to remove member. Owner cannot be removed.';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveProject = async () => {
    if (!confirm('Are you sure you want to leave this project?')) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/projects/${project.id}/members/me`);
      showSuccess('Bạn đã rời khỏi dự án!');
      onMembersUpdated();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to leave project.';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-gray-800 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Project Members & Access</h3>
              <p className="text-xs text-gray-400">{project.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && user.id !== project.owner_id && (
              <button
                onClick={handleLeaveProject}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Leave Project"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave
              </button>
            )}
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Add Member Form */}
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-semibold text-gray-300">Add Team Member</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email (e.g. user@fpt.edu.vn)"
              className="flex-1 bg-gray-900/80 border border-gray-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
              className="bg-gray-900 border border-gray-700 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
            >
              <option value="MEMBER">MEMBER</option>
              <option value="MANAGER">MANAGER</option>
            </select>
            <button
              onClick={() => handleAddMember(email)}
              disabled={loading || !email}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="canConfigCheckbox"
              checked={canConfig}
              onChange={(e) => setCanConfig(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="canConfigCheckbox" className="text-[11px] text-gray-400 font-medium">
              Grant project configuration permission (<code className="text-indigo-300">can_config</code>)
            </label>
          </div>
        </div>

        {/* Members List */}
        <div className="mt-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Current Members ({membersList.length})
          </h4>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-800/60 pr-1">
            {fetchingMembers ? (
              <p className="py-4 text-xs text-gray-500 text-center">Loading project members...</p>
            ) : membersList.length > 0 ? (
              membersList.map((m) => (
                <div key={m.user_id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {m.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {m.full_name}{' '}
                        {m.user_id === project.owner_id && (
                          <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                            Owner
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Role selector */}
                    {m.user_id !== project.owner_id ? (
                      <select
                        value={m.project_role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value as ProjectRole)}
                        className="bg-gray-900 border border-gray-700/80 text-[11px] text-indigo-300 font-semibold px-2 py-1 rounded-lg focus:outline-none"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="OWNER">OWNER</option>
                      </select>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded">
                        OWNER
                      </span>
                    )}

                    {/* Can config toggle button (Only applicable for MEMBER role, and set by OWNER/ADMIN) */}
                    {m.project_role === 'OWNER' || m.project_role === 'MANAGER' ? (
                      <span
                        className="p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 bg-indigo-600/10 text-indigo-400 border-indigo-500/30 cursor-not-allowed"
                        title="OWNER và MANAGER luôn có quyền config"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Config OK
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleConfig(m.user_id, !!m.can_config)}
                        disabled={!(user?.role === 'ADMIN' || user?.id === project.owner_id || membersList.find(cur => cur.user_id === user?.id)?.project_role === 'OWNER')}
                        className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                          m.can_config
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        title={
                          !(user?.role === 'ADMIN' || user?.id === project.owner_id || membersList.find(cur => cur.user_id === user?.id)?.project_role === 'OWNER')
                            ? 'Chỉ OWNER dự án hoặc ADMIN hệ thống mới được sửa quyền config'
                            : 'Bật/tắt quyền config cho MEMBER'
                        }
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {m.can_config ? 'Config OK' : 'No Config'}
                      </button>
                    )}

                    {/* Remove member button */}
                    {m.user_id !== project.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-xs text-gray-500 text-center">No members found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

