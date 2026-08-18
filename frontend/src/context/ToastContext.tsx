import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
}

interface ToastContextType {
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  showInfo: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const showError = useCallback((msg: string) => addToast('error', msg), [addToast]);
  const showInfo = useCallback((msg: string) => addToast('info', msg), [addToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo }}>
      {children}
      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
