import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { Task, MemberOut, Sprint } from "../services/api";
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  AlertCircle, 
  User, 
  Clock, 
  HelpCircle,
  AlertOctagon
} from "lucide-react";

interface KanbanBoardProps {
  projectId?: string;
  members: MemberOut[];
  sprints: Sprint[];
  tasks: Task[];
  onTasksUpdated: () => void;
}

const COLUMNS: { id: Task["status"]; title: string; color: string; border: string; bg: string }[] = [
  { id: "TODO", title: "Cần làm", color: "text-slate-700", border: "border-slate-200", bg: "bg-slate-100/60" },
  { id: "IN_PROGRESS", title: "Đang làm", color: "text-indigo-700", border: "border-indigo-200/80", bg: "bg-indigo-50/40" },
  { id: "REVIEW", title: "Đánh giá", color: "text-amber-700", border: "border-amber-200/80", bg: "bg-amber-50/40" },
  { id: "DONE", title: "Hoàn thành", color: "text-emerald-700", border: "border-emerald-200/80", bg: "bg-emerald-50/40" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ members, sprints, tasks, onTasksUpdated }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError: boolean } | null>(null);

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
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-5">
          <AlertOctagon className="h-5 w-5 text-rose-500 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

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

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 opacity-90 cursor-grabbing">
              <TaskCard task={activeTask} members={members} sprints={sprints} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {filteredTasks.length === 0 && (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white/60">
          <HelpCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500 font-semibold">Không tìm thấy task phù hợp</p>
        </div>
      )}
    </div>
  );
};

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
      className={`rounded-2xl border ${column.border} ${column.bg} p-4 flex flex-col min-h-[500px] shadow-xs backdrop-blur-xs`}
    >
      <div className="flex items-center justify-between mb-4 px-1.5">
        <h4 className={`font-bold text-sm tracking-wide flex items-center gap-2 ${column.color}`}>
          <span>{column.title}</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-600 font-mono shadow-xs">
            {tasks.length}
          </span>
        </h4>
      </div>

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
        className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/30 h-28"
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

  const now = new Date();
  const deadlineDate = new Date(task.deadline);
  const isOverdue = task.status !== "DONE" && deadlineDate < now;

  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentParams = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...currentParams, task: task.id });
  };

  const getPriorityBadge = (p: Task["priority"]) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200 font-medium";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
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
      className={`rounded-xl border bg-white p-4 space-y-3 transition duration-200 hover:border-indigo-300 hover:shadow-md shadow-xs ${
        isOverdue ? "border-rose-300 bg-rose-50/30 hover:border-rose-400" : "border-slate-200/90"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h5 className="font-semibold text-slate-800 text-xs leading-relaxed line-clamp-2">
          {task.title}
        </h5>
        
        {isOverdue && (
          <span className="flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold bg-rose-500 text-white uppercase tracking-wider animate-pulse">
            <AlertCircle className="h-3 w-3" />
            <span>Trễ</span>
          </span>
        )}
      </div>

      {task.description && (
        <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className={`rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
          {getPriorityLabel(task.priority)}
        </span>

        {sprint && (
          <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
            {sprint.name.split(" ")[0] || "Sprint"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
        <div className="flex items-center gap-2 text-slate-500">
          {assignee ? (
            <>
              {assignee.email.includes("An") || assignee.email.includes("chi") || assignee.email.includes("binh") || assignee.user_id.startsWith("u-") ? (
                <div className="h-4.5 w-4.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(assignee.full_name)}`} alt="avatar" className="h-full w-full" />
                </div>
              ) : (
                <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[8px] font-bold">
                  {assignee.full_name.charAt(0)}
                </div>
              )}
              <span className="truncate max-w-[90px]">{assignee.full_name}</span>
            </>
          ) : (
            <span className="text-slate-400 flex items-center gap-1 font-semibold italic">
              <User className="h-3 w-3" />
              <span>Chưa giao</span>
            </span>
          )}
        </div>

        <div className={`flex items-center gap-1 font-medium font-mono ${isOverdue ? "text-rose-600 font-bold" : "text-slate-400"}`}>
          <Clock className="h-3.5 w-3.5" />
          <span>
            {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};
