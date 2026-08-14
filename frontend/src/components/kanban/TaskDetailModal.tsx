import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, AlertTriangle, Trash2, Edit3, Check } from 'lucide-react';
import type { Task, Comment, User, TaskStatus, TaskPriority } from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  members: User[];
  onTaskUpdated: (updatedTask: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  members,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPosting, setCommentPosting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Fetch real comments when task changes
  useEffect(() => {
    if (isOpen && task) {
      fetchComments();
    } else {
      setComments([]);
    }
  }, [task?.id, isOpen]);

  const fetchComments = async () => {
    if (!task) return;
    setCommentsLoading(true);
    try {
      const res = await api.get<Comment[]>(`/tasks/${task.id}/comments`);
      if (Array.isArray(res.data)) setComments(res.data);
    } catch {
      setComments([]); // Backend may not have this endpoint yet
    } finally {
      setCommentsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    const updated = { ...task, status: newStatus };
    onTaskUpdated(updated);
    try {
      const res = await api.patch<Task>(`/tasks/${task.id}/move`, { status: newStatus });
      if (res.data) onTaskUpdated(res.data);
      showSuccess('Cập nhật trạng thái công việc thành công!');
    } catch (err: any) {
      onTaskUpdated(task); // Rollback
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Không thể đổi trạng thái công việc.';
      showError(message);
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    const updated = { ...task, priority: newPriority };
    onTaskUpdated(updated);
    try {
      const res = await api.put<Task>(`/tasks/${task.id}`, { priority: newPriority });
      if (res.data) onTaskUpdated(res.data);
      showSuccess('Cập nhật độ ưu tiên công việc thành công!');
    } catch (err: any) {
      onTaskUpdated(task); // Rollback
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Không thể đổi độ ưu tiên công việc.';
      showError(message);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    const assigneeObj = members.find((m) => m.id === newAssigneeId);
    const updated = { ...task, assignee_id: newAssigneeId || undefined, assignee: assigneeObj };
    onTaskUpdated(updated);
    try {
      const res = await api.patch<Task>(`/tasks/${task.id}/assign`, {
        assignee_id: newAssigneeId || null,
      });
      if (res.data) onTaskUpdated(res.data);
    } catch {
      onTaskUpdated(task); // Rollback
    }
  };

  const getCommentAuthorName = (c: Comment) => {
    if (c.user?.full_name) return c.user.full_name;
    const authorId = c.author_id || c.user_id;
    if (authorId && user?.id === authorId) return user.full_name;
    if (authorId) {
      const match = members.find((m) => m.id === authorId);
      if (match) return match.full_name;
    }
    return 'Team Member';
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
      const msg = err.response?.data?.detail || 'Không thể sửa bình luận.';
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
      const msg = err.response?.data?.detail || 'Không thể xóa bình luận.';
      showError(msg);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      if (onTaskDeleted) onTaskDeleted(task.id);
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      alert(axiosErr?.response?.data?.detail || 'Failed to delete task.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-3xl glass-panel rounded-3xl border border-gray-800 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">
                Task
              </span>
              {task.is_overdue && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white leading-snug">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {(user?.role === 'PM' || user?.role === 'ADMIN') && (
              <button
                onClick={handleDeleteTask}
                className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-800/80">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Status</label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Priority</label>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Assignee</label>
              <select
                value={task.assignee_id || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="font-semibold text-gray-300">Due:</span>
              <span className={task.is_overdue ? 'text-rose-400 font-semibold' : ''}>
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Description</h4>
            <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800 text-xs text-gray-300 leading-relaxed min-h-[4rem]">
              {task.description || <span className="italic text-gray-500">No description provided for this task.</span>}
            </div>
          </div>

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
                <p className="text-xs text-gray-500 italic">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No comments yet. Be the first to comment.</p>
              ) : (
                comments.map((c) => {
                  const authorName = getCommentAuthorName(c);
                  const authorId = c.author_id || c.user_id;
                  const isMyComment = !!user?.id && authorId === user.id;
                  const canDeleteComment = isMyComment || user?.role === 'ADMIN' || user?.role === 'PM';

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
      </div>
    </div>
  );
};
