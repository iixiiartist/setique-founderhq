import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useClickOutside } from '../../hooks';
import { formatRelativeTime } from '../../lib/utils/dateUtils';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationContext, { useNotificationContext } from '../../contexts/NotificationContext';
import type { Notification } from '../../lib/services/notificationService';
import { showError, showSuccess } from '../../lib/utils/toast';
import * as Sentry from '@sentry/react';

interface NotificationBellProps {
  /** @deprecated Pass nothing - uses NotificationContext if available */
  userId?: string;
  /** @deprecated Pass nothing - uses NotificationContext if available */
  workspaceId?: string;
  onNotificationClick?: (notification: Notification) => void;
  /** If true, uses standalone hook instead of context (legacy mode) */
  standalone?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  userId,
  workspaceId,
  onNotificationClick,
  standalone = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false), isOpen);
  const unreadCountRef = useRef<HTMLDivElement>(null);

  // Check if context is available
  const contextValue = useContext(NotificationContext);
  const useContextMode = !standalone && contextValue !== null;

  // Use context if available, otherwise fallback to standalone hook
  const standaloneHook = useNotifications({
    userId: userId || '',
    workspaceId,
    pageSize: 20,
    realtime: true,
    respectPreferences: true,
  });

  // Select the appropriate source
  const {
    notifications,
    unreadCount,
    loading,
    realtimeConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    markAsDelivered,
    markAsAcknowledged,
  } = useContextMode ? contextValue : standaloneHook;

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen, refresh]);

  // Update screen reader announcement when count changes
  useEffect(() => {
    if (unreadCountRef.current) {
      unreadCountRef.current.setAttribute('aria-label', `${unreadCount} unread notifications`);
    }
  }, [unreadCount]);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as acknowledged (also marks as read)
    if (markAsAcknowledged) {
      await markAsAcknowledged(notification.id);
    } else if (!notification.read) {
      const success = await markAsRead(notification.id);
      if (!success) {
        showError('Failed to mark notification as read');
        return;
      }
    }

    // Call parent handler
    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    // Close dropdown
    setIsOpen(false);
  }, [markAsRead, markAsAcknowledged, onNotificationClick]);

  const handleMarkAllAsRead = useCallback(async () => {
    const success = await markAllAsRead();
    if (success) {
      showSuccess('All notifications marked as read');
    } else {
      showError('Failed to mark all notifications as read');
    }
  }, [markAllAsRead]);

  const handleDeleteNotification = useCallback(async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const success = await deleteNotification(notificationId);
    if (!success) {
      showError('Failed to delete notification');
    }
  }, [deleteNotification]);

  // Use shared formatRelativeTime from dateUtils as formatTimestamp
  const formatTimestamp = formatRelativeTime;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '💬';
      case 'assignment':
        return '📋';
      case 'task_completed':
        return '✅';
      case 'comment_reply':
        return '💬';
      case 'task_updated':
        return '📝';
      case 'task_reassigned':
        return '🔄';
      case 'task_deadline_changed':
        return '📅';
      case 'task_due_soon':
        return '⏰';
      case 'task_overdue':
        return '🚨';
      case 'team_invitation':
        return '👥';
      case 'deal_won':
        return '🎉';
      case 'deal_lost':
        return '😢';
      case 'deal_stage_changed':
        return '📊';
      case 'crm_contact_added':
        return '👤';
      case 'document_shared':
        return '📄';
      case 'document_comment':
        return '💭';
      case 'workspace_role_changed':
        return '🔑';
      case 'achievement_unlocked':
        return '🏆';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Aria-live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" ref={unreadCountRef}>
        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'No unread notifications'}
      </div>
      
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {!realtimeConnected && (
          <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" title="Polling mode (realtime disconnected)" />
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="py-12 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm mb-1">
                              {notification.title}
                            </p>
                            <p 
                              className="text-sm text-gray-600 break-words line-clamp-2" 
                              title={notification.message.length > 100 ? notification.message : undefined}
                            >
                              {notification.message}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Delete notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(notification.createdAt)}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // TODO: Navigate to dedicated notifications page
                  // Example: window.location.href = '/notifications';
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
