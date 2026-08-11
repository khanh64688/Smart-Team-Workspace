import React, { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, TaskPriority } from '../../types/api';
import { AlertCircle, MessageSquare, Clock } from 'lucide-react';

/** Bằng activationConstraint.distance của PointerSensor trên board. */
const DRAG_THRESHOLD_PX = 5;

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

type KanbanCardViewProps = React.HTMLAttributes<HTMLDivElement> & {
  task: Task;
};

/**
 * Phần hiển thị thuần của thẻ, không gắn với dnd-kit.
 *
 * Tách ra để DragOverlay dùng lại được: nếu overlay render bản có
 * useSortable thì trong context tồn tại hai node cùng một id, node của
 * overlay (bay theo con trỏ) ghi đè node thật nên collision detection
 * luôn trả về chính thẻ đang kéo và không thả sang cột khác được.
 */
export const KanbanCardView = React.forwardRef<HTMLDivElement, KanbanCardViewProps>(
  ({ task, className = '', ...rest }, ref) => {
    const priority = priorityStyles[task.priority] || priorityStyles.MEDIUM;

    return (
      <div
        ref={ref}
        {...rest}
        className={`glass-panel p-4 rounded-2xl border border-gray-800/80 hover:border-indigo-500/40 cursor-grab active:cursor-grabbing transition-colors shadow-md group my-2.5 relative touch-none select-none ${className}`}
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
            {task.due_date && (
              <span className="flex items-center gap-0.5 text-gray-500">
                <Clock className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

KanbanCardView.displayName = 'KanbanCardView';

export const KanbanCard: React.FC<KanbanCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id.toString(),
    // Cho handleDragEnd biết thẻ đang nằm ở cột nào mà không phải dò lại
    // trong mảng tasks.
    data: { type: 'task', status: task.status },
  });

  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <KanbanCardView
      task={task}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={(event) => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
        listeners?.onPointerDown?.(event);
      }}
      onClick={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;

        // Thả chuột sau khi kéo cũng sinh ra click; nếu không lọc thì mỗi
        // lần chuyển cột lại bật modal chi tiết task.
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD_PX) {
          return;
        }

        onClick();
      }}
    />
  );
};
