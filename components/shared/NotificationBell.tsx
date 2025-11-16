import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  type Notification,
} from '../../lib/services/notificationService';
import { showError, showSuccess } from '../../lib/utils/toast';
import * as Sentry from '@sentry/react';

interface NotificationBellProps {
  userId: string;
  workspaceId?: string;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  userId,
  workspaceId,
  onNotificationClick,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unreadCountRef = useRef<HTMLSpanElement>(null);

  // Load unread count with error handling
  const loadUnreadCount = useCallback(async () => {
    try {
      const { count, error } = await getUnreadCount(userId, workspaceId);
      if (error) throw new Error(error);
      
      const newCount = count || 0;
      setUnreadCount(prev => {
        // Announce to screen readers if count increased
        if (newCount > prev && unreadCountRef.current) {
          unreadCountRef.current.setAttribute('aria-label', `${newCount} unread notifications`);
        }
        return newCount;
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'NotificationBell', action: 'loadUnreadCount' },
        extra: { userId, workspaceId }
      });
      // Don't show error toast for background polling
    }
  }, [userId, workspaceId]);

  // Setup real-time subscription with fallback polling
  useEffect(() => {
    // Initial load
    loadUnreadCount();

    // Setup real-time subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}${workspaceId ? `,workspace_id=eq.${workspaceId}` : ''}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Increment unread count for new notifications
            loadUnreadCount();
            // If dropdown is open, refresh the list
            if (isOpen) {
              loadNotifications();
            }
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            // Refresh count and list if open
            loadUnreadCount();
            if (isOpen) {
              loadNotifications();
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          // Clear polling when realtime connects
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeConnected(false);
          // Fallback to polling if realtime fails
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(loadUnreadCount, 30000);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [userId, workspaceId, isOpen, loadUnreadCount]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { notifications: fetchedNotifications, error } = await getUserNotifications({
        userId,
        workspaceId,
        limit: 20,
      });
      if (error) throw new Error(error);
      setNotifications(fetchedNotifications);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'NotificationBell', action: 'loadNotifications' },
        extra: { userId, workspaceId }
      });
      showError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [userId, workspaceId]);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      // Optimistic update
      const prevNotifications = notifications;
      const prevUnreadCount = unreadCount;
      
      setNotifications(prev =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      try {
        const { success, error } = await markNotificationAsRead(notification.id, userId, workspaceId);
        if (!success || error) throw new Error(error || 'Failed to mark as read');
      } catch (error) {
        // Rollback on failure
        setNotifications(prevNotifications);
        setUnreadCount(prevUnreadCount);
        Sentry.captureException(error, {
          tags: { component: 'NotificationBell', action: 'markAsRead' },
          extra: { notificationId: notification.id, userId }
        });
        showError('Failed to mark notification as read');
        return; // Don't proceed if marking failed
      }
    }

    // Call parent handler
    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    // Close dropdown
    setIsOpen(false);
  }, [notifications, unreadCount, userId, workspaceId, onNotificationClick]);

  const handleMarkAllAsRead = useCallback(async () => {
    // Optimistic update
    const prevNotifications = notifications;
    const prevUnreadCount = unreadCount;
    
    setNotifications(prev => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const { success, error } = await markAllNotificationsAsRead(userId, workspaceId);
      if (!success || error) throw new Error(error || 'Failed to mark all as read');
      showSuccess('All notifications marked as read');
    } catch (error) {
      // Rollback on failure
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
      Sentry.captureException(error, {
        tags: { component: 'NotificationBell', action: 'markAllAsRead' },
        extra: { userId, workspaceId }
      });
      showError('Failed to mark all notifications as read');
    }
  }, [notifications, unreadCount, userId, workspaceId]);

  const handleDeleteNotification = useCallback(async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Optimistic update
    const prevNotifications = notifications;
    const prevUnreadCount = unreadCount;
    const deletedNotification = notifications.find((n) => n.id === notificationId);
    
    setNotifications(prev => prev.filter((n) => n.id !== notificationId));
    
    // Update unread count if deleted notification was unread
    if (deletedNotification && !deletedNotification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      const { success, error } = await deleteNotification(notificationId, userId, workspaceId);
      if (!success || error) throw new Error(error || 'Failed to delete');
    } catch (error) {
      // Rollback on failure
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
      Sentry.captureException(error, {
        tags: { component: 'NotificationBell', action: 'deleteNotification' },
        extra: { notificationId, userId }
      });
      showError('Failed to delete notification');
    }
  }, [notifications, unreadCount, userId, workspaceId]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

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
