import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, Trash2, Edit3 } from 'lucide-react';
import { api } from '../../lib/api';
import type { Sprint } from '../../types/api';
import { useToast } from '../../context/ToastContext';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sprint?: Sprint | null; // Null for creation, object for editing/managing
  onSuccess: () => void;
}

export const SprintModal: React.FC<SprintModalProps> = ({
  isOpen,
  onClose,
  projectId,
  sprint,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!sprint;

  useEffect(() => {
    if (isOpen) {
      if (sprint) {
        setName(sprint.name);
        setGoal(sprint.goal || '');
        setStartDate(sprint.start_date ? sprint.start_date.substring(0, 10) : '');
        setEndDate(sprint.end_date ? sprint.end_date.substring(0, 10) : '');
      } else {
        setName('');
        setGoal('');
        setStartDate('');
        setEndDate('');
      }
      setError(null);
    }
  }, [isOpen, sprint]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditMode && sprint) {
        await api.put(`/sprints/${sprint.id}`, {
          name: name.trim(),
          goal: goal.trim() || null,
          start_date: startDate,
          end_date: endDate,
        });
        showSuccess('Cập nhật thông tin Sprint thành công!');
      } else {
        await api.post(`/projects/${projectId}/sprints`, {
          name: name.trim(),
          goal: goal.trim() || null,
          start_date: startDate,
          end_date: endDate,
        });
        showSuccess('Tạo Sprint mới thành công!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} Sprint.`;
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSprint = async () => {
    if (!sprint || !confirm(`Are you sure you want to close Sprint "${sprint.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/sprints/${sprint.id}/close`);
      showSuccess('Đã đóng Sprint thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to close Sprint.';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSprint = async () => {
    if (!sprint || !confirm(`Are you sure you want to delete Sprint "${sprint.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/sprints/${sprint.id}`);
      showSuccess('Đã xóa Sprint thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete Sprint.';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-gray-800 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              {isEditMode ? <Edit3 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-bold text-white">
              {isEditMode ? `Manage Sprint: ${sprint?.name}` : 'Create New Sprint'}
            </h3>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Sprint Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 1 - Authentication & Core API"
              className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Sprint Goal</label>
            <textarea
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe key deliverable for this sprint..."
              className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            {isEditMode && sprint ? (
              <div className="flex items-center gap-2">
                {sprint.status !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={handleCloseSprint}
                    disabled={loading}
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Close Sprint
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteSprint}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  title="Delete Sprint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Sprint'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
