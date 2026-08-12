import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task, TaskStatus, Project, User } from '../types/api';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { KanbanCard } from '../components/kanban/KanbanCard';
import { TaskDetailModal } from '../components/kanban/TaskDetailModal';
import { CreateTaskModal } from '../components/kanban/CreateTaskModal';
import { Filter, Plus, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

interface KanbanBoardPageProps {
  project: Project | null;
  searchQuery: string;
  onOpenAISummary: () => void;
}

export const KanbanBoardPage: React.FC<KanbanBoardPageProps> = ({
  project,
  searchQuery,
  onOpenAISummary,
}) => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: 'Thiết kế ERD cho toàn hệ thống', status: 'DONE', priority: 'HIGH', project_id: 1, comments_count: 3, created_at: new Date().toISOString() },
    { id: 2, title: 'Dựng skeleton FastAPI + Docker Compose', status: 'DONE', priority: 'HIGH', project_id: 1, comments_count: 1, created_at: new Date().toISOString() },
    { id: 3, title: 'API đăng ký / đăng nhập với JWT', status: 'DONE', priority: 'URGENT', project_id: 1, comments_count: 2, created_at: new Date().toISOString() },
    { id: 4, title: 'Màn hình đăng nhập bằng React', status: 'DONE', priority: 'MEDIUM', project_id: 1, comments_count: 0, created_at: new Date().toISOString() },
    { id: 5, title: 'Viết unit test cho module xác thực', status: 'REVIEW', priority: 'HIGH', project_id: 1, comments_count: 4, created_at: new Date().toISOString() },
    { id: 6, title: 'API CRUD sản phẩm', status: 'IN_PROGRESS', priority: 'URGENT', project_id: 1, comments_count: 2, created_at: new Date().toISOString() },
    { id: 7, title: 'Trang danh sách sản phẩm + phân trang', status: 'IN_PROGRESS', priority: 'HIGH', project_id: 1, comments_count: 1, created_at: new Date().toISOString() },
    { id: 8, title: 'Chức năng giỏ hàng phía frontend', status: 'IN_PROGRESS', priority: 'MEDIUM', project_id: 1, comments_count: 0, created_at: new Date().toISOString() },
    { id: 9, title: 'Tích hợp cổng thanh toán sandbox', status: 'TODO', priority: 'HIGH', project_id: 1, comments_count: 0, created_at: new Date().toISOString() },
    { id: 10, title: 'Trang quản trị đơn hàng', status: 'TODO', priority: 'MEDIUM', project_id: 1, comments_count: 0, created_at: new Date().toISOString() },
    { id: 13, title: 'Chức năng tìm kiếm sản phẩm nâng cao', status: 'IN_PROGRESS', priority: 'URGENT', project_id: 1, is_overdue: true, comments_count: 5, created_at: new Date().toISOString() },
  ]);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);

  useEffect(() => {
    if (project) {
      // fetchTasks();
      fetchTasksv1();
      if (project.members) {
        setProjectMembers(project.members.map((m) => m.user));
      }
    }
  }, [project]);

  const fetchTasks = async () => {
    if (!project) return;
    try {
      const res = await api.get<Task[]>(`/projects/${project.id}/tasks`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTasks(res.data);
      }
    } catch {
      // Keep seeded tasks
    }
  };
  
  // Nguyen duc dat sua theo API backend
  const fetchTasksv1 = async () => {
    if (!project) return;
    try {
      const res = await api.get<Task[]>(`/tasks?project_id=${project.id}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
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
    const taskId = Number(event.active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = Number(active.id);
    const overId = over.id.toString();

    // Determine target column status
    let targetStatus: TaskStatus | null = null;
    if (['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id.toString() === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    const currentTask = tasks.find((t) => t.id === activeId);
    if (!currentTask || currentTask.status === targetStatus) return;

    // Optimistic Update
    const originalTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus! } : t))
    );

    try {
      await api.patch(`/tasks/${activeId}/move`, { status: targetStatus });
    } catch {
      // Rollback on error per US-13
      setTasks(originalTasks);
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

      {/* Kanban Drag and Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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

        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} onClick={() => {}} /> : null}
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
          projectId={project?.id || 1}
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
