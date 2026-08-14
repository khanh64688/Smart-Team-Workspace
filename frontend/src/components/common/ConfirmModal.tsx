import React from 'react';
import { AlertTriangle, Trash2, CheckCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (confirmVariant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20',
          Icon: Trash2,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20',
          Icon: AlertTriangle,
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          buttonBg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20',
          Icon: CheckCircle,
        };
    }
  };

  const { iconBg, buttonBg, Icon } = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-gray-950/95 rounded-3xl border border-gray-800 p-6 shadow-2xl relative transform transition-all scale-100">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-gray-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-white mb-2 tracking-tight">{title}</h3>
          
          <div className="w-full bg-gray-900/80 p-4 rounded-2xl border border-gray-800/80 mb-6 text-left">
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{message}</p>
          </div>

          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 transition-colors"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${buttonBg} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <span className="inline-block animate-spin font-bold">↻</span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
