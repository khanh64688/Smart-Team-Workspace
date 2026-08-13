import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task, TaskStatus, Project, User, MemberOut } from '../types/api';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { KanbanCard } from '../components/kanban/KanbanCard';
import { TaskDetailModal } from '../components/kanban/TaskDetailModal';
import { CreateTaskModal } from '../components/kanban/CreateTaskModal';
import { KanbanBoardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { Filter, Plus, Sparkles, RefreshCw, FolderKanban } from 'lucide-react';
import { api } from '../lib/api';

interface KanbanBoardPageProps {
  project: Project | null;
  tasks: Task[];
  loading?: boolean;
  searchQuery: string;
  onOpenAISummary: () => void;
  onTasksChange: (tasks: Task[]) => void;
  onRefreshTasks: () => void;
  onGoToProjects?: () => void;
}

export const KanbanBoardPage: React.FC<KanbanBoardPageProps> = ({
  project,
  tasks,
  loading = false,
  searchQuery,
  onOpenAISummary,
  onTasksChange,
  onRefreshTasks,
  onGoToProjects,
}) => {
  const toast = useToast();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);

  useEffect(() => {
    if (project) {
      fetchProjectMembers();
    }
  }, [project?.id]);

  const fetchProjectMembers = async () => {
    if (!project) return;
    try {
      const res = await api.get<MemberOut[]>(`/projects/${project.id}/members`);
      if (Array.isArray(res.data)) {
        const list = res.data.map((m) => ({
          id: m.user_id,
          full_name: m.full_name,
          email: m.email,
          role: m.project_role,
        }));
        setProjectMembers(list as any);
      }
    } catch {
      if (project.members) {
        const list = project.members.map((m) => ({
          id: m.user_id,
          full_name: m.user?.full_name || 'User',
          email: m.user?.email || '',
          role: m.project_role,
        }));
        setProjectMembers(list as any);
      }
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id.toString();

    let targetStatus: TaskStatus | null = null;
    if (['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;
    const currentTask = tasks.find((t) => t.id === activeId);
    if (!currentTask) return;

    if (currentTask.status === targetStatus) {
      const oldIndex = tasks.findIndex((t) => t.id === activeId);
      const newIndex = tasks.findIndex((t) => t.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = [...tasks];
        const [removed] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, removed);
        onTasksChange(reordered);
      }
      return;
    }

    const original = [...tasks];
    onTasksChange(tasks.map((t) => (t.id === activeId ? { ...t, status: targetStatus! } : t)));

    try {
      await api.patch(`/tasks/${activeId}/move`, { status: targetStatus });
      toast.success('Status updated', `Task status changed to ${targetStatus}`);
    } catch (err: any) {
      onTasksChange(original);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : detail?.message || 'Failed to move task.';
      toast.error('Cannot move task', msg);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (overdueOnly && !t.is_overdue) return false;
    return true;
  });

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'TODO', title: 'Todo' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'REVIEW', title: 'Review' },
    { id: 'DONE', title: 'Done' },
  ];

  if (!project) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <EmptyState
          icon={FolderKanban}
          title="Chưa chọn dự án"
          description="Vui lòng chọn một dự án từ menu trên cùng hoặc tạo dự án mới để làm việc với bảng Kanban."
          actionText="Đi tới danh sách Dự án"
          onAction={onGoToProjects}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Board Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Kanban Board</h1>
          <p className="text-xs text-gray-400 mt-1">
            {project.name} — Drag cards to transition status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Priority filter */}
          <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-gray-900">All Priorities</option>
              <option value="LOW" className="bg-gray-900">Low</option>
              <option value="MEDIUM" className="bg-gray-900">Medium</option>
              <option value="HIGH" className="bg-gray-900">High</option>
              <option value="URGENT" className="bg-gray-900">Urgent</option>
            </select>
          </div>

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              overdueOnly
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            Overdue Only
          </button>

          <button
            onClick={onRefreshTasks}
            className="p-2 rounded-xl text-gray-400 border border-gray-800 bg-gray-900/80 hover:text-white transition-colors"
            title="Refresh tasks"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenAISummary}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Summary
          </button>

          <button
            onClick={() => setCreateModalStatus('TODO')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Board view or Skeleton */}
      {loading ? (
        <KanbanBoardSkeleton />
      ) : searchQuery && filteredTasks.length === 0 ? (
        <EmptyState
          variant="search"
          title="Không tìm thấy kết quả"
          description={`Không tìm thấy công việc nào phù hợp với từ khóa "${searchQuery}". Vui lòng thử từ khóa khác.`}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-thin">
            {columns.map((col) => (
              <div key={col.id} className="min-w-[280px] sm:min-w-[320px] flex-1">
                <KanbanColumn
                  id={col.id}
                  title={col.title}
                  tasks={filteredTasks.filter((t) => t.status === col.id)}
                  onTaskClick={(task) => setSelectedTaskDetail(task)}
                  onAddTask={(status) => setCreateModalStatus(status)}
                />
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? <KanbanCard task={activeTask} onClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={!!selectedTaskDetail}
        onClose={() => setSelectedTaskDetail(null)}
        task={selectedTaskDetail}
        members={projectMembers}
        onTaskUpdated={(updated) => {
          onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTaskDetail(updated);
          toast.success('Task updated', 'Task details have been saved.');
        }}
        onTaskDeleted={(id) => {
          onTasksChange(tasks.filter((t) => t.id !== id));
          setSelectedTaskDetail(null);
          toast.success('Task deleted', 'Task has been removed.');
        }}
      />

      {/* Create Task Modal */}
      {createModalStatus && (
        <CreateTaskModal
          isOpen={!!createModalStatus}
          onClose={() => setCreateModalStatus(null)}
          projectId={project.id}
          initialStatus={createModalStatus}
          members={projectMembers}
          onTaskCreated={(newTask) => {
            onTasksChange([newTask, ...tasks]);
            toast.success('Task created', `"${newTask.title}" added to ${newTask.status}`);
          }}
        />
      )}
    </div>
  );
};

