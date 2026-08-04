import React, { useEffect, useState } from "react";
import { api, DashboardStats } from "../services/api";
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
  TODO: "#64748b",      // slate-500
  IN_PROGRESS: "#3b82f6", // blue-500
  REVIEW: "#f59e0b",      // amber-500
  DONE: "#10b981",        // emerald-500
  
  LOW: "#64748b",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",      // red-500
};

const PIE_COLORS = ["#64748b", "#3b82f6", "#f59e0b", "#10b981"];

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!stats || stats.total_tasks === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-slate-900 rounded-2xl bg-slate-950/20 backdrop-blur-xl">
        <TrendingUp className="mx-auto h-12 w-12 text-slate-700 mb-4" />
        <h4 className="text-lg font-bold text-slate-400 mb-1">Dự án chưa có dữ liệu thống kê</h4>
        <p className="text-sm text-slate-600 max-w-sm mx-auto">
          Hãy thêm các thẻ công việc (Task) trong tab Sprint để biểu đồ có thể phân tích tiến độ dự án của bạn.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Tasks Card */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 shadow-sm flex items-center gap-4 hover:border-slate-800 transition duration-200">
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng số task</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-0.5">{stats.total_tasks}</div>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 shadow-sm flex items-center gap-4 hover:border-slate-800 transition duration-200">
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-blue-950/40 text-blue-400 border border-blue-900/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đang thực hiện</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-0.5">{stats.in_progress}</div>
          </div>
        </div>

        {/* Completed Card */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 shadow-sm flex items-center gap-4 hover:border-slate-800 transition duration-200">
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/20">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đã hoàn thành</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-0.5">{stats.completed}</div>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 shadow-sm flex items-center gap-4 hover:border-slate-800 transition duration-200">
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-red-950/40 text-red-400 border border-red-900/20">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Task trễ hạn</div>
            <div className="text-2xl font-bold text-red-400 font-mono mt-0.5">{stats.overdue}</div>
          </div>
        </div>

      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status Distribution Pie Chart */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 space-y-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 px-1">
            <PieChart className="h-4.5 w-4.5 text-cyan-400" />
            <h4 className="font-bold text-sm text-slate-200">Trạng thái công việc</h4>
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
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#f8fafc" }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown Bar Chart */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 space-y-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 px-1">
            <BarChart className="h-4.5 w-4.5 text-cyan-400" />
            <h4 className="font-bold text-sm text-slate-200">Độ ưu tiên công việc</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={stats.priority_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "11px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#f8fafc" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
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

        {/* Workload breakdown stacked chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/20 p-5 space-y-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-4.5 w-4.5 text-cyan-400" />
            <h4 className="font-bold text-sm text-slate-200">Khối lượng công việc của thành viên</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={stats.assignee_workload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "11px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#f8fafc" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", pt: 10 }} />
                <Bar dataKey="todo" name="Cần làm" stackId="a" fill={COLORS.TODO} />
                <Bar dataKey="in_progress" name="Đang làm" stackId="a" fill={COLORS.IN_PROGRESS} />
                <Bar dataKey="review" name="Đánh giá" stackId="a" fill={COLORS.REVIEW} />
                <Bar dataKey="done" name="Hoàn thành" stackId="a" fill={COLORS.DONE} radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
