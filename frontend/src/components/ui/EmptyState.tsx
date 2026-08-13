import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { FolderPlus, CheckSquare, Search, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'kanban' | 'error';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: CustomIcon,
  title,
  description,
  actionText,
  onAction,
  variant = 'default',
}) => {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'search':
        return Search;
      case 'kanban':
        return CheckSquare;
      case 'error':
        return AlertCircle;
      default:
        return FolderPlus;
    }
  };

  const IconComponent = CustomIcon || getDefaultIcon();

  return (
    <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-gray-800/80 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/5">
        <IconComponent className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-md">{description}</p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center gap-2"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
