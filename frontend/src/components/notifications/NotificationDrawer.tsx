import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type { Notification } from '../../types/api';
import { api } from '../../lib/api';
import { getNotificationStyle } from '../../lib/notificationStyles';

interface NotificationDrawerProps {
  onSelectTask?: (taskId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ onSelectTask }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'demo-n1',
      title: 'Task Assigned',
      message: 'You have been assigned to "API CRUD sản phẩm"',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      task_id: 'demo-t6',
    },
    {
      id: 'demo-n2',
      title: 'New Comment',
      message: 'Trần Minh Quản commented on "Viết unit test cho module xác thực"',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      task_id: 'demo-t5',
    },
    {
      id: 'demo-n3',
      title: 'Deadline Warning',
      message: 'Task "Chức năng tìm kiếm sản phẩm nâng cao" is overdue!',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      task_id: 'demo-t13',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get<Notification[]>('/notifications');
        if (res.data && Array.isArray(res.data)) {
          setNotifications(res.data);
        }
      } catch {
        // Fallback to mock notifications if backend endpoint not yet deployed
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling per US-18
    return () => clearInterval(interval);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (item: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    if (item.task_id && onSelectTask) {
      onSelectTask(item.task_id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
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
              {notifications.length === 0 ? (
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
                      className={`relative overflow-hidden p-3 pl-4 rounded-xl cursor-pointer transition-all my-1 ${
                        item.is_read
                          ? 'opacity-60 hover:opacity-90 hover:bg-gray-800/40'
                          : `${style.unreadBg} border ${style.unreadBorder} ${style.unreadHover}`
                      }`}
                    >
                      {!item.is_read && (
                        <span
                          className={`absolute left-0 top-0 bottom-0 w-[3px] ${style.bar}`}
                          aria-hidden="true"
                        />
                      )}
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                            item.is_read ? 'bg-gray-800/60' : style.iconBg
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${item.is_read ? 'text-gray-400' : style.accent}`}
                          />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {new Date(item.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mt-0.5 leading-snug">{item.message}</p>
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
