import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Trash2, 
  X, 
  RefreshCw,
  Filter,
  Eye,
  User as UserIcon,
  Shield
} from 'lucide-react';
import { api } from '../lib/api';
import type { User, UserRole } from '../types/api';

import { useToast } from '../context/ToastContext';

export const UserManagementPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Admin Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('MEMBER');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // User Detail View Modal (GET /users/{user_id})
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);

  const handleViewUserDetail = async (userId: string) => {
    try {
      const res = await api.get<User>(`/users/${userId}`);
      if (res.data) {
        setSelectedUserDetail(res.data);
      }
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to fetch user details.');
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (activeFilter !== 'ALL') params.is_active = activeFilter === 'ACTIVE';

      // Backend returns either User[] or { data: User[], meta: ... }
      const res = await api.get('/users', { params });
      let list: User[] = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res.data?.data)) {
        list = res.data.data;
      }
      setUsers(list);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.detail || 'Failed to fetch user list.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, activeFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await api.post('/users', {
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
      });
      setIsCreateOpen(false);
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('MEMBER');
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create user account.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const originalUsers = [...users];
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    try {
      const res = await api.patch(`/users/${userId}/role`, { role: newRole });
      if (res.data) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: res.data.role } : u)));
        showSuccess('Cập nhật vai trò hệ thống thành công!');
      }
    } catch (err: any) {
      setUsers(originalUsers);
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Không thể cập nhật vai trò người dùng.';
      showError(message);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const originalUsers = [...users];
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: nextStatus } : u)));
    try {
      const res = await api.patch(`/users/${userId}/active`, { is_active: nextStatus });
      if (res.data) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: res.data.is_active } : u)));
        showSuccess(nextStatus ? 'Đã mở khóa tài khoản thành công!' : 'Đã khóa tài khoản thành công!');
      }
    } catch (err: any) {
      setUsers(originalUsers);
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Không thể cập nhật trạng thái người dùng.';
      showError(message);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${name}"?`)) return;
    try {
      await api.delete(`/users/${userId}`);
      showSuccess(`Đã xóa tài khoản "${name}" thành công!`);
      fetchUsers();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Không thể xóa người dùng.';
      showError(message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">System User Administration</h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Manage user accounts, assign system roles, lock/unlock active states & provision new users.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Create User Account
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email address..."
            className="w-full bg-gray-900/80 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-gray-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-gray-900 text-white">All Roles</option>
              <option value="ADMIN" className="bg-gray-900 text-white">ADMIN</option>
              <option value="PM" className="bg-gray-900 text-white">PM</option>
              <option value="MEMBER" className="bg-gray-900 text-white">MEMBER</option>
            </select>
          </div>

          {/* Active Filter */}
          <div className="flex items-center gap-1.5 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent text-gray-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-gray-900 text-white">All Status</option>
              <option value="ACTIVE" className="bg-gray-900 text-white">Active Only</option>
              <option value="INACTIVE" className="bg-gray-900 text-white">Locked / Inactive</option>
            </select>
          </div>

          <button
            onClick={fetchUsers}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel rounded-3xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-900/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-6 font-semibold">User Profile</th>
                <th className="py-3.5 px-4 font-semibold">Email</th>
                <th className="py-3.5 px-4 font-semibold">System Role</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Joined Date</th>
                <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-900/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{u.full_name}</p>
                          <span className="text-[10px] text-gray-500 font-mono">ID: {u.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-300 font-mono">{u.email}</td>
                    <td className="py-4 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="bg-gray-900 border border-gray-700 text-indigo-300 font-bold px-2.5 py-1 rounded-lg text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="PM">PM</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] transition-all ${
                          u.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                        }`}
                        title="Click to toggle status"
                      >
                        {u.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {u.is_active ? 'ACTIVE' : 'LOCKED'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-gray-400 text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewUserDetail(u.id)}
                        className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="View User Detail (GET /users/{user_id})"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.full_name)}
                        className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No users matching search filters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Admin Create User */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-gray-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Create New User Account</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nguyễn Văn A"
                  className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@fpt.edu.vn"
                  className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="MEMBER">MEMBER (Team Member)</option>
                  <option value="PM">PM (Project Manager)</option>
                  <option value="ADMIN">ADMIN (System Administrator)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View User Details (GET /users/{user_id}) */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-3xl border border-gray-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">User Account Details</h3>
              </div>
              <button onClick={() => setSelectedUserDetail(null)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4 text-xs">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-800">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-base font-bold text-white shadow-inner shrink-0">
                  {selectedUserDetail.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedUserDetail.full_name}</h4>
                  <p className="text-gray-400 font-mono text-[11px]">{selectedUserDetail.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-1">
                    <Shield className="w-3 h-3 text-indigo-400" /> System Role
                  </span>
                  <span className="font-bold text-indigo-300 text-xs">{selectedUserDetail.role}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-1">
                    <UserCheck className="w-3 h-3 text-emerald-400" /> Account Status
                  </span>
                  <span className={`font-bold text-xs ${selectedUserDetail.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedUserDetail.is_active ? 'ACTIVE' : 'LOCKED'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">User UUID:</span>
                  <span className="text-gray-200">{selectedUserDetail.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created At:</span>
                  <span className="text-gray-200">{selectedUserDetail.created_at ? new Date(selectedUserDetail.created_at).toLocaleString() : 'N/A'}</span>
                </div>
                {selectedUserDetail.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Updated At:</span>
                    <span className="text-gray-200">{new Date(selectedUserDetail.updated_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-6 border-t border-gray-800">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
