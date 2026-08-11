import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, UserX, ArrowRight } from 'lucide-react';
import type { AISummary } from '../../types/api';
import type { ChatMessage } from '../../types/chat';

const SummarySection: React.FC<{
  icon: React.ReactNode;
  title: string;
  items: string[];
  color: string;
}> = ({ icon, title, items, color }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2.5">
      <div className={`flex items-center gap-1.5 text-[11px] font-bold ${color}`}>
        {icon}
        {title}
      </div>
      <ul className="mt-1 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-[11px] text-gray-300 leading-snug pl-5 relative">
            <span className="absolute left-2 text-gray-600">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Thẻ tóm tắt dùng lại đúng shape AISummary — bot trả về card, không phải tường chữ. */
const SummaryCard: React.FC<{ summary: AISummary }> = ({ summary }) => (
  <div className="mt-2 p-3 rounded-2xl bg-gray-950/60 border border-indigo-500/20">
    <p className="text-[11px] text-gray-200 leading-relaxed">{summary.overview}</p>
    <SummarySection
      icon={<CheckCircle2 className="w-3 h-3" />}
      title="ĐÃ HOÀN THÀNH"
      items={summary.completed}
      color="text-emerald-400"
    />
    <SummarySection
      icon={<AlertTriangle className="w-3 h-3" />}
      title="RỦI RO"
      items={summary.at_risk}
      color="text-amber-400"
    />
    <SummarySection
      icon={<ShieldAlert className="w-3 h-3" />}
      title="BLOCKER"
      items={summary.blockers}
      color="text-rose-400"
    />
    <SummarySection
      icon={<UserX className="w-3 h-3" />}
      title="QUÁ TẢI"
      items={summary.overloaded_members}
      color="text-orange-400"
    />
    <SummarySection
      icon={<ArrowRight className="w-3 h-3" />}
      title="ƯU TIÊN TIẾP THEO"
      items={summary.next_priorities}
      color="text-indigo-400"
    />
  </div>
);

export const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="max-w-[85%] self-end px-3.5 py-2 rounded-2xl rounded-br-md bg-indigo-600 text-white text-xs leading-relaxed whitespace-pre-line">
        {message.content}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 max-w-[92%] self-start">
      <div className="w-7 h-7 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="px-3.5 py-2 rounded-2xl rounded-bl-md bg-gray-800/70 border border-gray-700/60 text-xs text-gray-100 leading-relaxed whitespace-pre-line">
          {message.content}
          {message.summary && <SummaryCard summary={message.summary} />}
        </div>
        {message.is_mock && (
          <p className="mt-1 text-[10px] text-amber-400/80 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Dữ liệu mẫu — {message.mock_reason ?? 'không gọi được backend'}
          </p>
        )}
      </div>
    </div>
  );
};
