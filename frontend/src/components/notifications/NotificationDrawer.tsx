import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type {
  MarkAllReadResponse,
  Notification,
  UnreadCountResponse,
} from '../../types/api';
import { api } from '../../lib/api';
import { getNotificationStyle } from '../../lib/notificationStyles';

/** Nhịp polling cơ bản; mỗi lần lỗi liên tiếp giãn gấp đôi, chặn trên ở POLL_MAX_MS. */
const POLL_BASE_MS = 30_000;
const POLL_MAX_MS = 5 * 60_000;

/** Số bậc backoff tối đa (2^4 × 30s = 8 phút, đã vượt POLL_MAX_MS nên dừng ở đó). */
const MAX_BACKOFF_STEPS = 4;

/** Quá ngưỡng này badge hiện "9+" thay vì số thật, để không phá vòng tròn 16px. */
const BADGE_MAX = 9;

interface NotificationDrawerProps {
  onSelectTask?: (taskId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ onSelectTask }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const failureCountRef = useRef(0);

  /**
   * Badge lấy từ /notifications/unread-count chứ không đếm trong `notifications`:
   * danh sách bị giới hạn 50 bản ghi nên đếm tại chỗ sẽ hụt khi user có nhiều hơn.
   */
  const refreshUnreadCount = useCallback(async () => {
    const res = await api.get<UnreadCountResponse>('/notifications/unread-count');
    setUnreadCount(res.data.unread_count);
  }, []);

  /**
   * Polling badge. Chỉ gọi endpoint đếm cho nhẹ — danh sách đầy đủ để lúc mở
   * drawer mới lấy. Vẫn phải chạy nền kể cả khi drawer đóng, vì backend sinh
   * thông báo deadline ngay trong request này (NotificationService.sync_due_notifications):
   * dự án không có scheduler riêng, polling chính là nhịp chạy.
   */
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      const delay = Math.min(POLL_BASE_MS * 2 ** failureCountRef.current, POLL_MAX_MS);
      timer = setTimeout(tick, delay);
    };

    const tick = async () => {
      if (!active) return;

      // Tab đang ẩn thì bỏ lượt này và hẹn lượt sau — không gọi API cho tab không ai nhìn.
      if (document.hidden) {
        schedule();
        return;
      }

      try {
        await refreshUnreadCount();
        failureCountRef.current = 0;
      } catch {
        // Lỗi chỉ làm giãn nhịp poll chứ không dừng hẳn: backend có thể đang
        // restart và sẽ sống lại sau vài chục giây.
        failureCountRef.current = Math.min(failureCountRef.current + 1, MAX_BACKOFF_STEPS);
      }

      if (active) schedule();
    };

    // Quay lại tab thì cập nhật ngay, không bắt người dùng đợi hết chu kỳ.
    const handleVisibilityChange = () => {
      if (document.hidden || !active) return;

      if (timer) clearTimeout(timer);
      failureCountRef.current = 0;
      tick();
    };

    tick();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUnreadCount]);

  const openDrawer = async () => {
    setIsOpen(true);
    setIsLoading(true);

    try {
      const res = await api.get<Notification[]>('/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
      await refreshUnreadCount();
    } catch {
      // Giữ nguyên danh sách đang có; lượt poll kế tiếp sẽ chỉnh lại badge.
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật giao diện trước rồi mới gọi API (optimistic). API hỏng thì trả lại
  // đúng trạng thái cũ thay vì để badge lệch với server cho tới lần poll sau.
  const markAllRead = async () => {
    const previousNotifications = notifications;
    const previousCount = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await api.post<MarkAllReadResponse>('/notifications/read-all');
    } catch {
      setNotifications(previousNotifications);
      setUnreadCount(previousCount);
    }
  };

  const handleNotificationClick = async (item: Notification) => {
    if (item.task_id && onSelectTask) {
      onSelectTask(item.task_id);
    }

    setIsOpen(false);

    if (item.is_read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await api.patch(`/notifications/${item.id}/read`);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((count) => count + 1);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => (isOpen ? setIsOpen(false) : openDrawer())}
        className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > BADGE_MAX ? `${BADGE_MAX}+` : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-2xl shadow-2xl border border-gray-800 z-50 p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-400 font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-800/50 my-2 pr-1">
              {isLoading && notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((item) => {
                  const style = getNotificationStyle(item);
                  const Icon = style.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3 rounded-xl cursor-pointer transition-all my-1 border ${
                        item.is_read
                          ? 'border-transparent hover:bg-gray-800/40 opacity-70'
                          : `${style.unreadBg} ${style.unreadBorder} ${style.unreadHover}`
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${style.iconBg}`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${style.accent}`} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-white truncate">
                              {item.title}
                            </p>
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {new Date(item.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
