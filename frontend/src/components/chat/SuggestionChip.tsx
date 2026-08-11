import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SuggestionChipProps {
  label: string;
  tone?: 'default' | 'alert';
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Chip nằm phía user, viền đứt — trông như tin nhắn đã soạn sẵn chưa gửi.
 * Bấm vào là nó "cứng lại" thành bong bóng user thật.
 */
export const SuggestionChip: React.FC<SuggestionChipProps> = ({
  label,
  tone = 'default',
  disabled,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group max-w-[85%] self-end text-left px-3.5 py-2 rounded-2xl rounded-br-md border border-dashed text-xs leading-snug transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
      tone === 'alert'
        ? 'border-rose-500/50 text-rose-300 bg-rose-500/5 hover:bg-rose-500/15 hover:border-rose-500/70'
        : 'border-indigo-500/40 text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/15 hover:border-indigo-500/70'
    }`}
  >
    <span className="flex items-center gap-1.5">
      {tone === 'alert' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
      {label}
    </span>
  </button>
);
