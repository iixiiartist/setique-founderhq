// hooks/useNotifications.ts
// Unified notification hook - single source of truth for all notification state
// Consolidates NotificationBell, NotificationCenter, and other consumers

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { shouldNotifyUser } from '../lib/services/notificationPreferencesService';
import type { Notification, NotificationType, NotificationEntityType } from '../lib/services/notificationService';
import * as Sentry from '@sentry/react';

// ============================================
// TYPES
// ============================================

export interface UseNotificationsOptions {
  userId: string;
  workspaceId?: string;
  /** Max notifications to fetch (default 50) */
  limit?: number;
  /** Enable real-time updates (default true) */
  realtime?: boolean;
  /** Fallback polling interval in ms when realtime fails (default 30000) */
  pollingInterval?: number;
  /** Whether to respect user's notification preferences when displaying (default true) */
  respectPreferences?: boolean;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  category?: NotificationCategory;
  types?: NotificationType[];
}

export type NotificationCategory = 'all' | 'mentions' | 'tasks' | 'deals' | 'documents' | 'team' | 'achievements';

export interface UseNotificationsResult {
  // State
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  realtimeConnected: boolean;
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  deleteAllRead: () => Promise<boolean>;
  
  // Filtering
  setFilters: (filters: NotificationFilters) => void;
  filters: NotificationFilters;
  filteredNotifications: Notification[];
  
  // Utilities
  getCategoryCount: (category: NotificationCategory) => number;
}

// ============================================
// CATEGORY TYPE MAPPING
// ============================================

export const CATEGORY_TYPES: Record<NotificationCategory, NotificationType[]> = {
  all: [],
  mentions: ['mention', 'comment_reply', 'comment_added', 'document_comment'],
  tasks: [
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
  deals: ['deal_won', 'deal_lost', 'deal_stage_changed'],
  documents: ['document_shared', 'document_comment'],
  team: ['team_invitation', 'workspace_role_changed', 'crm_contact_added'],
  achievements: ['achievement_unlocked'],
};

// Map notification type to preference check type
const TYPE_TO_PREFERENCE_TYPE: Record<NotificationType, string> = {
  mention: 'mention',
  comment_reply: 'comment',
  comment_added: 'comment',
  document_comment: 'comment',
  task_assigned: 'task_assignment',
  task_reassigned: 'task_assignment',
  assignment: 'task_assignment',
  task_completed: 'task_update',
  task_updated: 'task_update',
  task_deadline_changed: 'task_update',
  task_due_soon: 'task_due_soon',
  task_overdue: 'task_overdue',
  subtask_completed: 'task_update',
  deal_won: 'deal_won',
  deal_lost: 'deal_lost',
  deal_stage_changed: 'deal_update',
  document_shared: 'document_share',
  team_invitation: 'team_update',
  workspace_role_changed: 'team_update',
  crm_contact_added: 'team_update',
  achievement_unlocked: 'achievement',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

interface NotificationRow {
  id: string;
  user_id: string;
  workspace_id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}

function transformRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    entityType: row.entity_type as NotificationEntityType | undefined,
    entityId: row.entity_id,
    read: row.read,
    createdAt: row.created_at,
  };
}

// ============================================
// MAIN HOOK
// ============================================

export function useNotifications(options: UseNotificationsOptions): UseNotificationsResult {
  const {
    userId,
    workspaceId,
    limit = 50,
    realtime = true,
    pollingInterval = 30000,
    respectPreferences = true,
  } = options;

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({});

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const preferenceCache = useRef<Map<string, boolean>>(new Map());

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchNotifications = useCallback(async (showRefreshing = false) => {
    if (!userId) return;

    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const transformedNotifications = (data || []).map(transformRow);
      
      // Filter based on preferences if enabled
      let finalNotifications = transformedNotifications;
      if (respectPreferences && workspaceId) {
        finalNotifications = await filterByPreferences(transformedNotifications, userId, workspaceId);
      }

      setNotifications(finalNotifications);
      setUnreadCount(finalNotifications.filter(n => !n.read).length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(message);
      logger.error('[useNotifications] Fetch error:', err);
      Sentry.captureException(err, {
        tags: { hook: 'useNotifications', action: 'fetch' },
        extra: { userId, workspaceId },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, workspaceId, limit, respectPreferences]);

  // Filter notifications by user preferences
  const filterByPreferences = async (
    notifs: Notification[],
    uid: string,
    wsId: string
  ): Promise<Notification[]> => {
    const results: Notification[] = [];
    
    for (const notif of notifs) {
      const cacheKey = `${uid}-${wsId}-${notif.type}`;
      
      // Check cache first
      if (preferenceCache.current.has(cacheKey)) {
        if (preferenceCache.current.get(cacheKey)) {
          results.push(notif);
        }
        continue;
      }
      
      // Check preference
      const prefType = TYPE_TO_PREFERENCE_TYPE[notif.type] || notif.type;
      const shouldShow = await shouldNotifyUser(uid, wsId, prefType, 'in_app');
      
      // Cache result for 5 minutes (cleared on unmount)
      preferenceCache.current.set(cacheKey, shouldShow);
      
      if (shouldShow) {
        results.push(notif);
      }
    }
    
    return results;
  };

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { count, error: countError } = await query;

      if (!countError) {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      logger.error('[useNotifications] Count error:', err);
    }
  }, [userId, workspaceId]);

  // ============================================
  // REAL-TIME SUBSCRIPTION
  // ============================================

  useEffect(() => {
    if (!userId || !realtime) return;

    const setupRealtime = () => {
      // Build filter - include workspace if provided
      const filterParts = [`user_id=eq.${userId}`];
      if (workspaceId) {
        filterParts.push(`workspace_id=eq.${workspaceId}`);
      }

      const channel = supabase
        .channel(`notifications:${userId}:${workspaceId || 'global'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: filterParts.join(','),
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newNotification = transformRow(payload.new as NotificationRow);
              
              // Check preferences before adding
              if (respectPreferences && workspaceId) {
                const prefType = TYPE_TO_PREFERENCE_TYPE[newNotification.type] || newNotification.type;
                const shouldShow = await shouldNotifyUser(userId, workspaceId, prefType, 'in_app');
                if (!shouldShow) return;
              }
              
              setNotifications(prev => [newNotification, ...prev.slice(0, limit - 1)]);
              if (!newNotification.read) {
                setUnreadCount(prev => prev + 1);
              }
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev =>
                prev.map(n =>
                  n.id === payload.new.id
                    ? { ...n, read: (payload.new as NotificationRow).read }
                    : n
                )
              );
              // Recalculate unread count
              fetchUnreadCount();
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as { id: string }).id;
              setNotifications(prev => prev.filter(n => n.id !== deletedId));
              fetchUnreadCount();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeConnected(true);
            // Clear polling if realtime connects
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeConnected(false);
            // Start polling as fallback
            if (!pollingRef.current) {
              pollingRef.current = setInterval(() => {
                fetchNotifications(true);
              }, pollingInterval);
            }
          }
        });

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      // Clear preference cache
      preferenceCache.current.clear();
    };
  }, [userId, workspaceId, realtime, pollingInterval, limit, respectPreferences, fetchNotifications, fetchUnreadCount]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ============================================
  // ACTIONS
  // ============================================

  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId); // Tenant safety

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { error: updateError } = await query;

      if (updateError) {
        throw updateError;
      }

      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      return true;
    } catch (err) {
      logger.error('[useNotifications] Mark as read error:', err);
      return false;
    }
  }, [userId, workspaceId]);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      let query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { error: updateError } = await query;

      if (updateError) {
        throw updateError;
      }

      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      return true;
    } catch (err) {
      logger.error('[useNotifications] Mark all as read error:', err);
      return false;
    }
  }, [userId, workspaceId]);

  const deleteNotificationFn = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId); // Tenant safety

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { error: deleteError } = await query;

      if (deleteError) {
        throw deleteError;
      }

      // Optimistic update
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      return true;
    } catch (err) {
      logger.error('[useNotifications] Delete error:', err);
      return false;
    }
  }, [userId, workspaceId, notifications]);

  const deleteAllRead = useCallback(async (): Promise<boolean> => {
    try {
      let query = supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { error: deleteError } = await query;

      if (deleteError) {
        throw deleteError;
      }

      // Optimistic update
      setNotifications(prev => prev.filter(n => !n.read));

      return true;
    } catch (err) {
      logger.error('[useNotifications] Delete all read error:', err);
      return false;
    }
  }, [userId, workspaceId]);

  const refresh = useCallback(async () => {
    await fetchNotifications(true);
  }, [fetchNotifications]);

  // ============================================
  // FILTERING
  // ============================================

  const filteredNotifications = useMemo(() => {
    let result = notifications;

    // Filter by unread
    if (filters.unreadOnly) {
      result = result.filter(n => !n.read);
    }

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      const categoryTypes = CATEGORY_TYPES[filters.category];
      result = result.filter(n => categoryTypes.includes(n.type));
    }

    // Filter by specific types
    if (filters.types && filters.types.length > 0) {
      result = result.filter(n => filters.types!.includes(n.type));
    }

    return result;
  }, [notifications, filters]);

  const getCategoryCount = useCallback((category: NotificationCategory): number => {
    if (category === 'all') {
      return notifications.filter(n => !n.read).length;
    }
    const categoryTypes = CATEGORY_TYPES[category];
    return notifications.filter(n => !n.read && categoryTypes.includes(n.type)).length;
  }, [notifications]);

  // ============================================
  // RETURN
  // ============================================

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    realtimeConnected,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationFn,
    deleteAllRead,
    setFilters,
    filters,
    filteredNotifications,
    getCategoryCount,
  };
}

export default useNotifications;
