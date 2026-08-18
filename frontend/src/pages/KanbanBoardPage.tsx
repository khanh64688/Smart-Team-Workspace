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
import type { Task, TaskStatus, Project, User, MemberOut, Sprint } from '../types/api';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { KanbanCard } from '../components/kanban/KanbanCard';
import { TaskDetailModal } from '../components/kanban/TaskDetailModal';
import { CreateTaskModal } from '../components/kanban/CreateTaskModal';
import { SprintModal } from '../components/kanban/SprintModal';
import { Filter, Plus, RefreshCw, Calendar, Lock, Edit3 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface KanbanBoardPageProps {
  project: Project | null;
  tasks: Task[];
  searchQuery: string;
  onTasksChange: (tasks: Task[]) => void;
  onRefreshTasks: () => void;
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  REVIEW: 2,
  DONE: 3,
};

export const KanbanBoardPage: React.FC<KanbanBoardPageProps> = ({
  project,
  tasks,
  searchQuery,
  onTasksChange,
  onRefreshTasks,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);

  // Sprints state
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('ALL');
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  // Compute permissions
  const isSystemAdmin = user?.role === 'ADMIN';
  const isProjectOwner = project?.owner_id === user?.id;

  const userMember =
    projectMembers.find((m) => m.id === user?.id || (m as any).user_id === user?.id) ||
    project?.members?.find((m) => m.user_id === user?.id);

  const userProjectRole = isSystemAdmin
    ? 'OWNER'
    : isProjectOwner
    ? 'OWNER'
    : (userMember as any)?.role || (userMember as any)?.project_role || 'MEMBER';

  // canConfig matching backend logic:
  // 1. System ADMIN
  // 2. Project OWNER or MANAGER
  // 3. Project PUBLIC (and user is member)
  // 4. Member with can_config === true
  const canConfig =
    isSystemAdmin ||
    isProjectOwner ||
    userProjectRole === 'OWNER' ||
    userProjectRole === 'MANAGER' ||
    (project?.visibility === 'PUBLIC' && !!userMember) ||
    !!(userMember as any)?.can_config;

  // Backend cho phép MEMBER tự đổi trạng thái task mình phụ trách
  // (TaskService.move -> TASK_MOVE_FORBIDDEN chỉ chặn task của người khác).
  const canMoveTask = (task: Task) => canConfig || task.assignee_id === user?.id;

  const canManageSprints = canConfig;
  const canManageMembers = isSystemAdmin || userProjectRole === 'OWNER' || userProjectRole === 'MANAGER';

  // Fetch project members and sprints when project changes
  useEffect(() => {
    if (project) {
      fetchProjectMembers();
      fetchSprints();
    }
  }, [project?.id]);

  const fetchSprints = async () => {
    if (!project) return;
    try {
      const res = await api.get<Sprint[]>(`/projects/${project.id}/sprints`);
      if (Array.isArray(res.data)) {
        setSprints(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch sprints:', err);
    }
  };

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
          can_config: m.can_config,
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
          can_config: m.can_config,
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
    // Phải dùng cùng cổng quyền với handleDragEnd, nếu không activeTask sẽ
    // rỗng và DragOverlay không vẽ card bay theo con trỏ.
    if (!task || !canMoveTask(task)) return;
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id.toString();

    const currentTask = tasks.find((t) => t.id === activeId);
    if (!currentTask || !canMoveTask(currentTask)) return;

    let targetStatus: TaskStatus | null = null;
    if (['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

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

    // Backend rule: status transition difference <= 1
    if (Math.abs(STATUS_ORDER[targetStatus] - STATUS_ORDER[currentTask.status]) > 1) {
      showError(`Không thể di chuyển trực tiếp từ ${currentTask.status} sang ${targetStatus}. Vui lòng chuyển qua các cột liền kề.`);
      return;
    }

    const original = [...tasks];
    onTasksChange(tasks.map((t) => (t.id === activeId ? { ...t, status: targetStatus! } : t)));

    try {
      await api.patch(`/tasks/${activeId}/move`, { status: targetStatus });
      showSuccess('Cập nhật trạng thái công việc thành công!');
    } catch (err: any) {
      onTasksChange(original);
      const msg =
        err.response?.data?.error?.message ||
        (typeof err.response?.data?.detail === 'string' ? err.response.data.detail : null) ||
        err.response?.data?.message ||
        'Không thể di chuyển công việc. Vui lòng kiểm tra quyền cấu hình dự án.';
      showError(msg);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (selectedSprintId !== 'ALL' && t.sprint_id !== selectedSprintId) return false;
    if (overdueOnly && !t.is_overdue) return false;
    return true;
  });

  const selectedSprintObj = sprints.find((s) => s.id === selectedSprintId);

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'TODO', title: 'Todo' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'REVIEW', title: 'Review' },
    { id: 'DONE', title: 'Done' },
  ];

  if (!project) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-gray-400 text-sm">Select a project to view its Kanban board.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Board Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Kanban Board</h1>
            {!canConfig && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <Lock className="w-3 h-3" />
                Read Only (No Config)
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {project.name} {canConfig ? '— Drag cards to transition status' : '— View mode'}
          </p>
          {selectedSprintObj && (
            <div className="mt-2 text-xs text-indigo-300 flex items-center gap-3 bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-500/20 w-fit">
              <span className="font-bold">Sprint: {selectedSprintObj.name}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                selectedSprintObj.status === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : selectedSprintObj.status === 'CLOSED'
                  ? 'bg-gray-800 text-gray-400'
                  : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {selectedSprintObj.status}
              </span>
              {selectedSprintObj.goal && (
                <span className="text-gray-400 italic truncate max-w-xs">{selectedSprintObj.goal}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sprint Filter */}
          <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-gray-900">All Sprints</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900">
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          {/* Separate New Sprint Button */}
          {canConfig && (
            <button
              onClick={() => {
                setEditingSprint(null);
                setIsSprintModalOpen(true);
              }}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
              title="Create new Sprint"
            >
              <Plus className="w-3.5 h-3.5" />
              New Sprint
            </button>
          )}

          {/* Separate Edit Sprint Button (visible when a sprint is selected) */}
          {canConfig && selectedSprintId !== 'ALL' && (
            <button
              onClick={() => {
                const found = sprints.find((s) => s.id === selectedSprintId);
                if (found) {
                  setEditingSprint(found);
                  setIsSprintModalOpen(true);
                }
              }}
              className="px-3 py-1.5 bg-gray-900/80 hover:bg-gray-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
              title="Edit selected Sprint"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Sprint
            </button>
          )}

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

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${overdueOnly
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

          {canConfig && (
            <button
              onClick={() => setCreateModalStatus('TODO')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Columns */}
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
              canConfig={canConfig}
              canDragTask={canMoveTask}
              onTaskClick={(task) => setSelectedTaskDetail(task)}
              onAddTask={(status) => setCreateModalStatus(status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} onClick={() => { }} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={!!selectedTaskDetail}
        onClose={() => setSelectedTaskDetail(null)}
        task={selectedTaskDetail}
        members={projectMembers}
        sprints={sprints}
        canConfig={canConfig}
        canManageMembers={canManageMembers}
        onTaskUpdated={(updated) => {
          onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTaskDetail(updated);
        }}
        onTaskDeleted={(id) => {
          onTasksChange(tasks.filter((t) => t.id !== id));
          setSelectedTaskDetail(null);
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
          sprints={sprints}
          currentSprintId={selectedSprintId}
          canConfig={canConfig}
          canManageMembers={canManageMembers}
          currentUserId={user?.id}
          onTaskCreated={(newTask) => {
            onTasksChange([newTask, ...tasks]);
          }}
        />
      )}

      {/* Sprint Modal */}
      <SprintModal
        isOpen={isSprintModalOpen}
        onClose={() => {
          setIsSprintModalOpen(false);
          setEditingSprint(null);
        }}
        projectId={project.id}
        sprint={editingSprint}
        canManageSprints={canManageSprints}
        onSuccess={() => {
          fetchSprints();
          onRefreshTasks();
        }}
      />
    </div>
  );
};
