import React, { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, ListTodo, Sparkles } from 'lucide-react';
import type { Project, DashboardMetrics } from '../types/api';
import { api } from '../lib/api';

interface DashboardPageProps {
  project: Project | null;
  onOpenAISummary: () => void;
}

const STATUS_COLORS = {
  TODO: '#64748B',
  IN_PROGRESS: '#F59E0B',
  REVIEW: '#A855F7',
  DONE: '#10B981',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ project, onOpenAISummary }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_tasks: 26,
    in_progress_tasks: 8,
    completed_tasks: 12,
    overdue_tasks: 3,
    by_status: { TODO: 6, IN_PROGRESS: 8, REVIEW: 2, DONE: 10 },
    by_priority: { LOW: 4, MEDIUM: 10, HIGH: 8, URGENT: 4 },
    by_assignee: [
      { user_id: 4, user_name: 'Lê Thị An', count: 8 },
      { user_id: 5, user_name: 'Phạm Quốc Bình', count: 7 },
      { user_id: 6, user_name: 'Đỗ Ngọc Chi', count: 6 },
      { user_id: 7, user_name: 'Vũ Tiến Dũng', count: 5 },
    ],
  });

  useEffect(() => {
    if (project) {
      fetchDashboardMetrics();
    }
  }, [project]);

  const fetchDashboardMetrics = async () => {
    if (!project) return;
    try {
      const res = await api.get<DashboardMetrics>(`/projects/${project.id}/dashboard`);
      if (res.data) setMetrics(res.data);
    } catch {
      // Use mock seed metrics
    }
  };

  const statusPieData = [
    { name: 'Todo', value: metrics.by_status.TODO || 0, color: STATUS_COLORS.TODO },
    { name: 'In Progress', value: metrics.by_status.IN_PROGRESS || 0, color: STATUS_COLORS.IN_PROGRESS },
    { name: 'Review', value: metrics.by_status.REVIEW || 0, color: STATUS_COLORS.REVIEW },
    { name: 'Done', value: metrics.by_status.DONE || 0, color: STATUS_COLORS.DONE },
  ];

  const priorityBarData = [
    { name: 'Low', count: metrics.by_priority.LOW || 0, fill: '#10B981' },
    { name: 'Medium', count: metrics.by_priority.MEDIUM || 0, fill: '#3B82F6' },
    { name: 'High', count: metrics.by_priority.HIGH || 0, fill: '#F59E0B' },
    { name: 'Urgent', count: metrics.by_priority.URGENT || 0, fill: '#F43F5E' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Project Analytics</h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time status overview, priority distribution, workload & overdue risk monitoring
          </p>
        </div>

        <button
          onClick={onOpenAISummary}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Generate AI Sprint Report
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel p-5 rounded-3xl border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Tasks</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{metrics.total_tasks}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
            <ListTodo className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">In Progress</p>
            <h3 className="text-3xl font-extrabold text-amber-400 mt-1">{metrics.in_progress_tasks}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Completed</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">{metrics.completed_tasks}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-rose-500/20 bg-rose-950/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Overdue Tasks</p>
            <h3 className="text-3xl font-extrabold text-rose-400 mt-1">{metrics.overdue_tasks}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Pie Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-gray-800/80">
          <h3 className="text-sm font-bold text-white mb-4">Task Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Bar Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-gray-800/80">
          <h3 className="text-sm font-bold text-white mb-4">Task Priority Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityBarData}>
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Assignee Workload Breakdown */}
      <div className="glass-panel p-6 rounded-3xl border border-gray-800/80">
        <h3 className="text-sm font-bold text-white mb-4">Team Workload per Member</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.by_assignee.map((item) => (
            <div key={item.user_id} className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                  {item.user_name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{item.user_name}</p>
                  <p className="text-[10px] text-gray-400">Assigned Tasks</p>
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
