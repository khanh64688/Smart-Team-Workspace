import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api, Sprint, MemberOut, Task } from "../services/api";
import { 
  Plus, 
  Calendar, 
  User, 
  AlertOctagon, 
  Play, 
  Lock, 
  Layers,
  Clock,
  ListTodo
} from "lucide-react";

interface SprintTabProps {
  projectId: string;
  members: MemberOut[];
  sprints: Sprint[];
  tasks: Task[];
  onSprintsUpdated: () => void;
  onTasksUpdated: () => void;
}

export const SprintTab: React.FC<SprintTabProps> = ({ 
  projectId, 
  members, 
  sprints, 
  tasks, 
  onSprintsUpdated, 
  onTasksUpdated 
}) => {
  const { user } = useAuth();
  
  // Modals visibility
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  // Create Sprint states
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [sprintStart, setSprintStart] = useState("");
  const [sprintEnd, setSprintEnd] = useState("");
  
  // Create Task states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskSprintId, setTaskSprintId] = useState<string | null>(null);
  const [taskAssigneeId, setTaskAssigneeId] = useState<string | null>(null);
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("MEDIUM");
  const [taskDeadline, setTaskDeadline] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check permissions: PM/Owner/Admin can add sprint and task
  const projectMember = members.find((m) => m.user_id === user?.id);
  const isOwnerOrManager = projectMember?.project_role === "OWNER" || projectMember?.project_role === "MANAGER" || user?.role === "ADMIN";

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrManager) return;
    if (!sprintName.trim()) {
      setError("Tên Sprint không được để trống.");
      return;
    }
    setLoading(true);
    try {
      await api.sprints.create(
        projectId,
        sprintName,
        sprintGoal,
        new Date(sprintStart).toISOString(),
        new Date(sprintEnd).toISOString()
      );
      setShowCreateSprint(false);
      setSprintName("");
      setSprintGoal("");
      setSprintStart("");
      setSprintEnd("");
      setError("");
      onSprintsUpdated();
    } catch (err: any) {
      setError(err.message || "Tạo Sprint thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSprint = async (sprintId: string) => {
    if (!isOwnerOrManager) return;
    if (confirm("Bạn có chắc chắn muốn đóng Sprint này không? Các task chưa hoàn thành sẽ giữ nguyên và bạn sẽ không thể mở lại Sprint.")) {
      try {
        await api.sprints.update(sprintId, "CLOSED");
        onSprintsUpdated();
      } catch (err: any) {
        alert(err.message || "Đóng Sprint thất bại.");
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrManager) return;
    if (!taskTitle.trim()) {
      setError("Tiêu đề không được để trống.");
      return;
    }
    setLoading(true);
    try {
      await api.tasks.create({
        title: taskTitle,
        description: taskDesc,
        project_id: projectId,
        sprint_id: taskSprintId === "UNASSIGNED" ? null : taskSprintId,
        assignee_id: taskAssigneeId === "UNASSIGNED" ? null : taskAssigneeId,
        priority: taskPriority,
        status: "TODO",
        deadline: new Date(taskDeadline).toISOString(),
      });
      setShowCreateTask(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskSprintId(null);
      setTaskAssigneeId(null);
      setTaskPriority("MEDIUM");
      setTaskDeadline("");
      setError("");
      onTasksUpdated();
    } catch (err: any) {
      setError(err.message || "Tạo công việc thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateTaskModal = (defaultSprintId: string | null) => {
    setTaskSprintId(defaultSprintId || "UNASSIGNED");
    // Default deadline to 7 days from now
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setTaskDeadline(nextWeek.toISOString().substring(0, 10));
    setShowCreateTask(true);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header toolbar with actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Layers className="h-5 w-5 text-cyan-400" />
          <span>Vòng lặp phát triển (Sprints)</span>
        </h3>
        
        {isOwnerOrManager && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError("");
                // Default start is today, end is 14 days from now
                const today = new Date();
                const end = new Date();
                end.setDate(today.getDate() + 14);
                setSprintStart(today.toISOString().substring(0, 10));
                setSprintEnd(end.toISOString().substring(0, 10));
                setShowCreateSprint(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo Sprint mới</span>
            </button>
            <button
              onClick={() => openCreateTaskModal(null)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:from-cyan-300 hover:to-blue-400 transition shadow"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Tạo Task</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Sprint Lists */}
      <div className="space-y-5">
        {sprints.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-900 rounded-xl bg-slate-950/10">
            <Layers className="mx-auto h-8 w-8 text-slate-700 mb-2" />
            <p className="text-sm text-slate-500 font-semibold">Chưa có Sprint nào được tạo</p>
          </div>
        ) : (
          [...sprints].reverse().map((sprint) => {
            const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
            const doneTasks = sprintTasks.filter((t) => t.status === "DONE");
            const progressPct = sprintTasks.length > 0 ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0;

            return (
              <div 
                key={sprint.id}
                className={`rounded-2xl border bg-slate-900/10 p-5 space-y-4 shadow-sm transition ${
                  sprint.status === "ACTIVE" ? "border-cyan-500/25 bg-cyan-500/5" : "border-slate-900/80"
                }`}
              >
                {/* Sprint title & actions header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-slate-100">{sprint.name}</h4>
                      {sprint.status === "ACTIVE" ? (
                        <span className="flex items-center gap-1 rounded bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                          <Play className="h-2.5 w-2.5 fill-cyan-400" />
                          <span>Đang chạy</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          <Lock className="h-2.5 w-2.5" />
                          <span>Đã đóng</span>
                        </span>
                      )}
                    </div>
                    {sprint.goal && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sprint.goal}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Dates */}
                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                      </span>
                    </div>

                    {isOwnerOrManager && sprint.status === "ACTIVE" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openCreateTaskModal(sprint.id)}
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-400 transition"
                        >
                          Thêm Task
                        </button>
                        <button
                          onClick={() => handleCloseSprint(sprint.id)}
                          className="rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 transition"
                        >
                          Đóng Sprint
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {sprintTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span>Tiến độ Sprint</span>
                      <span className="font-mono text-slate-300">{doneTasks.length}/{sprintTasks.length} Task ({progressPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500" 
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Task list preview in sprint */}
                <div className="divide-y divide-slate-950 border-t border-slate-900/60 pt-2 space-y-1">
                  {sprintTasks.length === 0 ? (
                    <p className="text-xs text-slate-600 py-3 italic">Không có thẻ công việc nào trong sprint này.</p>
                  ) : (
                    sprintTasks.map((t) => {
                      const assignee = members.find((m) => m.user_id === t.assignee_id);
                      return (
                        <div key={t.id} className="flex items-center justify-between py-2 text-xs hover:bg-slate-900/10 rounded px-1.5 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              t.status === "DONE" ? "bg-emerald-500" :
                              t.status === "REVIEW" ? "bg-amber-500" :
                              t.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-slate-600"
                            }`} />
                            <span className="font-semibold text-slate-300 truncate pr-4">{t.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0 font-mono text-[10px]">
                            {/* Priority */}
                            <span className={`font-bold uppercase tracking-wider text-[9px] ${
                              t.priority === "URGENT" ? "text-red-400" :
                              t.priority === "HIGH" ? "text-orange-400" :
                              t.priority === "MEDIUM" ? "text-blue-400" : "text-slate-500"
                            }`}>
                              {t.priority}
                            </span>
                            
                            {/* Assignee */}
                            <span className="text-slate-500">{assignee?.full_name ?? "Chưa giao"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Backlog tasks section */}
      <div className="rounded-2xl border border-slate-900 bg-slate-950/20 p-5 space-y-4 shadow-sm">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <ListTodo className="h-4.5 w-4.5 text-slate-500" />
          <span>Product Backlog (Chưa chia Sprint)</span>
        </h4>
        
        <div className="divide-y divide-slate-950 border-t border-slate-900/60 pt-2 space-y-1">
          {tasks.filter((t) => t.sprint_id === null).length === 0 ? (
            <p className="text-xs text-slate-600 py-4 italic">Backlog trống.</p>
          ) : (
            tasks.filter((t) => t.sprint_id === null).map((t) => {
              const assignee = members.find((m) => m.user_id === t.assignee_id);
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 text-xs hover:bg-slate-900/20 rounded px-2 transition">
                  <span className="font-semibold text-slate-300 truncate pr-4">{t.title}</span>
                  <div className="flex items-center gap-4 shrink-0 font-mono text-[10px]">
                    <span className="text-slate-500 font-bold">{t.priority}</span>
                    <span className="text-slate-500">{assignee?.full_name ?? "Chưa giao"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Modal Dialogs */}
      {/* Create Sprint Modal */}
      {showCreateSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Tạo Sprint mới</h3>
            {error && (
              <div className="mb-4 text-xs text-red-400 bg-red-950/20 border border-red-800/50 rounded-lg p-2.5">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tên Sprint *</label>
                <input
                  type="text"
                  required
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="Sprint 2, Sprint 3, v.v..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Mục tiêu Sprint</label>
                <textarea
                  rows={2}
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  placeholder="Mục tiêu cốt lõi cần đạt được..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={sprintStart}
                    onChange={(e) => setSprintStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Hạn kết thúc *</label>
                  <input
                    type="date"
                    required
                    value={sprintEnd}
                    onChange={(e) => setSprintEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateSprint(false)}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition"
                >
                  {loading ? "Đang tạo..." : "Khởi chạy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Thêm công việc (Task) mới</h3>
            {error && (
              <div className="mb-4 text-xs text-red-400 bg-red-950/20 border border-red-800/50 rounded-lg p-2.5">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tiêu đề công việc *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Nhập tiêu đề công việc..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Mô tả công việc</label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Mô tả chi tiết những gì cần làm..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Độ ưu tiên</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Task["priority"])}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2.5 px-2.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Hạn chót (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 px-3 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Người phụ trách (Assignee)</label>
                  <select
                    value={taskAssigneeId || "UNASSIGNED"}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2.5 px-2.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="UNASSIGNED">Chưa giao việc</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Chia vào Sprint</label>
                  <select
                    value={taskSprintId || "UNASSIGNED"}
                    onChange={(e) => setTaskSprintId(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2.5 px-2.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="UNASSIGNED">Chưa chia Sprint (Backlog)</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.status === "ACTIVE" ? "Đang chạy" : "Đã đóng"})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition"
                >
                  {loading ? "Đang tạo..." : "Thêm công việc"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
