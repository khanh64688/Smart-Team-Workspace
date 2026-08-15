import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, Trash2, Edit3 } from 'lucide-react';
import { api } from '../../lib/api';
import type { Sprint, SprintStatus } from '../../types/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../notifications/ConfirmModal';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sprint?: Sprint | null; // Null for creation, object for editing/managing
  canManageSprints?: boolean;
  onSuccess: () => void;
}

export const SprintModal: React.FC<SprintModalProps> = ({
  isOpen,
  onClose,
  projectId,
  sprint,
  canManageSprints = true,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SprintStatus>('PLANNED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'close' | 'delete' | 'activate';
    title: string;
    message: string;
    confirmText: string;
    variant: 'warning' | 'danger' | 'primary';
  } | null>(null);

  const isEditMode = !!sprint;
  const isClosed = sprint?.status === 'CLOSED';

  useEffect(() => {
    if (isOpen) {
      if (sprint) {
        setName(sprint.name);
        setGoal(sprint.goal || '');
        setStartDate(sprint.start_date ? sprint.start_date.substring(0, 10) : '');
        setEndDate(sprint.end_date ? sprint.end_date.substring(0, 10) : '');
        setStatus(sprint.status || 'PLANNED');
      } else {
        setName('');
        setGoal('');
        setStartDate('');
        setEndDate('');
        setStatus('PLANNED');
      }
      setError(null);
      setConfirmAction(null);
    }
  }, [isOpen, sprint]);

  if (!isOpen) return null;

  const extractErrorMessage = (err: any): string => {
    if (err.response?.data?.error?.message) {
      return err.response.data.error.message;
    }
    if (err.response?.data?.error?.details?.errors?.[0]?.message) {
      return err.response.data.error.details.errors[0].message;
    }
    if (typeof err.response?.data?.detail === 'string') {
      return err.response.data.detail;
    }
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    return `Không thể ${isEditMode ? 'cập nhật' : 'tạo'} Sprint. Vui lòng kiểm tra quyền quản lý (OWNER/MANAGER) hoặc ngày bắt đầu/kết thúc.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSprints) {
      showError('Chỉ Quản lý dự án (Owner/Manager/Admin) mới có quyền tạo/sửa Sprint.');
      return;
    }
    if (isClosed) {
      showError('Không thể sửa Sprint đã CLOSED.');
      return;
    }

    setLoading(true);
    setError(null);

    // Client-side date check
    if (new Date(endDate) <= new Date(startDate)) {
      const dateErrMsg = 'Ngày kết thúc (End Date) phải diễn ra sau Ngày bắt đầu (Start Date).';
      setError(dateErrMsg);
      showError(dateErrMsg);
      setLoading(false);
      return;
    }

    try {
      const isoStartDate = new Date(startDate + 'T00:00:00Z').toISOString();
      const isoEndDate = new Date(endDate + 'T23:59:59Z').toISOString();

      if (isEditMode && sprint) {
        await api.put(`/sprints/${sprint.id}`, {
          name: name.trim(),
          goal: goal.trim() || null,
          start_date: isoStartDate,
          end_date: isoEndDate,
        });
        showSuccess('Cập nhật thông tin Sprint thành công!');
      } else {
        await api.post(`/projects/${projectId}/sprints`, {
          name: name.trim(),
          goal: goal.trim() || null,
          start_date: isoStartDate,
          end_date: isoEndDate,
          status,
        });
        showSuccess('Tạo Sprint mới thành công!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const executeActivateSprint = async () => {
    if (!sprint) return;
    setLoading(true);
    setError(null);
    try {
      await api.put(`/sprints/${sprint.id}`, { status: 'ACTIVE' });
      showSuccess('Kích hoạt Sprint thành công!');
      setConfirmAction(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      setError(msg);
      showError(msg);
      setConfirmAction(null);
    } finally {
      setLoading(false);
    }
  };

  const executeCloseSprint = async () => {
    if (!sprint) return;
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/sprints/${sprint.id}/close`);
      showSuccess('Đã đóng Sprint thành công!');
      setConfirmAction(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      setError(msg);
      showError(msg);
      setConfirmAction(null);
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteSprint = async () => {
    if (!sprint) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/sprints/${sprint.id}`);
      showSuccess('Đã xóa Sprint thành công!');
      setConfirmAction(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      setError(msg);
      showError(msg);
      setConfirmAction(null);
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
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditMode ? `Manage Sprint: ${sprint?.name}` : 'Create New Sprint'}
              </h3>
              {isClosed && <span className="text-[10px] text-amber-400 font-semibold">CLOSED (Read Only)</span>}
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Sprint Name *</label>
            <input
              type="text"
              required
              disabled={!canManageSprints || isClosed}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 1 - Authentication & Core API"
              className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Sprint Goal</label>
            <textarea
              rows={2}
              disabled={!canManageSprints || isClosed}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe key deliverable for this sprint..."
              className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {!isEditMode && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Initial Status</label>
              <select
                value={status}
                disabled={!canManageSprints}
                onChange={(e) => setStatus(e.target.value as SprintStatus)}
                className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="PLANNED">PLANNED (Lên kế hoạch)</option>
                <option value="ACTIVE">ACTIVE (Kích hoạt ngay)</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Start Date *</label>
              <input
                type="date"
                required
                disabled={!canManageSprints || isClosed}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">End Date *</label>
              <input
                type="date"
                required
                disabled={!canManageSprints || isClosed}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            {isEditMode && sprint && canManageSprints ? (
              <div className="flex items-center gap-2">
                {sprint.status === 'PLANNED' && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        type: 'activate',
                        title: 'Xác nhận Kích hoạt Sprint',
                        message: `Bạn có chắc chắn muốn KÍCH HOẠT Sprint "${sprint.name}" không?\n\nKích hoạt sẽ chuyển Sprint này thành Sprint đang hoạt động của dự án.`,
                        confirmText: 'Kích hoạt Sprint',
                        variant: 'primary',
                      })
                    }
                    disabled={loading}
                    className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    Activate Sprint
                  </button>
                )}
                {sprint.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        type: 'close',
                        title: 'Xác nhận Đóng Sprint',
                        message: `Bạn có chắc chắn muốn ĐÓNG Sprint "${sprint.name}" không?\n\nKhi đóng, trạng thái Sprint sẽ thành CLOSED và không thể chỉnh sửa lại.`,
                        confirmText: 'Đóng Sprint',
                        variant: 'warning',
                      })
                    }
                    disabled={loading}
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Close Sprint
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      type: 'delete',
                      title: 'Xác nhận Xóa Sprint',
                      message: `Bạn có chắc chắn muốn XÓA Sprint "${sprint.name}" không?\n\nHành động này không thể hoàn tác.`,
                      confirmText: 'Xóa Sprint',
                      variant: 'danger',
                    })
                  }
                  disabled={loading}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Delete Sprint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Sprint
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
              {canManageSprints && !isClosed && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Sprint'}
                </button>
              )}
            </div>
          </div>
        </form>

        {confirmAction && (
          <ConfirmModal
            isOpen={!!confirmAction}
            title={confirmAction.title}
            message={confirmAction.message}
            confirmText={confirmAction.confirmText}
            confirmVariant={confirmAction.variant}
            loading={loading}
            onConfirm={() => {
              if (confirmAction.type === 'activate') executeActivateSprint();
              if (confirmAction.type === 'close') executeCloseSprint();
              if (confirmAction.type === 'delete') executeDeleteSprint();
            }}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    </div>
  );
};
