import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Settings,
  MessageSquare,
  ListTodo,
  Briefcase,
  FileText,
  Users,
  Trophy,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type { NotificationType, Notification } from '../../lib/services/notificationService';

// ============================================
// TYPES
// ============================================

type NotificationCategory = 'all' | 'mentions' | 'tasks' | 'deals' | 'documents' | 'team' | 'achievements';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  onNavigate?: (entityType: string, entityId: string) => void;
}

// ============================================
// CATEGORY CONFIGURATION
// ============================================

const CATEGORIES: Array<{
  id: NotificationCategory;
  label: string;
  icon: React.ReactNode;
  types: NotificationType[];
}> = [
  {
    id: 'all',
    label: 'All',
    icon: <Bell className="w-4 h-4" />,
    types: [],
  },
  {
    id: 'mentions',
    label: 'Mentions',
    icon: <MessageSquare className="w-4 h-4" />,
    types: ['mention', 'comment_reply', 'comment_added', 'document_comment'],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: <ListTodo className="w-4 h-4" />,
    types: [
      'task_assigned',
      'task_reassigned',
      'assignment',
      'task_completed',
      'task_updated',
      'task_deadline_changed',
      'task_due_soon',
      'task_overdue',
      'subtask_completed',
    ],
  },
  {
    id: 'deals',
    label: 'Deals',
    icon: <Briefcase className="w-4 h-4" />,
    types: ['deal_won', 'deal_lost', 'deal_stage_changed'],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: <FileText className="w-4 h-4" />,
    types: ['document_shared', 'document_comment'],
  },
  {
    id: 'team',
    label: 'Team',
    icon: <Users className="w-4 h-4" />,
    types: ['team_invitation', 'workspace_role_changed', 'crm_contact_added'],
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: <Trophy className="w-4 h-4" />,
    types: ['achievement_unlocked'],
  },
];

// ============================================
// NOTIFICATION ICON MAPPING
// ============================================

const getNotificationIcon = (type: NotificationType): { icon: string; color: string } => {
  const iconMap: Record<string, { icon: string; color: string }> = {
    mention: { icon: '💬', color: 'bg-blue-100' },
    comment_reply: { icon: '↩️', color: 'bg-blue-100' },
    comment_added: { icon: '💭', color: 'bg-blue-100' },
    task_assigned: { icon: '📋', color: 'bg-purple-100' },
    task_reassigned: { icon: '🔄', color: 'bg-purple-100' },
    assignment: { icon: '📋', color: 'bg-purple-100' },
    task_completed: { icon: '✅', color: 'bg-green-100' },
    task_updated: { icon: '📝', color: 'bg-gray-100' },
    task_deadline_changed: { icon: '📅', color: 'bg-yellow-100' },
    task_due_soon: { icon: '⏰', color: 'bg-orange-100' },
    task_overdue: { icon: '🚨', color: 'bg-red-100' },
    subtask_completed: { icon: '✔️', color: 'bg-green-100' },
    deal_won: { icon: '🎉', color: 'bg-green-100' },
    deal_lost: { icon: '😢', color: 'bg-red-100' },
    deal_stage_changed: { icon: '📊', color: 'bg-blue-100' },
    document_shared: { icon: '📄', color: 'bg-indigo-100' },
    document_comment: { icon: '💬', color: 'bg-indigo-100' },
    team_invitation: { icon: '✉️', color: 'bg-teal-100' },
    workspace_role_changed: { icon: '🔑', color: 'bg-yellow-100' },
    crm_contact_added: { icon: '👤', color: 'bg-cyan-100' },
    achievement_unlocked: { icon: '🏆', color: 'bg-amber-100' },
  };
  return iconMap[type] || { icon: '🔔', color: 'bg-gray-100' };
};

// ============================================
// MAIN COMPONENT
// ============================================

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onNavigate,
}) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async (showRefreshing = false) => {
    if (!user || !workspace) return;

    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const transformedNotifications: Notification[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        workspaceId: row.workspace_id,
        type: row.type as NotificationType,
        title: row.title,
        message: row.message,
        entityType: row.entity_type,
        entityId: row.entity_id,
        read: row.read,
        createdAt: row.created_at,
        actionUrl: row.action_url,
        priority: row.priority,
        metadata: row.metadata,
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      logger.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, workspace]);

  // Setup real-time subscription
  useEffect(() => {
    if (!isOpen || !user || !workspace) return;

    loadNotifications();

    const subscription = supabase
      .channel('notification-center')
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
            const newNotification: Notification = {
              id: payload.new.id,
              userId: payload.new.user_id,
              workspaceId: payload.new.workspace_id,
              type: payload.new.type as NotificationType,
              title: payload.new.title,
              message: payload.new.message,
              entityType: payload.new.entity_type,
              entityId: payload.new.entity_id,
              read: payload.new.read,
              createdAt: payload.new.created_at,
            };
            setNotifications((prev) => [newNotification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id
                  ? { ...n, read: payload.new.read }
                  : n
              )
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
  }, [isOpen, user, workspace, loadNotifications]);

  // Mark notification as read
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

  // Mark all as read
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

  // Delete notification
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

  // Delete all read notifications
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

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (onNavigate && notification.entityType && notification.entityId) {
      onNavigate(notification.entityType, notification.entityId);
      onClose();
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    // Filter by read status
    if (showUnreadOnly && notification.read) return false;

    // Filter by category
    if (selectedCategory === 'all') return true;

    const category = CATEGORIES.find((c) => c.id === selectedCategory);
    if (!category) return true;

    return category.types.includes(notification.type);
  });

  // Calculate counts
  const unreadCount = notifications.filter((n) => !n.read).length;
  const categoryCounts = CATEGORIES.reduce((acc, category) => {
    if (category.id === 'all') {
      acc[category.id] = notifications.filter((n) => !n.read).length;
    } else {
      acc[category.id] = notifications.filter(
        (n) => !n.read && category.types.includes(n.type)
      ).length;
    }
    return acc;
  }, {} as Record<NotificationCategory, number>);

  // Format timestamp
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
      <div className="fixed top-0 right-0 h-full w-full sm:w-[550px] bg-white border-l-4 border-black shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Notification Center</h2>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-300">{unreadCount} unread notifications</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 hover:bg-white hover:text-black rounded transition-colors"
                aria-label="Notification settings"
                title="Notification settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              className="p-2 hover:bg-white hover:text-black rounded transition-colors disabled:opacity-50"
              aria-label="Refresh notifications"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:text-black rounded transition-colors"
              aria-label="Close notification center"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="border-b-2 border-black bg-gray-50 overflow-x-auto">
          <div className="flex">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  selectedCategory === category.id
                    ? 'border-black text-black bg-white'
                    : 'border-transparent text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
              >
                {category.icon}
                <span>{category.label}</span>
                {categoryCounts[category.id] > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {categoryCounts[category.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="font-medium">Unread only</span>
          </label>
          
          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-blue-500 text-white border-2 border-black hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
            <button
              onClick={deleteAllRead}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-red-500 text-white border-2 border-black hover:bg-red-600 transition-colors"
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
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse border-2 border-gray-200 rounded-lg p-3">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <Bell className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-2">No notifications</p>
              <p className="text-sm text-center">
                {showUnreadOnly
                  ? 'You have no unread notifications'
                  : selectedCategory !== 'all'
                  ? `No ${CATEGORIES.find((c) => c.id === selectedCategory)?.label.toLowerCase()} notifications`
                  : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const { icon, color } = getNotificationIcon(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}
                      >
                        <span className="text-xl">{icon}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(notification.createdAt)}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-xs text-red-600 hover:underline flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                            {notification.entityType && notification.entityId && (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;
