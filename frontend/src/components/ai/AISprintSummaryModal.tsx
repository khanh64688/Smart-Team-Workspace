import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, UserX, ArrowRight } from 'lucide-react';
import type { AISummary } from '../../types/api';
import { api } from '../../lib/api';

interface AISprintSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId?: string;
}

export const AISprintSummaryModal: React.FC<AISprintSummaryModalProps> = ({
  isOpen,
  onClose,
  sprintId = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AISummary | null>({
    overview:
      'Sprint 1 đang tiến triển tốt với 12 task hoàn thành (46%). Tuy nhiên có 3 task rủi ro quá hạn và Vũ Tiến Dũng đang đảm nhận 5 task cùng lúc.',
    completed: [
      'Thiết kế ERD cho toàn hệ thống',
      'Dựng skeleton FastAPI + Docker Compose',
      'API đăng ký / đăng nhập với JWT',
      'Màn hình đăng nhập bằng React',
    ],
    at_risk: [
      'Chức năng tìm kiếm sản phẩm nâng cao (quá hạn 3 ngày)',
      'API CRUD sản phẩm (chưa đóng spec)',
    ],
    blockers: [
      'Chưa cấu hình tài khoản sandbox cho VNPAY làm nghẽn task thanh toán',
    ],
    overloaded_members: ['Vũ Tiến Dũng (5 tasks IN_PROGRESS/TODO)'],
    next_priorities: [
      'Giải quyết blocker thanh toán VNPAY',
      'Hỗ trợ Vũ Tiến Dũng hoàn thành module search',
    ],
  });

  if (!isOpen) return null;

  const handleRefreshAI = async () => {
    setLoading(true);
    try {
      const res = await api.post<AISummary>(`/sprints/${sprintId}/ai-summary`);
      if (res.data) setSummary(res.data);
    } catch {
      // Mock refresh delay
      setTimeout(() => {
        setLoading(false);
      }, 1200);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-3xl glass-panel rounded-3xl border border-indigo-500/30 p-6 shadow-2xl relative max-h-[90vh] flex flex-col glow-purple">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Sprint Report & Risk Insights
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Gemini / OpenAI
                </span>
              </h2>
              <p className="text-xs text-gray-400">Automated Sprint synthesis & bottleneck detection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-semibold text-white">Analyzing Sprint context...</p>
              <p className="text-xs text-gray-400 mt-1">Evaluating task deadlines, velocity & blockers</p>
            </div>
          ) : (
            summary && (
              <>
                {/* Executive Overview */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/20">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Executive Overview
                  </h3>
                  <p className="text-xs text-gray-200 leading-relaxed">{summary.overview}</p>
                </div>

                {/* Grid Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Completed */}
                  <div className="p-4 rounded-2xl bg-gray-900/60 border border-emerald-500/20">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed Highlights
                    </h4>
                    <ul className="space-y-2">
                      {summary.completed.map((item, idx) => (
                        <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* At-Risk */}
                  <div className="p-4 rounded-2xl bg-gray-900/60 border border-amber-500/20">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      At-Risk Tasks
                    </h4>
                    <ul className="space-y-2">
                      {summary.at_risk.map((item, idx) => (
                        <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Blockers */}
                  <div className="p-4 rounded-2xl bg-gray-900/60 border border-rose-500/20">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      Identified Blockers
                    </h4>
                    <ul className="space-y-2">
                      {summary.blockers.map((item, idx) => (
                        <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Overloaded Members */}
                  <div className="p-4 rounded-2xl bg-gray-900/60 border border-purple-500/20">
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <UserX className="w-4 h-4" />
                      Overloaded Team Members
                    </h4>
                    <ul className="space-y-2">
                      {summary.overloaded_members.map((item, idx) => (
                        <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Next Priorities */}
                <div className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                    Recommended Next Priorities
                  </h4>
                  <div className="space-y-2">
                    {summary.next_priorities.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-gray-800/40 text-xs text-gray-200 flex items-center gap-2">
                        <span className="font-bold text-indigo-400">{idx + 1}.</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Cached report. Re-generate for live context.</span>
          <button
            onClick={handleRefreshAI}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Re-generate
          </button>
        </div>
      </div>
    </div>
  );
};
