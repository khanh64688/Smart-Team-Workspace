import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { Sprint, MemberOut, Task } from "../services/api";
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
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-600" />
          <span>Vòng lặp phát triển (Sprints)</span>
        </h3>
        
        {isOwnerOrManager && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError("");
                const today = new Date();
                const end = new Date();
                end.setDate(today.getDate() + 14);
                setSprintStart(today.toISOString().substring(0, 10));
                setSprintEnd(end.toISOString().substring(0, 10));
                setShowCreateSprint(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo Sprint mới</span>
            </button>
            <button
              onClick={() => openCreateTaskModal(null)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white hover:from-indigo-500 hover:to-violet-500 transition shadow-xs"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Tạo Task</span>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {sprints.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white/60">
            <Layers className="mx-auto h-8 w-8 text-slate-300 mb-2" />
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
                className={`rounded-2xl border bg-white p-5 space-y-4 shadow-xs transition ${
                  sprint.status === "ACTIVE" ? "border-indigo-200 bg-indigo-50/20" : "border-slate-200/90"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-slate-800">{sprint.name}</h4>
                      {sprint.status === "ACTIVE" ? (
                        <span className="flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                          <Play className="h-2.5 w-2.5 fill-indigo-600" />
                          <span>Đang chạy</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
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
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                      </span>
                    </div>

                    {isOwnerOrManager && sprint.status === "ACTIVE" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openCreateTaskModal(sprint.id)}
                          className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 transition"
                        >
                          Thêm Task
                        </button>
                        <button
                          onClick={() => handleCloseSprint(sprint.id)}
                          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition"
                        >
                          Đóng Sprint
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {sprintTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Tiến độ Sprint</span>
                      <span className="font-mono text-slate-700">{doneTasks.length}/{sprintTasks.length} Task ({progressPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full transition-all duration-500" 
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2 space-y-1">
                  {sprintTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 italic">Không có thẻ công việc nào trong sprint này.</p>
                  ) : (
                    sprintTasks.map((t) => {
                      const assignee = members.find((m) => m.user_id === t.assignee_id);
                      return (
                        <div key={t.id} className="flex items-center justify-between py-2 text-xs hover:bg-slate-50 rounded-lg px-2 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              t.status === "DONE" ? "bg-emerald-500" :
                              t.status === "REVIEW" ? "bg-amber-500" :
                              t.status === "IN_PROGRESS" ? "bg-indigo-500" : "bg-slate-300"
                            }`} />
                            <span className="font-semibold text-slate-800 truncate pr-4">{t.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0 font-mono text-[10px]">
                            <span className={`font-bold uppercase tracking-wider text-[9px] ${
                              t.priority === "URGENT" ? "text-rose-600" :
                              t.priority === "HIGH" ? "text-amber-600" :
                              t.priority === "MEDIUM" ? "text-indigo-600" : "text-slate-400"
                            }`}>
                              {t.priority}
                            </span>
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

      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <ListTodo className="h-4.5 w-4.5 text-slate-400" />
          <span>Product Backlog (Chưa chia Sprint)</span>
        </h4>
        
        <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2 space-y-1">
          {tasks.filter((t) => t.sprint_id === null).length === 0 ? (
            <p className="text-xs text-slate-400 py-4 italic">Backlog trống.</p>
          ) : (
            tasks.filter((t) => t.sprint_id === null).map((t) => {
              const assignee = members.find((m) => m.user_id === t.assignee_id);
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 text-xs hover:bg-slate-50 rounded-lg px-2 transition">
                  <span className="font-semibold text-slate-800 truncate pr-4">{t.title}</span>
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

      {showCreateSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tạo Sprint mới</h3>
            {error && (
              <div className="mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tên Sprint *</label>
                <input
                  type="text"
                  required
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="Sprint 2, Sprint 3, v.v..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mục tiêu Sprint</label>
                <textarea
                  rows={2}
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  placeholder="Mục tiêu cốt lõi cần đạt được..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={sprintStart}
                    onChange={(e) => setSprintStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Hạn kết thúc *</label>
                  <input
                    type="date"
                    required
                    value={sprintEnd}
                    onChange={(e) => setSprintEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateSprint(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition shadow-sm"
                >
                  {loading ? "Đang tạo..." : "Khởi chạy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Thêm công việc (Task) mới</h3>
            {error && (
              <div className="mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tiêu đề công việc *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Nhập tiêu đề công việc..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mô tả công việc</label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Mô tả chi tiết những gì cần làm..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Độ ưu tiên</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Task["priority"])}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Hạn chót (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Người phụ trách (Assignee)</label>
                  <select
                    value={taskAssigneeId || "UNASSIGNED"}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="UNASSIGNED">Chưa giao việc</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Chia vào Sprint</label>
                  <select
                    value={taskSprintId || "UNASSIGNED"}
                    onChange={(e) => setTaskSprintId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none"
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
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition shadow-sm"
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

