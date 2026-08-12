import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, AlertTriangle, MessageSquare } from 'lucide-react';
import type { Notification } from '../../types/api';
import { api } from '../../lib/api';

interface NotificationDrawerProps {
  onSelectTask?: (taskId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ onSelectTask }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);


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
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3 rounded-xl cursor-pointer transition-all my-1 ${
                      item.is_read
                        ? 'hover:bg-gray-800/40 opacity-70'
                        : 'bg-indigo-950/20 border border-indigo-500/20 hover:bg-indigo-950/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {item.title.includes('Deadline') ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      ) : item.title.includes('Comment') ? (
                        <MessageSquare className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white">{item.title}</p>
                          <span className="text-[10px] text-gray-500">
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
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
