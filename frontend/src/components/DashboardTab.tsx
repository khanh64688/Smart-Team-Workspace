import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import type { DashboardStats } from "../services/api";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  CartesianGrid
} from "recharts";
import { 
  ListTodo, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  PieChart, 
  BarChart, 
  Users 
} from "lucide-react";

interface DashboardTabProps {
  projectId: string;
}

const COLORS = {
  TODO: "#64748b",
  IN_PROGRESS: "#6366f1",
  REVIEW: "#f59e0b",
  DONE: "#10b981",
  
  LOW: "#94a3b8",
  MEDIUM: "#6366f1",
  HIGH: "#f59e0b",
  URGENT: "#f43f5e",
};

const PIE_COLORS = ["#94a3b8", "#6366f1", "#f59e0b", "#10b981"];

export const DashboardTab: React.FC<DashboardTabProps> = ({ projectId }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.dashboard.getStats(projectId);
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch dashboard statistics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!stats || stats.total_tasks === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-white/60">
        <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h4 className="text-lg font-bold text-slate-700 mb-1">Dự án chưa có dữ liệu thống kê</h4>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Hãy thêm các thẻ công việc (Task) trong tab Sprint để biểu đồ có thể phân tích tiến độ dự án của bạn.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex items-center gap-4 hover:border-indigo-200 transition duration-200">
          <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng số task</div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">{stats.total_tasks}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex items-center gap-4 hover:border-indigo-200 transition duration-200">
          <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đang thực hiện</div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">{stats.in_progress}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex items-center gap-4 hover:border-indigo-200 transition duration-200">
          <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Đã hoàn thành</div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">{stats.completed}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex items-center gap-4 hover:border-indigo-200 transition duration-200">
          <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Task trễ hạn</div>
            <div className="text-2xl font-bold text-rose-600 font-mono mt-0.5">{stats.overdue}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 px-1">
            <PieChart className="h-4.5 w-4.5 text-indigo-600" />
            <h4 className="font-bold text-sm text-slate-800">Trạng thái công việc</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={stats.status_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {stats.status_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", fontSize: "12px", color: "#0f172a", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 px-1">
            <BarChart className="h-4.5 w-4.5 text-indigo-600" />
            <h4 className="font-bold text-sm text-slate-800">Độ ưu tiên công việc</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={stats.priority_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "11px" }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", fontSize: "12px", color: "#0f172a", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]}>
                  {stats.priority_distribution.map((entry, index) => {
                    const color = entry.name === "Khẩn cấp" ? COLORS.URGENT :
                                  entry.name === "Cao" ? COLORS.HIGH :
                                  entry.name === "Trung bình" ? COLORS.MEDIUM : COLORS.LOW;
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-4.5 w-4.5 text-indigo-600" />
            <h4 className="font-bold text-sm text-slate-800">Khối lượng công việc của thành viên</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={stats.assignee_workload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "11px" }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", fontSize: "12px", color: "#0f172a", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="todo" name="Cần làm" stackId="a" fill={COLORS.TODO} />
                <Bar dataKey="in_progress" name="Đang làm" stackId="a" fill={COLORS.IN_PROGRESS} />
                <Bar dataKey="review" name="Đánh giá" stackId="a" fill={COLORS.REVIEW} />
                <Bar dataKey="done" name="Hoàn thành" stackId="a" fill={COLORS.DONE} radius={[6, 6, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

