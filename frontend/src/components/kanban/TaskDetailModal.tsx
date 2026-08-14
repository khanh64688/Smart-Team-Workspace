import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, AlertTriangle, Trash2, Edit3, Check, Save } from 'lucide-react';
import type { Task, Comment, User, TaskStatus, TaskPriority, Sprint } from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  members: User[];
  sprints?: Sprint[];
  canConfig?: boolean;
  canManageMembers?: boolean;
  onTaskUpdated: (updatedTask: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  REVIEW: 2,
  DONE: 3,
};

const getValidNextStatuses = (currentStatus: TaskStatus): TaskStatus[] => {
  const currentIdx = STATUS_ORDER[currentStatus];
  const all: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
  return all.filter((st) => Math.abs(STATUS_ORDER[st] - currentIdx) <= 1);
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  members,
  sprints = [],
  canConfig = true,
  canManageMembers = false,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM');
  const [editSprintId, setEditSprintId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPosting, setCommentPosting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync edit state when task changes
  useEffect(() => {
    if (isOpen && task) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setEditPriority(task.priority);
      setEditSprintId(task.sprint_id || '');
      setEditDueDate(task.due_date ? task.due_date.substring(0, 10) : '');
      setIsEditing(false);
      setIsDeleteConfirmOpen(false);
    }
  }, [isOpen, task]);

  // Fetch comments when modal opens for a task
  useEffect(() => {
    if (isOpen && task) {
      setCommentsLoading(true);
      api
        .get<Comment[]>(`/tasks/${task.id}/comments`)
        .then((res) => {
          setComments(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {
          setComments([]);
        })
        .finally(() => {
          setCommentsLoading(false);
        });
    } else {
      setComments([]);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!canConfig) {
      showError('Bạn không có quyền chuyển trạng thái công việc (can_config = false).');
      return;
    }
    const currentIdx = STATUS_ORDER[task.status];
    const newIdx = STATUS_ORDER[newStatus];
    if (Math.abs(newIdx - currentIdx) > 1) {
      showError('Trạng thái công việc chỉ được phép di chuyển từng bước một (Todo ↔ In Progress ↔ Review ↔ Done).');
      return;
    }

    try {
      const res = await api.put<Task>(`/tasks/${task.id}/move`, {
        status: newStatus,
      });
      onTaskUpdated(res.data);
      showSuccess(`Đã chuyển công việc sang ${newStatus}!`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Không thể đổi trạng thái công việc.';
      showError(msg);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!canManageMembers) {
      showError('Chỉ Quản lý dự án mới có quyền gán lại công việc.');
      return;
    }

    try {
      const res = await api.patch<Task>(`/tasks/${task.id}/assign`, {
        assignee_id: newAssigneeId || null,
      });
      onTaskUpdated(res.data);
      showSuccess('Đã cập nhật người thực hiện công việc!');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Không thể gán lại công việc.';
      showError(msg);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfig) return;
    if (!editTitle.trim()) {
      showError('Tiêu đề công việc không được để trống.');
      return;
    }

    setSaveLoading(true);
    try {
      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        sprint_id: editSprintId || null,
      };
      if (editDueDate) {
        payload.due_date = new Date(editDueDate + 'T23:59:59Z').toISOString();
      }

      const res = await api.put<Task>(`/tasks/${task.id}`, payload);
      onTaskUpdated(res.data);
      setIsEditing(false);
      showSuccess('Cập nhật thông tin công việc thành công!');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Không thể lưu thay đổi công việc.';
      showError(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user || !task || commentPosting) return;

    setCommentPosting(true);
    try {
      const res = await api.post<Comment>(`/tasks/${task.id}/comments`, {
        content: commentText.trim(),
      });
      const newComment = res.data;
      const populated: Comment = {
        ...newComment,
        author_id: newComment.author_id || user.id,
        user_id: user.id,
        user: user,
      };
      setComments((prev) => [...prev, populated]);
      onTaskUpdated({ ...task, comments_count: (task.comments_count || 0) + 1 });
      setCommentText('');
      showSuccess('Đã thêm bình luận mới!');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Không thể đăng bình luận.';
      showError(msg);
    } finally {
      setCommentPosting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      const res = await api.put<Comment>(`/comments/${commentId}`, {
        content: editingCommentText.trim(),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: res.data?.content || editingCommentText.trim() } : c))
      );
      setEditingCommentId(null);
      setEditingCommentText('');
      showSuccess('Cập nhật bình luận thành công!');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        (typeof err.response?.data?.detail === 'string' ? err.response.data.detail : null) ||
        'Không thể sửa bình luận.';
      showError(msg);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (task) {
        onTaskUpdated({ ...task, comments_count: Math.max(0, (task.comments_count || 1) - 1) });
      }
      showSuccess('Đã xóa bình luận!');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Không thể xóa bình luận.';
      showError(msg);
    }
  };

  const handleDeleteTask = () => {
    if (!canConfig) {
      showError('Bạn không có quyền xóa công việc (can_config = false).');
      return;
    }
    setIsDeleteConfirmOpen(true);
  };

  const executeDeleteTask = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      showSuccess('Đã xóa công việc thành công!');
      setIsDeleteConfirmOpen(false);
      if (onTaskDeleted) onTaskDeleted(task.id);
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; error?: { message?: string } } } };
      const msg =
        axiosErr?.response?.data?.error?.message ||
        (typeof axiosErr?.response?.data?.detail === 'string' ? axiosErr.response.data.detail : null) ||
        'Không thể xóa công việc. Vui lòng kiểm tra lại quyền truy cập.';
      showError(msg);
      setIsDeleteConfirmOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getCommentAuthorName = (c: Comment): string => {
    if (c.user?.full_name) return c.user.full_name;
    const authorId = c.author_id || c.user_id;
    if (!authorId) return 'Anonymous';
    const found = members.find((m) => m.id === authorId);
    return found?.full_name || 'Member';
  };

  const validStatuses = getValidNextStatuses(task.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-3xl glass-panel rounded-3xl border border-gray-800 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-800 shrink-0">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {task.priority} Priority
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {task.status}
              </span>
              {task.is_overdue && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>

            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-gray-900 border border-indigo-500 rounded-xl px-3 py-1.5 text-base font-bold text-white focus:outline-none"
              />
            ) : (
              <h2 className="text-lg font-bold text-white leading-snug">{task.title}</h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canConfig && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-indigo-400 hover:bg-indigo-600/20 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Edit Task"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
            {canConfig && (
              <button
                onClick={handleDeleteTask}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-6 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {/* Editing Mode Form */}
          {isEditing ? (
            <form onSubmit={handleSaveMetadata} className="space-y-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-800">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Edit Task Details</h4>
              
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Sprint</label>
                  <select
                    value={editSprintId}
                    onChange={(e) => setEditSprintId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold"
                  >
                    <option value="">No Sprint (Backlog)</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            /* Normal Controls Bar */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-800/80">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={task.status}
                  disabled={!canConfig}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Assignee {!canManageMembers && '(Locked)'}
                </label>
                <select
                  value={task.assignee_id || ''}
                  disabled={!canManageMembers}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Due Date
                </label>
                <div className="text-xs font-semibold text-gray-300 py-1.5">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Due Date'}
                </div>
              </div>
            </div>
          )}

          {/* Sprint info if assigned */}
          {task.sprint_id && (
            <div className="flex items-center gap-4 text-xs bg-indigo-950/30 p-3 rounded-2xl border border-indigo-500/20">
              <div>
                <span className="font-semibold text-gray-300">Sprint: </span>
                <span className="text-indigo-400 font-semibold">
                  {sprints.find((s) => s.id === task.sprint_id)?.name || 'Assigned Sprint'}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          {!isEditing && (
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Description</h4>
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800 text-xs text-gray-300 leading-relaxed min-h-[4rem]">
                {task.description || <span className="italic text-gray-500">No description provided.</span>}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Comments ({comments.length})
              </h4>
            </div>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {commentsLoading ? (
                <p className="text-xs text-gray-500 italic">Loading...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No comments yet.</p>
              ) : (
                comments.map((c) => {
                  const authorName = getCommentAuthorName(c);
                  const authorId = c.author_id || c.user_id;
                  const isMyComment = !!user?.id && !!authorId && String(authorId).toLowerCase() === String(user.id).toLowerCase();
                  const canDeleteComment = isMyComment || user?.role === 'ADMIN' || canManageMembers;

                  return (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                            {authorName.charAt(0)}
                          </div>
                          <span className="text-xs font-semibold text-white">{authorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {canDeleteComment && (
                            <div className="flex items-center gap-1">
                              {isMyComment && (
                                <button
                                  onClick={() => {
                                    if (editingCommentId === c.id) {
                                      setEditingCommentId(null);
                                    } else {
                                      setEditingCommentId(c.id);
                                      setEditingCommentText(c.content);
                                    }
                                  }}
                                  className="text-gray-400 hover:text-indigo-400 p-1 rounded transition-colors"
                                  title="Edit Comment"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-gray-400 hover:text-rose-400 p-1 rounded transition-colors"
                                title="Delete Comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingCommentId === c.id ? (
                        <div className="flex gap-2 pl-8 pt-1">
                          <input
                            type="text"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleUpdateComment(c.id)}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-300 pl-8 leading-relaxed">{c.content}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || commentPosting}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {commentPosting ? '...' : 'Post'}
              </button>
            </form>
          </div>
        </div>

        {/* Custom Confirmation Modal for Delete Task */}
        <ConfirmModal
          isOpen={isDeleteConfirmOpen}
          title="Xác nhận Xóa Công việc"
          message={`Bạn có chắc chắn muốn XÓA công việc "${task.title}" không?\n\nHành động này sẽ xóa vĩnh viễn công việc và không thể hoàn tác.`}
          confirmText="Xóa Công việc"
          cancelText="Hủy bỏ"
          confirmVariant="danger"
          loading={deleteLoading}
          onConfirm={executeDeleteTask}
          onClose={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
};
