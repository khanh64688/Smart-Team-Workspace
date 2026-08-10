import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, TaskPriority } from '../../types/api';
import { AlertCircle, MessageSquare, Clock } from 'lucide-react';

interface KanbanCardProps {
  task: Task;
  onClick: () => void;
}

const priorityStyles: Record<TaskPriority, { bg: string; text: string; label: string }> = {
  LOW: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Low' },
  MEDIUM: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', label: 'Medium' },
  HIGH: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'High' },
  URGENT: { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400', label: 'Urgent' },
};

export const KanbanCard: React.FC<KanbanCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priority = priorityStyles[task.priority] || priorityStyles.MEDIUM;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="glass-panel p-4 rounded-2xl border border-gray-800/80 hover:border-indigo-500/40 cursor-grab active:cursor-grabbing transition-all shadow-md group my-2.5 relative"
    >
      {/* Top Priority Badge & Overdue Indicator */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${priority.bg} ${priority.text}`}
        >
          {priority.label}
        </span>

        {task.is_overdue && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Overdue
          </span>
        )}
      </div>

      {/* Task Title */}
      <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-relaxed">
        {task.title}
      </h4>

      {/* Footer Info: Assignee & Comments */}
      <div className="mt-3 pt-2.5 border-t border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                {task.assignee.full_name?.charAt(0) || 'A'}
              </div>
              <span className="text-[10px] text-gray-400 font-medium truncate max-w-[80px]">
                {task.assignee.full_name}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-500 italic">Unassigned</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-[10px]">
          {task.comments_count !== undefined && task.comments_count > 0 && (
            <span className="flex items-center gap-0.5 text-gray-400">
              <MessageSquare className="w-3 h-3" />
              {task.comments_count}
            </span>
          )}
          {task.deadline && (
            <span className="flex items-center gap-0.5 text-gray-500">
              <Clock className="w-3 h-3" />
              {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
