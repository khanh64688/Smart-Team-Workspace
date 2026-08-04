import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { Task, MemberOut, Sprint } from "../services/api";
import { 
  DndContext, 
  DragEndEvent, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragOverlay,
  useDroppable
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Calendar, 
  AlertCircle, 
  User, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  AlertOctagon
} from "lucide-react";

interface KanbanBoardProps {
  projectId: string;
  members: MemberOut[];
  sprints: Sprint[];
  tasks: Task[];
  onTasksUpdated: () => void;
}

// Columns definition
const COLUMNS: { id: Task["status"]; title: string; color: string; border: string; bg: string }[] = [
  { id: "TODO", title: "Cần làm", color: "text-slate-300", border: "border-slate-800/80", bg: "bg-slate-900/10" },
  { id: "IN_PROGRESS", title: "Đang làm", color: "text-blue-400", border: "border-blue-900/30", bg: "bg-blue-500/5" },
  { id: "REVIEW", title: "Đánh giá", color: "text-amber-400", border: "border-amber-900/30", bg: "bg-amber-500/5" },
  { id: "DONE", title: "Hoàn thành", color: "text-emerald-400", border: "border-emerald-950/30", bg: "bg-emerald-500/5" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, members, sprints, tasks, onTasksUpdated }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Sync localTasks when props tasks changes (or on update)
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const showToast = (text: string, isError = true) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Configure sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid accidental drags when clicking card
      },
    })
  );

  // Apply filters from URL search params
  const filterLocalTasks = (taskList: Task[]) => {
    let list = [...taskList];
    const sprintId = searchParams.get("sprint_id");
    const assigneeId = searchParams.get("assignee_id");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const overdue = searchParams.get("overdue") === "true";
    const q = searchParams.get("q");

    if (sprintId !== null) {
      if (sprintId === "BACKLOG") {
        list = list.filter((t) => t.sprint_id === null);
      } else {
        list = list.filter((t) => t.sprint_id === sprintId);
      }
    }
    if (assigneeId) {
      if (assigneeId === "UNASSIGNED") {
        list = list.filter((t) => t.assignee_id === null);
      } else {
        list = list.filter((t) => t.assignee_id === assigneeId);
      }
    }
    if (priority) {
      list = list.filter((t) => t.priority === priority);
    }
    if (status) {
      list = list.filter((t) => t.status === status);
    }
    if (overdue) {
      const now = new Date();
      list = list.filter((t) => t.status !== "DONE" && new Date(t.deadline) < now);
    }
    if (q) {
      const query = q.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
    }

    return list.sort((a, b) => a.position - b.position);
  };

  const filteredTasks = filterLocalTasks(localTasks);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const draggedTask = localTasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    // Determine target status and position
    let newStatus: Task["status"] = draggedTask.status;
    let newPosition = draggedTask.position;

    // Check if over target is a column droppable
    const isColumn = COLUMNS.some((col) => col.id === overId);

    if (isColumn) {
      newStatus = overId as Task["status"];
      // Append to end of column
      const sameCol = localTasks.filter((t) => t.status === newStatus && t.id !== taskId);
      newPosition = sameCol.length + 1;
    } else {
      // Over target is a task card
      const targetTask = localTasks.find((t) => t.id === overId);
      if (targetTask) {
        newStatus = targetTask.status;
        newPosition = targetTask.position;
      }
    }

    // If same status and position, nothing changed
    if (draggedTask.status === newStatus && draggedTask.position === newPosition) {
      return;
    }

    // Role check and transitions rules validation in frontend
    // 1-step restriction checks: TODO <-> IN_PROGRESS <-> REVIEW <-> DONE
    const states: Task["status"][] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
    const oldIdx = states.indexOf(draggedTask.status);
    const newIdx = states.indexOf(newStatus);
    
    if (Math.abs(oldIdx - newIdx) > 1) {
      showToast("Chỉ được di chuyển thẻ tiến hoặc lùi 1 bước (ví dụ: Cần làm ↔ Đang làm, Đánh giá ↔ Hoàn thành).");
      return;
    }

    // Check Member vs PM permissions: members only drag their own tasks
    const projectMember = members.find((m) => m.user_id === user?.id);
    const isOwnerOrManager = projectMember?.project_role === "OWNER" || projectMember?.project_role === "MANAGER" || user?.role === "ADMIN";
    const isAssignee = draggedTask.assignee_id === user?.id;

    if (!isOwnerOrManager && !isAssignee) {
      showToast("Bạn chỉ có quyền di chuyển các công việc được giao cho chính bạn.");
      return;
    }

    // Save previous state for rollback
    const previousTasks = [...localTasks];

    // --- Perform Optimistic Update locally ---
    const updatedTasks = localTasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: newStatus, position: newPosition };
      }
      return t;
    });

    // Reorder positions in destination column
    const destTasks = updatedTasks
      .filter((t) => t.status === newStatus && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    // Insert task at target position
    destTasks.splice(newPosition - 1, 0, { ...draggedTask, status: newStatus });
    
    // Write index positions back
    destTasks.forEach((t, i) => {
      const idx = updatedTasks.findIndex((ut) => ut.id === t.id);
      if (idx !== -1) updatedTasks[idx].position = i + 1;
    });

    setLocalTasks(updatedTasks);

    // --- Call API in background ---
    try {
      await api.tasks.move(taskId, newStatus, newPosition);
      onTasksUpdated(); // Refetch fresh server data
    } catch (err: any) {
      console.error(err);
      // Rollback to previous state on error
      setLocalTasks(previousTasks);
      showToast(err.message || "Không thể cập nhật vị trí thẻ. Đã khôi phục.");
    }
  };

  const activeTask = localTasks.find((t) => t.id === activeId);

  return (
    <div className="relative space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-red-800/80 bg-red-950/80 px-4 py-3 text-sm font-semibold text-red-200 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-5">
          <AlertOctagon className="h-5 w-5 text-red-400 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Kanban columns flex row */}
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <KanbanColumn 
                key={col.id} 
                column={col} 
                tasks={colTasks} 
                members={members}
                sprints={sprints}
              />
            );
          })}
        </div>

        {/* Drag Overlay for smooth card look when dragging */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 opacity-80 cursor-grabbing">
              <TaskCard task={activeTask} members={members} sprints={sprints} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {filteredTasks.length === 0 && (
        <div className="py-16 text-center border border-dashed border-slate-900 rounded-xl bg-slate-950/10">
          <HelpCircle className="mx-auto h-8 w-8 text-slate-700 mb-2" />
          <p className="text-sm text-slate-500 font-semibold">Không tìm thấy task phù hợp</p>
        </div>
      )}
    </div>
  );
};

// --- Kanban Column Component ---
interface ColumnProps {
  column: typeof COLUMNS[0];
  tasks: Task[];
  members: MemberOut[];
  sprints: Sprint[];
}

const KanbanColumn: React.FC<ColumnProps> = ({ column, tasks, members, sprints }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`rounded-2xl border ${column.border} ${column.bg} p-4 flex flex-col min-h-[500px] shadow-sm`}
    >
      {/* Column Title Header */}
      <div className="flex items-center justify-between mb-4 px-1.5">
        <h4 className={`font-bold text-sm tracking-wide flex items-center gap-2 ${column.color}`}>
          <span>{column.title}</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 font-mono">
            {tasks.length}
          </span>
        </h4>
      </div>

      {/* Task List container */}
      <div className="flex-1 space-y-3">
        <SortableContext 
          items={tasks.map((t) => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              members={members} 
              sprints={sprints}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

// --- Sortable Task Card Wrapper ---
interface SortableTaskCardProps {
  task: Task;
  members: MemberOut[];
  sprints: Sprint[];
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({ task, members, sprints }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="rounded-xl border border-dashed border-slate-900 bg-slate-950/20 h-28"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <TaskCard task={task} members={members} sprints={sprints} />
    </div>
  );
};

// --- Core Task Card View ---
interface TaskCardProps {
  task: Task;
  members: MemberOut[];
  sprints: Sprint[];
  isOverlay?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, members, sprints, isOverlay = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const assignee = members.find((m) => m.user_id === task.assignee_id);
  const sprint = sprints.find((s) => s.id === task.sprint_id);

  // Check if overdue
  const now = new Date();
  const deadlineDate = new Date(task.deadline);
  const isOverdue = task.status !== "DONE" && deadlineDate < now;

  // Handle opening details modal on double-click or click action
  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentParams = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...currentParams, task: task.id });
  };

  // Get Priority Badge styles
  const getPriorityBadge = (p: Task["priority"]) => {
    switch (p) {
      case "URGENT":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "HIGH":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "LOW":
      default:
        return "bg-slate-800/40 text-slate-400 border-slate-800";
    }
  };

  const getPriorityLabel = (p: Task["priority"]) => {
    switch (p) {
      case "URGENT": return "Khẩn cấp";
      case "HIGH": return "Cao";
      case "MEDIUM": return "T.Bình";
      case "LOW": return "Thấp";
    }
  };

  return (
    <div
      onClick={handleOpenDetails}
      className={`rounded-xl border bg-slate-900/60 p-4 space-y-3 transition duration-200 hover:border-slate-800 hover:bg-slate-900/90 shadow-sm ${
        isOverdue ? "border-red-950/80 bg-red-950/5 hover:border-red-900/80" : "border-slate-900/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Title */}
        <h5 className="font-semibold text-slate-200 text-xs leading-relaxed line-clamp-2">
          {task.title}
        </h5>
        
        {/* Overdue Label */}
        {isOverdue && (
          <span className="flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-slate-950 uppercase tracking-wider animate-pulse">
            <AlertCircle className="h-3 w-3" />
            <span>Trễ</span>
          </span>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Metadata Badges */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Priority */}
        <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
          {getPriorityLabel(task.priority)}
        </span>

        {/* Sprint tag */}
        {sprint && (
          <span className="rounded-md border border-slate-800 bg-slate-950/40 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
            {sprint.name.split(" ")[0] || "Sprint"}
          </span>
        )}
      </div>

      {/* Footer Info: Assignee + Date */}
      <div className="flex items-center justify-between border-t border-slate-950 pt-2 text-[10px]">
        {/* Assignee info */}
        <div className="flex items-center gap-2 text-slate-400">
          {assignee ? (
            <>
              {assignee.email.includes("An") || assignee.email.includes("chi") || assignee.email.includes("binh") || assignee.user_id.startsWith("u-") ? (
                <div className="h-4.5 w-4.5 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(assignee.full_name)}`} alt="avatar" className="h-full w-full" />
                </div>
              ) : (
                <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-800 text-[8px] font-bold">
                  {assignee.full_name.charAt(0)}
                </div>
              )}
              <span className="truncate max-w-[90px]">{assignee.full_name}</span>
            </>
          ) : (
            <span className="text-slate-600 flex items-center gap-1 font-semibold italic">
              <User className="h-3 w-3" />
              <span>Chưa giao</span>
            </span>
          )}
        </div>

        {/* Deadline */}
        <div className={`flex items-center gap-1 font-medium font-mono ${isOverdue ? "text-red-400" : "text-slate-500"}`}>
          <Clock className="h-3.5 w-3.5" />
          <span>
            {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};
