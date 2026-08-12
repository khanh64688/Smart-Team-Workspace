import React, { useState } from 'react';
import { X, UserPlus, Trash2, Users } from 'lucide-react';
import type { Project } from '../../types/api';
import { api } from '../../lib/api';

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
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const handleAddMember = async (targetEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/projects/${project.id}/members`, { email: targetEmail });
      setEmail('');
      onMembersUpdated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/projects/${project.id}/members/${userId}`);
      onMembersUpdated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member. Owner cannot be removed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-gray-800 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Project Members</h3>
              <p className="text-xs text-gray-400">{project.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Add Member Form */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Add Team Member</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email (e.g. an@twl.dev)"
              className="flex-1 bg-gray-900/80 border border-gray-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleAddMember(email)}
              disabled={loading || !email}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="mt-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Current Members ({project.members?.length || 0})
          </h4>
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-800/60 pr-1">
            {project.members && project.members.length > 0 ? (
              project.members.map((m) => (
                <div key={m.user_id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                      {m.user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {m.user?.full_name}{' '}
                        {m.user_id === project.owner_id && (
                          <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                            Owner
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500">{m.user?.email}</p>
                    </div>
                  </div>
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
