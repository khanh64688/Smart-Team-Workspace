import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api, MemberOut, User } from "../services/api";
import { 
  Users, 
  Plus, 
  Trash2, 
  Shield, 
  Check, 
  Mail,
  UserCheck,
  Search,
  UserMinus,
  AlertTriangle
} from "lucide-react";

interface MembersTabProps {
  projectId: string;
  members: MemberOut[];
  onMembersUpdated: () => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({ projectId, members, onMembersUpdated }) => {
  const { user } = useAuth();
  
  const [emailQuery, setEmailQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<"MANAGER" | "MEMBER">("MEMBER");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load all users from localStorage mock for suggestions
  useEffect(() => {
    // Read from the mock store
    const data = localStorage.getItem("stw_users");
    if (data) {
      try {
        setAllUsers(JSON.parse(data));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  // Filter suggestions based on typed query
  useEffect(() => {
    if (emailQuery.trim().length > 0) {
      const q = emailQuery.toLowerCase();
      const currentMemberIds = members.map((m) => m.user_id);
      
      const filtered = allUsers.filter(
        (u) => 
          (u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q)) && 
          !currentMemberIds.includes(u.id)
      );
      setSuggestedUsers(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestedUsers([]);
      setShowSuggestions(false);
    }
  }, [emailQuery, allUsers, members]);

  // Check if current user is PM/Owner/Admin
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isOwnerOrManager = currentMember?.project_role === "OWNER" || currentMember?.project_role === "MANAGER" || user?.role === "ADMIN";

  const handleAddMember = async (targetEmail: string) => {
    setError("");
    setSuccess("");
    try {
      await api.projects.addMember(projectId, targetEmail, selectedRole);
      setSuccess("Đã thêm thành viên mới vào dự án.");
      setEmailQuery("");
      setShowSuggestions(false);
      onMembersUpdated();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Không thể thêm thành viên.");
    }
  };

  const handleChangeRole = async (memberId: string, newRole: "OWNER" | "MANAGER" | "MEMBER") => {
    setError("");
    try {
      await api.projects.changeMemberRole(projectId, memberId, newRole);
      onMembersUpdated();
    } catch (err: any) {
      setError(err.message || "Cập nhật vai trò thất bại.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setError("");
    const isSelf = memberId === user?.id;
    const confirmMsg = isSelf 
      ? "Bạn có chắc chắn muốn rời khỏi dự án này không?" 
      : "Bạn có chắc chắn muốn xóa thành viên này khỏi dự án không?";
      
    if (confirm(confirmMsg)) {
      try {
        await api.projects.removeMember(projectId, memberId);
        onMembersUpdated();
        if (isSelf) {
          // Redirect to projects list if left project
          window.location.href = "/projects";
        }
      } catch (err: any) {
        setError(err.message || "Xóa thành viên thất bại.");
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Add Form block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          <span>Danh sách thành viên dự án ({members.length})</span>
        </h3>

        {/* Add Member Form (PM only) */}
        {isOwnerOrManager && (
          <div className="relative flex flex-wrap gap-2 items-center w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64 min-w-[200px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                placeholder="Gõ tên hoặc email thành viên..."
                className="w-full rounded-lg border border-slate-900 bg-slate-900/60 py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/80 focus:outline-none"
              />
              
              {/* Auto suggestions list */}
              {showSuggestions && suggestedUsers.length > 0 && (
                <div className="absolute left-0 mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/60">
                  {suggestedUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleAddMember(u.email)}
                      className="px-3 py-2 text-xs hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition duration-150"
                    >
                      <div>
                        <div className="font-semibold text-slate-300">{u.full_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                      </div>
                      <Plus className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as "MANAGER" | "MEMBER")}
              className="rounded-lg border border-slate-900 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-400 focus:border-cyan-500/80 focus:outline-none"
            >
              <option value="MEMBER">Vai trò Member</option>
              <option value="MANAGER">Vai trò Manager</option>
            </select>
          </div>
        )}
      </div>

      {/* Message alerts */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-950/20 border border-red-800/50 p-3 text-xs text-red-400">
          <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/20 p-3 text-xs text-emerald-400">
          <Check className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Members Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => {
          const isSelf = m.user_id === user?.id;
          return (
            <div 
              key={m.user_id}
              className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-slate-800 transition duration-200"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-800 bg-slate-900 shrink-0">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.full_name)}`} alt="avatar" className="h-full w-full" />
                </div>
                
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-sm text-slate-200 truncate flex items-center gap-1.5">
                    <span>{m.full_name}</span>
                    {isSelf && (
                      <span className="rounded bg-slate-800 border border-slate-700 px-1 py-0.2 text-[8px] font-bold text-slate-400 font-mono">Bạn</span>
                    )}
                  </h5>
                  <p className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span>{m.email}</span>
                  </p>
                </div>
              </div>

              {/* Roles switcher or display */}
              <div className="flex items-center justify-between border-t border-slate-900/60 pt-3 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  {isOwnerOrManager && m.project_role !== "OWNER" ? (
                    <select
                      value={m.project_role}
                      onChange={(e) => handleChangeRole(m.user_id, e.target.value as "MANAGER" | "MEMBER")}
                      className="rounded border border-slate-850 bg-slate-950 px-2 py-0.5 text-xs text-slate-400 font-semibold focus:outline-none"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wide">
                      {m.project_role}
                    </span>
                  )}
                </div>

                {/* Actions: leave or kick */}
                {isSelf && m.project_role !== "OWNER" ? (
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="text-xs font-bold text-red-400 hover:underline flex items-center gap-1"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    <span>Rời dự án</span>
                  </button>
                ) : (
                  isOwnerOrManager && m.project_role !== "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="rounded p-1 text-slate-500 hover:bg-red-950/20 hover:text-red-400 transition"
                      title="Xóa thành viên khỏi dự án"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
