import React, { useState, useEffect, useRef } from 'react';
import { 
  getNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from '../../services/notificationService';
import { useNotification } from '../../context/NotificationContext';

export default function NotificationCenter() {
  const { showNotification } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  // Fetch unread count initially and set interval to check every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications list when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      setPage(0);
      fetchNotificationsList(0, true);
    }
  }, [isOpen]);

  // Click outside detection to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const fetchNotificationsList = async (pageNum, reset = false) => {
    setIsLoading(true);
    try {
      const data = await getNotifications(pageNum, 5);
      if (reset) {
        setNotifications(data.content);
      } else {
        setNotifications((prev) => [...prev, ...data.content]);
      }
      setHasMore(!data.isLast);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchNotificationsList(page + 1);
  };

  const handleMarkRead = async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await markAsRead(id);
    } catch (err) {
      showNotification('Failed to mark notification as read', 'error');
      // Rollback
      fetchNotificationsList(0, true);
      fetchUnreadCount();
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await markAllAsRead();
      showNotification('All notifications marked as read', 'success');
    } catch (err) {
      showNotification('Failed to mark all as read', 'error');
      fetchNotificationsList(0, true);
      fetchUnreadCount();
    }
  };

  const handleDelete = async (id, wasUnread) => {
    // Optimistic UI update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    try {
      await deleteNotification(id);
    } catch (err) {
      showNotification('Failed to delete notification', 'error');
      fetchNotificationsList(0, true);
      fetchUnreadCount();
    }
  };

  const getSeverityStyles = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-950/60 border-rose-900/60 text-rose-400';
      case 'WARNING':
        return 'bg-amber-950/60 border-amber-900/60 text-amber-400';
      case 'INFO':
      default:
        return 'bg-emerald-950/60 border-emerald-900/60 text-emerald-400';
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded-xl border border-slate-700/40 hover:border-slate-700 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="View Alerts & Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 max-h-[480px] bg-slate-900/95 border border-slate-800/90 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden z-50 flex flex-col animate-slide-in pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Alert Center</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {unreadCount} unread notification{unreadCount !== 1 && 's'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-350 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto max-h-[320px] custom-scrollbar divide-y divide-slate-850">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <span className="text-2xl mb-2">🔔</span>
                <p className="text-sm font-semibold text-slate-400">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">You have no active alerts.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 flex gap-3 transition-colors hover:bg-slate-850/40 relative group ${
                    !item.read ? 'bg-slate-850/15' : ''
                  }`}
                >
                  {/* Read dot indicator */}
                  {!item.read && (
                    <span className="absolute left-2 top-5 h-2 w-2 rounded-full bg-indigo-500"></span>
                  )}

                  <div className="flex-1 space-y-1.5 pl-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSeverityStyles(item.severity)}`}>
                        {item.severity}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed pr-6">{item.message}</p>
                  </div>

                  {/* Actions (Mark read, Delete) */}
                  <div className="flex flex-col gap-2 justify-start pt-1">
                    {!item.read && (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        className="text-slate-400 hover:text-indigo-400 p-1 rounded transition-colors"
                        title="Mark as read"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id, !item.read)}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors opacity-80 hover:opacity-100"
                      title="Delete Notification"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Pagination */}
          {hasMore && (
            <div className="p-3 border-t border-slate-800/80 bg-slate-950/45 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-350 transition-colors py-1 px-4 disabled:text-slate-600"
              >
                {isLoading ? 'Loading...' : 'Load Older Alerts'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
