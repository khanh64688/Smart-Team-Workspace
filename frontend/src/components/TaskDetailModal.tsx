import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { Task, Comment, MemberOut, Sprint } from "../services/api";
import { 
  X, 
  Calendar, 
  User, 
  Tag, 
  Send, 
  Trash2, 
  AlertOctagon, 
  Clock, 
  Layers, 
  CheckCircle,
  FileText,
  AlertCircle
} from "lucide-react";

interface TaskDetailModalProps {
  projectId: string;
  members: MemberOut[];
  sprints: Sprint[];
  onTasksUpdated: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ projectId, members, sprints, onTasksUpdated }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get("task");

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form edit states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("TODO");
  const [priority, setPriority] = useState<Task["priority"]>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  
  const [error, setError] = useState("");

  const fetchTaskDetails = async (id: string) => {
    try {
      const data = await api.tasks.get(id);
      setTask(data);
      // Init form states
      setTitle(data.title);
      setDescription(data.description);
      setStatus(data.status);
      setPriority(data.priority);
      setAssigneeId(data.assignee_id);
      setSprintId(data.sprint_id);
      setDeadline(data.deadline ? data.deadline.substring(0, 10) : "");

      // Fetch comments
      const comms = await api.tasks.listComments(id);
      setComments(comms);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails(taskId);
      setEditMode(false);
      setError("");
    } else {
      setTask(null);
    }
  }, [taskId]);

  if (!taskId || !task) return null;

  const handleClose = () => {
    const currentParams = Object.fromEntries(searchParams.entries());
    const { task: _, ...rest } = currentParams;
    setSearchParams(rest);
  };

  // Check permissions: PM / Owner / Admin can edit everything. Assignee can edit status.
  const projectMember = members.find((m) => m.user_id === user?.id);
  const isOwnerOrManager = projectMember?.project_role === "OWNER" || projectMember?.project_role === "MANAGER" || user?.role === "ADMIN";
  const isAssignee = task.assignee_id === user?.id;
  const canEditEverything = isOwnerOrManager;
  const canEditStatus = isOwnerOrManager || isAssignee;

  // Check if overdue
  const now = new Date();
  const deadlineDate = new Date(task.deadline);
  const isOverdue = task.status !== "DONE" && deadlineDate < now;

  const handleStatusQuickChange = async (newStatus: Task["status"]) => {
    if (!canEditStatus) return;
    try {
      // Validate Kanban transition
      const states: Task["status"][] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
      const oldIdx = states.indexOf(task.status);
      const newIdx = states.indexOf(newStatus);
      if (Math.abs(oldIdx - newIdx) > 1) {
        setError("Chỉ được di chuyển task tiến hoặc lùi 1 bước (ví dụ: Todo ↔ In Progress).");
        return;
      }

      setError("");
      await api.tasks.update(task.id, { status: newStatus });
      fetchTaskDetails(task.id);
      onTasksUpdated();
    } catch (err: any) {
      setError(err.message || "Lỗi cập nhật trạng thái");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditEverything) return;
    if (!title.trim()) {
      setError("Tiêu đề không được để trống.");
      return;
    }
    setLoading(true);
    try {
      await api.tasks.update(task.id, {
        title,
        description,
        status,
        priority,
        assignee_id: assigneeId === "UNASSIGNED" ? null : assigneeId,
        sprint_id: sprintId === "UNASSIGNED" ? null : sprintId,
        deadline: new Date(deadline).toISOString(),
      });
      setEditMode(false);
      setError("");
      fetchTaskDetails(task.id);
      onTasksUpdated();
    } catch (err: any) {
      setError(err.message || "Cập nhật thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!canEditEverything) return;
    if (confirm("Bạn có chắc chắn muốn xóa công việc này không?")) {
      try {
        await api.tasks.delete(task.id);
        handleClose();
        onTasksUpdated();
      } catch (err: any) {
        setError(err.message || "Xóa thất bại.");
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.tasks.createComment(task.id, newComment);
      setNewComment("");
      // Refetch comments
      const comms = await api.tasks.listComments(task.id);
      setComments(comms);
      onTasksUpdated();
    } catch (err: any) {
      setError(err.message || "Không thể gửi bình luận.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.tasks.deleteComment(commentId);
      const comms = await api.tasks.listComments(task.id);
      setComments(comms);
    } catch (err: any) {
      setError(err.message || "Không thể xóa bình luận.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl h-[90vh] md:h-[80vh] flex flex-col rounded-2xl border border-slate-900 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 font-mono tracking-wider">#{task.id}</span>
            {isOverdue && (
              <span className="flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wider animate-pulse">
                <AlertCircle className="h-3 w-3" />
                <span>Trễ hạn</span>
              </span>
            )}
          </div>
          <button 
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Outer Split Pane Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT: Task Info (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-b md:border-b-0 md:border-r border-slate-800/60">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-950/20 border border-red-800/50 p-3 text-xs text-red-300">
                <AlertOctagon className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {editMode ? (
              /* --- Edit Form View --- */
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tiêu đề *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mô tả công việc</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Độ ưu tiên</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Task["priority"])}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 px-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="LOW">Thấp</option>
                      <option value="MEDIUM">Trung bình</option>
                      <option value="HIGH">Cao</option>
                      <option value="URGENT">Khẩn cấp</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Trạng thái</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Task["status"])}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 px-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="TODO">Cần làm</option>
                      <option value="IN_PROGRESS">Đang làm</option>
                      <option value="REVIEW">Đánh giá</option>
                      <option value="DONE">Hoàn thành</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Người phụ trách</label>
                    <select
                      value={assigneeId || "UNASSIGNED"}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 px-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="UNASSIGNED">Chưa giao việc</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sprint</label>
                    <select
                      value={sprintId || "UNASSIGNED"}
                      onChange={(e) => setSprintId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 px-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="UNASSIGNED">Chưa chia Sprint</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Hạn chót (Deadline)</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setError("");
                    }}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900/80 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition"
                  >
                    Hủy sửa
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-cyan-400 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition"
                  >
                    {loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            ) : (
              /* --- Read-Only Info View --- */
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-100 leading-snug">{task.title}</h3>
                  <p className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Chi tiết công việc</span>
                  </p>
                </div>

                {task.description ? (
                  <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 italic">Không có mô tả chi tiết cho công việc này.</p>
                )}

                {/* Attributes grid block */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Độ ưu tiên</span>
                    <span className={`inline-block text-xs font-bold rounded-md border px-2 py-0.5 uppercase tracking-wide ${
                      task.priority === "URGENT" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      task.priority === "HIGH" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                      task.priority === "MEDIUM" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      "bg-slate-800 text-slate-400 border-slate-800"
                    }`}>
                      {task.priority === "URGENT" ? "Khẩn cấp" : task.priority === "HIGH" ? "Cao" : task.priority === "MEDIUM" ? "Trung bình" : "Thấp"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Trạng thái</span>
                    <div className="relative inline-block">
                      {canEditStatus ? (
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusQuickChange(e.target.value as Task["status"])}
                          className="rounded-md border border-slate-850 bg-slate-950 px-2 py-0.5 text-xs text-slate-300 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="TODO">Cần làm</option>
                          <option value="IN_PROGRESS">Đang làm</option>
                          <option value="REVIEW">Đánh giá</option>
                          <option value="DONE">Hoàn thành</option>
                        </select>
                      ) : (
                        <span className="text-xs font-semibold text-slate-300">
                          {task.status === "TODO" ? "Cần làm" : task.status === "IN_PROGRESS" ? "Đang làm" : task.status === "REVIEW" ? "Đánh giá" : "Hoàn thành"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Người phụ trách</span>
                    </span>
                    <span className="text-slate-300 font-medium">
                      {members.find((m) => m.user_id === task.assignee_id)?.full_name ?? "Chưa được giao"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      <span>Sprint</span>
                    </span>
                    <span className="text-slate-300 font-medium">
                      {sprints.find((s) => s.id === task.sprint_id)?.name ?? "Chưa chia"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Hạn chót</span>
                    </span>
                    <span className={`font-mono text-xs font-semibold ${isOverdue ? "text-red-400" : "text-slate-400"}`}>
                      {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Edit & Delete Action Panel for PMs */}
                {canEditEverything && (
                  <div className="flex gap-2.5 border-t border-slate-800/80 pt-4">
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-900 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                    >
                      Chỉnh sửa thông tin
                    </button>
                    <button
                      onClick={handleDeleteTask}
                      className="rounded-lg border border-red-950 bg-red-950/10 px-4.5 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/30 hover:border-red-900 transition"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Comments Feed Section */}
          <div className="w-full md:w-80 flex flex-col bg-slate-950/20 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>Bình luận</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-slate-500 font-mono">
                  {comments.length}
                </span>
              </h4>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-xs text-slate-600 py-8 italic">Chưa có bình luận nào.</p>
              ) : (
                comments.map((c) => {
                  const isCommentAuthor = c.author_id === user?.id || user?.role === "ADMIN";
                  return (
                    <div key={c.id} className="space-y-1 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {c.author_avatar ? (
                            <img src={c.author_avatar} alt="avatar" className="h-5.5 w-5.5 rounded-full bg-slate-800" />
                          ) : (
                            <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold">
                              {c.author_name.charAt(0)}
                            </div>
                          )}
                          <span className="text-[11px] font-semibold text-slate-300">{c.author_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-600 font-mono">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isCommentAuthor && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 transition"
                              title="Xóa bình luận"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pl-7 break-words pr-2">
                        {c.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Gửi bình luận..."
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950/80 py-1.5 px-3 text-xs text-slate-200 placeholder-slate-600 transition focus:border-cyan-500/80 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="rounded-lg bg-cyan-400 hover:bg-cyan-300 p-2 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  <Send className="h-4.5 w-4.5 stroke-[2.5]" />
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
