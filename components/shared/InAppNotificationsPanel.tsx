import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, Filter, CheckCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type { NotificationType } from '../../lib/services/notificationService';

interface Notification {
  id: string;
  user_id: string;
  workspace_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  read: boolean;
  created_at: string;
}

interface InAppNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InAppNotificationsPanel: React.FC<InAppNotificationsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen && user && workspace) {
      loadNotifications();
      
      // Set up real-time subscription
      const subscription = supabase
        .channel('notifications-panel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications((prev) => [payload.new as Notification, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setNotifications((prev) =>
                prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOpen, user, workspace]);

  const loadNotifications = async () => {
    if (!user || !workspace) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      logger.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !workspace) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('workspace_id', workspace.id)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to delete notification:', error);
    }
  };

  const deleteAllRead = async () => {
    if (!user || !workspace) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('workspace_id', workspace.id)
        .eq('read', true);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to delete read notifications:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case 'task_assigned':
      case 'task_reassigned':
        return '📋';
      case 'task_deadline_changed':
        return '📅';
      case 'task_due_soon':
        return '⏰';
      case 'task_overdue':
        return '🚨';
      case 'task_completed':
        return '✅';
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
      case 'comment_added':
        return '💬';
      case 'subtask_completed':
        return '✔️';
      default:
        return '🔔';
    }
  };

  const getCategoryFromType = (type: NotificationType): string => {
    if (type.startsWith('task_')) return 'tasks';
    if (type.startsWith('deal_')) return 'deals';
    if (type.startsWith('crm_')) return 'crm';
    if (type.startsWith('document_')) return 'documents';
    if (type.startsWith('workspace_')) return 'workspace';
    return 'other';
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filterType === 'unread' && notification.read) return false;
    if (categoryFilter !== 'all' && getCategoryFromType(notification.type) !== categoryFilter)
      return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white border-l-4 border-black shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between border-b-4 border-black">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-300">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:text-black rounded transition-colors"
            aria-label="Close notifications panel"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters & Actions */}
        <div className="p-4 border-b-2 border-black bg-gray-50">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-sm font-semibold border-2 border-black transition-all ${
                filterType === 'all'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1 text-sm font-semibold border-2 border-black transition-all ${
                filterType === 'unread'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 text-sm font-semibold border-2 border-black bg-white"
            >
              <option value="all">All Categories</option>
              <option value="tasks">Tasks</option>
              <option value="deals">Deals</option>
              <option value="crm">CRM</option>
              <option value="documents">Documents</option>
              <option value="workspace">Workspace</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-blue-500 text-white border-2 border-black hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
            <button
              onClick={deleteAllRead}
              className="flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-red-500 text-white border-2 border-black hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Read
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse border-2 border-black p-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <Bell className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-2">No notifications</p>
              <p className="text-sm text-center">
                {filterType === 'unread'
                  ? 'You have no unread notifications'
                  : categoryFilter !== 'all'
                  ? `No ${categoryFilter} notifications`
                  : 'You\'re all caught up!'}
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-black">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.created_at)}
                        </span>
                        <div className="flex gap-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-red-600 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                            </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InAppNotificationsPanel;
