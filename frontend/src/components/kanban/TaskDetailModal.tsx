import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, AlertTriangle, Trash2 } from 'lucide-react';
import type { Task, Comment, User, TaskStatus, TaskPriority } from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

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
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPosting, setCommentPosting] = useState(false);

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
    } catch {
      onTaskUpdated(task); // Rollback
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    const updated = { ...task, priority: newPriority };
    onTaskUpdated(updated);
    try {
      const res = await api.put<Task>(`/tasks/${task.id}`, { priority: newPriority });
      if (res.data) onTaskUpdated(res.data);
    } catch {
      onTaskUpdated(task); // Rollback
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user || commentPosting) return;

    setCommentPosting(true);
    try {
      const res = await api.post<Comment>(`/tasks/${task.id}/comments`, {
        content: commentText.trim(),
      });
      if (res.data) {
        setComments((prev) => [...prev, res.data]);
        onTaskUpdated({ ...task, comments_count: (task.comments_count || 0) + 1 });
      }
      setCommentText('');
    } catch {
      // Optimistically add comment locally if API not available yet
      const optimistic: Comment = {
        id: `local-${Date.now()}`,
        content: commentText.trim(),
        user_id: user.id,
        user: user,
        task_id: task.id,
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);
      onTaskUpdated({ ...task, comments_count: (task.comments_count || 0) + 1 });
      setCommentText('');
    } finally {
      setCommentPosting(false);
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
                comments.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                          {c.user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-semibold text-white">{c.user?.full_name}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 pl-8 leading-relaxed">{c.content}</p>
                  </div>
                ))
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
