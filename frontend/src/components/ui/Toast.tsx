import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id?: string;
  type: ToastType;
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
    error: 'border-rose-500/30 bg-rose-950/40 text-rose-300',
    warning: 'border-amber-500/30 bg-amber-950/40 text-amber-300',
    info: 'border-indigo-500/30 bg-indigo-950/40 text-indigo-300',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start justify-between gap-3 animate-slide-up transition-all ${borders[type]}`}>
      <div className="flex items-start gap-3">
        {icons[type]}
        <div>
          <h4 className="text-xs font-bold text-white tracking-wide">{title}</h4>
          {message && <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">{message}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
