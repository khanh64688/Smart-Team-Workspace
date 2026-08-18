import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../types/api';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  canConfig?: boolean;
  canDragTask?: (task: Task) => boolean;
}

const columnHeaderStyles: Record<TaskStatus, { badgeBg: string; text: string }> = {
  TODO: { badgeBg: 'bg-slate-500/20', text: 'text-slate-300' },
  IN_PROGRESS: { badgeBg: 'bg-amber-500/20', text: 'text-amber-400' },
  REVIEW: { badgeBg: 'bg-purple-500/20', text: 'text-purple-400' },
  DONE: { badgeBg: 'bg-emerald-500/20', text: 'text-emerald-400' },
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  onTaskClick,
  onAddTask,
  canConfig = true,
  canDragTask,
}) => {
  const { setNodeRef } = useDroppable({ id });
  const styles = columnHeaderStyles[id];
  const taskIds = tasks.map((t) => t.id.toString());

  return (
    <div className="flex flex-col w-80 shrink-0 glass-panel rounded-3xl border border-gray-800/80 p-4 max-h-[calc(100vh-160px)]">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">{title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${styles.badgeBg} ${styles.text}`}>
            {tasks.length}
          </span>
        </div>
        {canConfig && (
          <button
            onClick={() => onAddTask(id)}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Add task"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Droppable Task Container */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto pr-1">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              canDrag={canDragTask ? canDragTask(task) : true}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="py-12 border-2 border-dashed border-gray-800/60 rounded-2xl text-center text-xs text-gray-500 my-2">
            Drop task here
          </div>
        )}
      </div>
    </div>
  );
};
