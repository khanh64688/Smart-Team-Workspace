import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type Over,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task, TaskStatus, Project, User } from '../types/api';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { KanbanCardView } from '../components/kanban/KanbanCard';
import { TaskDetailModal } from '../components/kanban/TaskDetailModal';
import { CreateTaskModal } from '../components/kanban/CreateTaskModal';
import { Filter, Plus, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

const COLUMN_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

const isColumnStatus = (value: unknown): value is TaskStatus =>
  typeof value === 'string' && COLUMN_STATUSES.includes(value as TaskStatus);

/**
 * Cột đích của một lần thả.
 *
 * Với closestCorners, `over` thường là một THẺ khác chứ không phải cột —
 * nên phải suy ra cột từ thẻ đó. containerId của SortableContext là nguồn
 * đáng tin nhất vì nó phản ánh cột đang render, kể cả khi state tasks
 * chưa kịp cập nhật.
 */
const resolveTargetStatus = (over: Over, tasks: Task[]): TaskStatus | null => {
  const overId = over.id.toString();
  if (isColumnStatus(overId)) return overId;

  const data = over.data.current;
  if (isColumnStatus(data?.sortable?.containerId)) return data!.sortable.containerId as TaskStatus;
  if (isColumnStatus(data?.status)) return data!.status as TaskStatus;

  return tasks.find((t) => t.id.toString() === overId)?.status ?? null;
};

interface KanbanBoardPageProps {
  project: Project | null;
  searchQuery: string;
  onOpenAISummary: () => void;
  /** Báo task hiện tại lên App để trợ lý AI sinh gợi ý theo ngữ cảnh. */
  onTasksChange?: (tasks: Task[]) => void;
}

export const KanbanBoardPage: React.FC<KanbanBoardPageProps> = ({
  project,
  searchQuery,
  onOpenAISummary,
  onTasksChange,
}) => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 'demo-t1', title: 'Thiết kế ERD cho toàn hệ thống', status: 'DONE', priority: 'HIGH', project_id: 'demo-alpha', comments_count: 3, created_at: new Date().toISOString() },
    { id: 'demo-t2', title: 'Dựng skeleton FastAPI + Docker Compose', status: 'DONE', priority: 'HIGH', project_id: 'demo-alpha', comments_count: 1, created_at: new Date().toISOString() },
    { id: 'demo-t3', title: 'API đăng ký / đăng nhập với JWT', status: 'DONE', priority: 'URGENT', project_id: 'demo-alpha', comments_count: 2, created_at: new Date().toISOString() },
    { id: 'demo-t4', title: 'Màn hình đăng nhập bằng React', status: 'DONE', priority: 'MEDIUM', project_id: 'demo-alpha', comments_count: 0, created_at: new Date().toISOString() },
    { id: 'demo-t5', title: 'Viết unit test cho module xác thực', status: 'REVIEW', priority: 'HIGH', project_id: 'demo-alpha', comments_count: 4, created_at: new Date().toISOString() },
    { id: 'demo-t6', title: 'API CRUD sản phẩm', status: 'IN_PROGRESS', priority: 'URGENT', project_id: 'demo-alpha', comments_count: 2, created_at: new Date().toISOString() },
    { id: 'demo-t7', title: 'Trang danh sách sản phẩm + phân trang', status: 'IN_PROGRESS', priority: 'HIGH', project_id: 'demo-alpha', comments_count: 1, created_at: new Date().toISOString() },
    { id: 'demo-t8', title: 'Chức năng giỏ hàng phía frontend', status: 'IN_PROGRESS', priority: 'MEDIUM', project_id: 'demo-alpha', comments_count: 0, created_at: new Date().toISOString() },
    { id: 'demo-t9', title: 'Tích hợp cổng thanh toán sandbox', status: 'TODO', priority: 'HIGH', project_id: 'demo-alpha', comments_count: 0, created_at: new Date().toISOString() },
    { id: 'demo-t10', title: 'Trang quản trị đơn hàng', status: 'TODO', priority: 'MEDIUM', project_id: 'demo-alpha', comments_count: 0, created_at: new Date().toISOString() },
    { id: 'demo-t13', title: 'Chức năng tìm kiếm sản phẩm nâng cao', status: 'IN_PROGRESS', priority: 'URGENT', project_id: 'demo-alpha', is_overdue: true, comments_count: 5, created_at: new Date().toISOString() },
  ]);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      fetchTasks();
      if (project.members) {
        setProjectMembers(project.members.map((m) => m.user));
      }
    }
  }, [project]);

  useEffect(() => {
    onTasksChange?.(tasks);
  }, [tasks, onTasksChange]);

  const fetchTasks = async () => {
    if (!project) return;
    try {
      const res = await api.get<Task[]>(`/projects/${project.id}/tasks`);
      // Nhận cả mảng rỗng: dự án không có task nào thì phải hiện board
      // trống, không phải giữ lại dữ liệu mẫu của dự án khác.
      if (Array.isArray(res.data)) {
        setTasks(res.data);
      }
    } catch {
      // Keep seeded tasks
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = String(event.active.id);
    const task = tasks.find((t) => t.id.toString() === taskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = String(active.id);
    const targetStatus = resolveTargetStatus(over, tasks);
    if (!targetStatus) return;

    const currentTask = tasks.find((t) => t.id.toString() === activeId);
    if (!currentTask || currentTask.status === targetStatus) return;

    // Optimistic Update
    const originalTasks = tasks;
    setMoveError(null);
    setTasks((prev) =>
      prev.map((t) => (t.id.toString() === activeId ? { ...t, status: targetStatus } : t))
    );

    // Task mẫu chỉ tồn tại ở client, gọi API sẽ 404 và thẻ bật ngược lại
    // khiến board demo trông như hỏng.
    if (activeId.startsWith('demo-')) return;

    try {
      const res = await api.patch<Task>(`/tasks/${activeId}/move`, { status: targetStatus });
      if (res.data?.id) {
        setTasks((prev) => prev.map((t) => (t.id.toString() === activeId ? res.data : t)));
      }
    } catch {
      // Rollback on error per US-13
      setTasks(originalTasks);
      setMoveError('Không chuyển được trạng thái công việc. Thẻ đã trở về cột cũ.');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
      return false;
    }
    if (overdueOnly && !t.is_overdue) {
      return false;
    }
    return true;
  });

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'TODO', title: 'Todo' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'REVIEW', title: 'Review' },
    { id: 'DONE', title: 'Done' },
  ];

  return (
    <div className="p-8">
      {/* Board Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kanban Board</h1>
          <p className="text-xs text-gray-400 mt-1">
            {project?.name || 'Sprint Workspace'} — Drag cards to transition status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Priority filter */}
          <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none"
            >
              <option value="ALL" className="bg-gray-900">All Priorities</option>
              <option value="LOW" className="bg-gray-900">Low</option>
              <option value="MEDIUM" className="bg-gray-900">Medium</option>
              <option value="HIGH" className="bg-gray-900">High</option>
              <option value="URGENT" className="bg-gray-900">Urgent</option>
            </select>
          </div>

          {/* Overdue filter toggle */}
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

          {/* AI Report Quick Trigger */}
          <button
            onClick={onOpenAISummary}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Summary
          </button>

          <button
            onClick={() => setCreateModalStatus('TODO')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {moveError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between gap-3">
          <span>{moveError}</span>
          <button onClick={() => setMoveError(null)} className="text-rose-400 hover:text-rose-200">
            Đóng
          </button>
        </div>
      )}

      {/* Kanban Drag and Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        // Cột co giãn theo số thẻ trong lúc kéo; đo một lần lúc bắt đầu thì
        // vùng thả lệch so với vị trí thật của cột.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={filteredTasks.filter((t) => t.status === col.id)}
              onTaskClick={(task) => setSelectedTaskDetail(task)}
              onAddTask={(status) => setCreateModalStatus(status)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <KanbanCardView task={activeTask} className="rotate-2 shadow-2xl shadow-black/40" />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={!!selectedTaskDetail}
        onClose={() => setSelectedTaskDetail(null)}
        task={selectedTaskDetail}
        members={projectMembers}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTaskDetail(updated);
        }}
        onTaskDeleted={(id) => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
        }}
      />

      {/* Create Task Modal */}
      {createModalStatus && (
        <CreateTaskModal
          isOpen={!!createModalStatus}
          onClose={() => setCreateModalStatus(null)}
          projectId={project?.id ?? ''}
          initialStatus={createModalStatus}
          members={projectMembers}
          onTaskCreated={(newTask) => {
            setTasks((prev) => [newTask, ...prev]);
          }}
        />
      )}
    </div>
  );
};
