import { UserPlus, MessageSquare, AlarmClock, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Notification } from '../types/api';

/**
 * Semantic colors for the three US-18 notification triggers.
 * Hues are spaced far apart on the wheel (239° / 190° / 43° / 350°) so each type
 * stays distinguishable, and every accent clears WCAG AA (4.5:1) on the dark
 * glass surface: indigo 5.8:1 · cyan 9.6:1 · amber 10.4:1 · rose 6.5:1.
 * Color is never the only signal — each type also carries its own icon + label.
 */
export type NotificationKind = 'assigned' | 'comment' | 'deadline' | 'overdue';

export interface NotificationStyle {
  label: string;
  icon: LucideIcon;
  /** Icon + title accent */
  accent: string;
  /** Circular icon chip behind the accent */
  iconBg: string;
  /** Unread row surface */
  unreadBg: string;
  unreadBorder: string;
  unreadHover: string;
  /** 3px bar on the left edge of a toast / unread row */
  bar: string;
  /** Toast glow, matches the accent hue */
  glow: string;
}

export const NOTIFICATION_STYLES: Record<NotificationKind, NotificationStyle> = {
  // Được giao task mới — brand indigo: "việc này là của bạn", ngang hàng primary action.
  assigned: {
    label: 'Task Assigned',
    icon: UserPlus,
    accent: 'text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    unreadBg: 'bg-indigo-500/10',
    unreadBorder: 'border-indigo-500/25',
    unreadHover: 'hover:bg-indigo-500/15',
    bar: 'bg-indigo-400',
    glow: 'shadow-indigo-500/20',
  },
  // Comment mới — cyan: kênh trao đổi, tách hẳn khỏi indigo để không lẫn với "được giao".
  comment: {
    label: 'New Comment',
    icon: MessageSquare,
    accent: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    unreadBg: 'bg-cyan-500/10',
    unreadBorder: 'border-cyan-500/25',
    unreadHover: 'hover:bg-cyan-500/15',
    bar: 'bg-cyan-400',
    glow: 'shadow-cyan-500/20',
  },
  // Còn ≤ 24h — amber: cảnh báo, chưa phải lỗi. Vẫn kịp xử lý.
  deadline: {
    label: 'Due Soon',
    icon: AlarmClock,
    accent: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    unreadBg: 'bg-amber-500/10',
    unreadBorder: 'border-amber-500/30',
    unreadHover: 'hover:bg-amber-500/15',
    bar: 'bg-amber-400',
    glow: 'shadow-amber-500/20',
  },
  // Quá hạn — rose: mức leo thang của deadline, dùng chung màu với destructive state.
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    accent: 'text-rose-400',
    iconBg: 'bg-rose-500/15',
    unreadBg: 'bg-rose-500/10',
    unreadBorder: 'border-rose-500/30',
    unreadHover: 'hover:bg-rose-500/15',
    bar: 'bg-rose-400',
    glow: 'shadow-rose-500/20',
  },
};

/**
 * Backend chưa trả về `type`, nên suy ra từ title/message.
 * Khi API bổ sung field `type`, chỉ cần đọc thẳng nó và bỏ phần đoán này.
 */
export const resolveNotificationKind = (item: Notification): NotificationKind => {
  const text = `${item.title} ${item.message}`.toLowerCase();

  if (text.includes('overdue') || text.includes('quá hạn')) return 'overdue';
  if (text.includes('deadline') || text.includes('due') || text.includes('hạn')) return 'deadline';
  if (text.includes('comment') || text.includes('bình luận')) return 'comment';
  return 'assigned';
};

export const getNotificationStyle = (item: Notification): NotificationStyle =>
  NOTIFICATION_STYLES[resolveNotificationKind(item)];
