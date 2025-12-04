import { supabase } from '../supabase';
import { logger } from '../logger';
import { shouldNotifyUser } from './notificationPreferencesService';

// Notification types
export type NotificationType = 
  | 'mention' 
  | 'assignment' 
  | 'task_completed' 
  | 'comment_reply'
  | 'task_updated'
  | 'task_reassigned'
  | 'task_deadline_changed'
  | 'task_due_soon'
  | 'task_overdue'
  | 'team_invitation'
  | 'deal_won'
  | 'deal_lost'
  | 'deal_stage_changed'
  | 'crm_contact_added'
  | 'document_shared'
  | 'document_comment'
  | 'workspace_role_changed'
  | 'achievement_unlocked'
  | 'task_assigned'
  | 'comment_added'
  | 'subtask_completed'
  // Agent/background job notifications
  | 'agent_job_completed'
  | 'agent_job_failed'
  | 'market_brief_ready'
  | 'sync_completed'
  | 'sync_failed';

export type NotificationEntityType = 'task' | 'comment' | 'workspace' | 'document' | 'deal' | 'contact' | 'achievement';

export interface Notification {
  id: string;
  userId: string;
  workspaceId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

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
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

interface CreateNotificationParams {
  userId: string;
  workspaceId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  /** Priority level - urgent bypasses quiet hours (default: 'normal') */
  priority?: NotificationPriority;
  /** Skip preference check - use for system-critical notifications */
  bypassPreferences?: boolean;
  /** Direct URL for navigation when notification is clicked */
  actionUrl?: string;
  /** Additional metadata for the notification */
  metadata?: Record<string, unknown>;
}

interface GetNotificationsParams {
  userId: string;
  workspaceId?: string;
  limit?: number;
  unreadOnly?: boolean;
}

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
  // Agent/background job mappings
  agent_job_completed: 'agent_updates',
  agent_job_failed: 'agent_updates',
  market_brief_ready: 'agent_updates',
  sync_completed: 'agent_updates',
  sync_failed: 'agent_updates',
};

/**
 * Check if a notification should be created based on user preferences
 */
async function checkNotificationPreference(
  userId: string,
  workspaceId: string,
  type: NotificationType
): Promise<boolean> {
  try {
    const prefType = TYPE_TO_PREFERENCE_TYPE[type] || type;
    return await shouldNotifyUser(userId, workspaceId, prefType, 'in_app');
  } catch (err) {
    // Default to true on error - better to over-notify than miss important notifications
    logger.warn('[NotificationService] Preference check failed, defaulting to true:', err);
    return true;
  }
}

/**
 * Create multiple notifications in batch (e.g., for mentions)
 * Respects user notification preferences unless bypassPreferences is true
 */
export async function createNotificationsBatch(
  notifications: CreateNotificationParams[]
): Promise<{ success: boolean; created: number; skipped: number; error: string | null }> {
  try {
    if (notifications.length === 0) {
      return { success: true, created: 0, skipped: 0, error: null };
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`[NotificationService] Creating ${notifications.length} notifications in batch`);
    }

    // Filter notifications based on preferences
    const filteredNotifications: CreateNotificationParams[] = [];
    let skippedCount = 0;
    
    for (const notif of notifications) {
      if (notif.bypassPreferences) {
        filteredNotifications.push(notif);
        continue;
      }
      
      const shouldCreate = await checkNotificationPreference(
        notif.userId,
        notif.workspaceId,
        notif.type
      );
      
      if (shouldCreate) {
        filteredNotifications.push(notif);
      } else {
        skippedCount++;
        if (process.env.NODE_ENV !== 'production') {
          logger.debug(`[NotificationService] Skipped notification for user ${notif.userId} - preferences disabled for ${notif.type}`);
        }
      }
    }

    if (filteredNotifications.length === 0) {
      return { success: true, created: 0, skipped: skippedCount, error: null };
    }

    const rows = filteredNotifications.map(params => ({
      user_id: params.userId,
      workspace_id: params.workspaceId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity_type: params.entityType,
      entity_id: params.entityId,
      priority: params.priority || 'normal',
      action_url: params.actionUrl || null,
      metadata: params.metadata || {},
      delivery_status: 'created',
      read: false,
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(rows)
      .select();

    if (error) {
      logger.error('[NotificationService] Batch creation failed:', error);
      return { success: false, created: 0, skipped: skippedCount, error: error.message };
    }

    return { success: true, created: data?.length || 0, skipped: skippedCount, error: null };
  } catch (err) {
    logger.error('[NotificationService] Batch creation unexpected error:', err);
    return { success: false, created: 0, skipped: 0, error: 'Failed to create notifications' };
  }
}

/**
 * Create a new notification for a user
 * Respects user notification preferences unless bypassPreferences is true
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ notification: Notification | null; error: string | null; skipped?: boolean }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[NotificationService] Creating notification:', params);
    }

    // Check user preferences before creating
    if (!params.bypassPreferences) {
      const shouldCreate = await checkNotificationPreference(
        params.userId,
        params.workspaceId,
        params.type
      );
      
      if (!shouldCreate) {
        if (process.env.NODE_ENV !== 'production') {
          logger.debug(`[NotificationService] Skipped notification - user preferences disabled for ${params.type}`);
        }
        return { notification: null, error: null, skipped: true };
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        workspace_id: params.workspaceId,
        type: params.type,
        title: params.title,
        message: params.message,
        entity_type: params.entityType,
        entity_id: params.entityId,
        priority: params.priority || 'normal',
        action_url: params.actionUrl || null,
        metadata: params.metadata || {},
        delivery_status: 'created',
        read: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('[NotificationService] Failed to create notification:', error);
      return { notification: null, error: error.message };
    }

    // Return the actual notification with real UUID and timestamps from database
    const notification: Notification = {
      id: data.id,
      userId: data.user_id,
      workspaceId: data.workspace_id,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entity_type,
      entityId: data.entity_id,
      read: data.read,
      createdAt: data.created_at,
    };

    return { notification, error: null };
  } catch (err) {
    logger.error('[NotificationService] Unexpected error:', err);
    return { notification: null, error: 'Failed to create notification' };
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(params: GetNotificationsParams): Promise<{ notifications: Notification[]; error: string | null }> {
  try {
    const limit = params.limit || 50;

    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[NotificationService] Fetching notifications for user:', params.userId);
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (params.workspaceId) {
      query = query.eq('workspace_id', params.workspaceId);
    }

    if (params.unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[NotificationService] Failed to fetch notifications:', error);
      return { notifications: [], error: error.message };
    }

    const notifications: Notification[] = (data as NotificationRow[]).map((row) => ({
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
    }));

    return { notifications, error: null };
  } catch (err) {
    logger.error('[NotificationService] Unexpected error:', err);
    return { notifications: [], error: 'Failed to fetch notifications' };
  }
}

/**
 * Mark a notification as read with tenant safety
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
  workspaceId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[NotificationService] Marking notification as read:', notificationId);
    }

    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId); // Tenant safety: ensure user owns this notification

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { error, count } = await query;

    if (error) {
      logger.error('[NotificationService] Failed to mark as read:', error);
      return { success: false, error: error.message };
    }

    if (count === 0) {
      logger.warn('[NotificationService] No notification found to mark as read:', notificationId);
      return { success: false, error: 'Notification not found or access denied' };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('[NotificationService] Unexpected error:', err);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string, workspaceId?: string): Promise<{ success: boolean; error: string | null }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[NotificationService] Marking all notifications as read for user:', userId);
    }

    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { error } = await query;

    if (error) {
      logger.error('[NotificationService] Failed to mark all as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('[NotificationService] Unexpected error:', err);
    return { success: false, error: 'Failed to mark all notifications as read' };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string, workspaceId?: string): Promise<{ count: number; error: string | null }> {
  try {
    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { count, error } = await query;

    if (error) {
      logger.error('[NotificationService] Failed to get unread count:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (err) {
    logger.error('[NotificationService] Unexpected error:', err);
    return { count: 0, error: 'Failed to get unread count' };
  }
}

/**
 * Delete a notification with tenant safety
 */
export async function deleteNotification(
  notificationId: string,
  userId: string,
  workspaceId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[NotificationService] Deleting notification:', notificationId);
    }

    let query = supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId); // Tenant safety: ensure user owns this notification

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { error, count } = await query;

    if (error) {
      logger.error('[NotificationService] Failed to delete notification:', error);
      return { success: false, error: error.message };
    }

    if (count === 0) {
      logger.warn('[NotificationService] No notification found to delete:', notificationId);
      return { success: false, error: 'Notification not found or access denied' };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('[NotificationService] Unexpected error:', err);
    return { success: false, error: 'Failed to delete notification' };
  }
}

// ============================================================================
// PRODUCTION-SCALE: Paginated and Optimized Methods
// ============================================================================

export interface PaginatedNotificationParams {
  workspaceId: string;
  pageSize?: number;
  cursor?: string;
  includeRead?: boolean;
  categoryFilter?: NotificationType[];
}

export interface PaginatedNotificationsResult {
  notifications: Notification[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
  error: string | null;
}

/**
 * Get paginated notifications using optimized RPC
 * Uses cursor-based pagination for consistent performance at scale
 */
export async function getPaginatedNotifications(
  params: PaginatedNotificationParams
): Promise<PaginatedNotificationsResult> {
  try {
    const pageSize = params.pageSize || 20;

    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[NotificationService] Fetching paginated notifications:', params);
    }

    // Try using the optimized RPC first (from production migration)
    const { data, error } = await supabase.rpc('get_paginated_notifications', {
      p_workspace_id: params.workspaceId,
      p_page_size: pageSize,
      p_cursor: params.cursor || null,
      p_include_read: params.includeRead ?? true,
    });

    if (error) {
      // If RPC doesn't exist yet, fall back to regular query
      if (error.code === 'PGRST301' || error.message.includes('function') || error.code === '42883') {
        logger.warn('[NotificationService] RPC not available, falling back to standard query');
        return await getFallbackNotifications(params);
      }
      logger.error('[NotificationService] Paginated fetch failed:', error);
      return { notifications: [], nextCursor: null, hasMore: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { notifications: [], nextCursor: null, hasMore: false, error: null };
    }

    // Filter by category if specified
    let filtered = data;
    if (params.categoryFilter && params.categoryFilter.length > 0) {
      filtered = data.filter((row: NotificationRow) => 
        params.categoryFilter!.includes(row.type as NotificationType)
      );
    }

    const notifications: Notification[] = filtered.map((row: NotificationRow) => ({
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
    }));

    // Determine if there are more results
    const hasMore = data.length === pageSize;
    const lastNotification = data.length > 0 ? data[data.length - 1] : null;
    const nextCursor = hasMore && lastNotification ? lastNotification.created_at : null;

    return {
      notifications,
      nextCursor,
      hasMore,
      error: null,
    };
  } catch (err) {
    logger.error('[NotificationService] Paginated fetch unexpected error:', err);
    return { notifications: [], nextCursor: null, hasMore: false, error: 'Failed to fetch notifications' };
  }
}

/**
 * Fallback method using standard query when RPC isn't available
 */
async function getFallbackNotifications(
  params: PaginatedNotificationParams
): Promise<PaginatedNotificationsResult> {
  const pageSize = params.pageSize || 20;

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (!params.includeRead) {
    query = query.eq('read', false);
  }

  if (params.cursor) {
    query = query.lt('created_at', params.cursor);
  }

  if (params.categoryFilter && params.categoryFilter.length > 0) {
    query = query.in('type', params.categoryFilter);
  }

  const { data, error } = await query;

  if (error) {
    return { notifications: [], nextCursor: null, hasMore: false, error: error.message };
  }

  const notifications: Notification[] = (data as NotificationRow[]).map((row) => ({
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
  }));

  const hasMore = data.length === pageSize;
  const lastNotification = data.length > 0 ? data[data.length - 1] : null;
  const nextCursor = hasMore && lastNotification ? lastNotification.created_at : null;

  return { notifications, nextCursor, hasMore, error: null };
}

/**
 * Create a workspace-wide notification using server-side RPC
 * This is more efficient for large workspaces as it handles fan-out server-side
 */
export async function createWorkspaceNotification(params: {
  workspaceId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  excludeUserIds?: string[];
}): Promise<{ success: boolean; created: number; error: string | null }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[NotificationService] Creating workspace notification:', params);
    }

    // Try using the server-side RPC for efficient fan-out
    const { data, error } = await supabase.rpc('create_workspace_notification', {
      p_workspace_id: params.workspaceId,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_entity_type: params.entityType || null,
      p_entity_id: params.entityId || null,
      p_priority: params.priority || 'normal',
      p_action_url: params.actionUrl || null,
      p_metadata: params.metadata || {},
      p_exclude_user_ids: params.excludeUserIds || [],
    });

    if (error) {
      // If RPC doesn't exist, fall back to client-side creation
      if (error.code === 'PGRST301' || error.message.includes('function') || error.code === '42883') {
        logger.warn('[NotificationService] create_workspace_notification RPC not available, using fallback');
        return await createWorkspaceNotificationFallback(params);
      }
      logger.error('[NotificationService] Workspace notification creation failed:', error);
      return { success: false, created: 0, error: error.message };
    }

    return { success: true, created: data || 0, error: null };
  } catch (err) {
    logger.error('[NotificationService] Workspace notification unexpected error:', err);
    return { success: false, created: 0, error: 'Failed to create workspace notification' };
  }
}

/**
 * Fallback for workspace notifications when RPC isn't available
 */
async function createWorkspaceNotificationFallback(params: {
  workspaceId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  excludeUserIds?: string[];
}): Promise<{ success: boolean; created: number; error: string | null }> {
  // Get all workspace members
  const { data: members, error: membersError } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', params.workspaceId);

  if (membersError) {
    return { success: false, created: 0, error: membersError.message };
  }

  const excludeSet = new Set(params.excludeUserIds || []);
  const targetUserIds = (members || [])
    .map((m: { user_id: string }) => m.user_id)
    .filter((id: string) => !excludeSet.has(id));

  if (targetUserIds.length === 0) {
    return { success: true, created: 0, error: null };
  }

  // Create notifications in batch
  const notifications = targetUserIds.map((userId: string) => ({
    userId,
    workspaceId: params.workspaceId,
    type: params.type,
    title: params.title,
    message: params.message,
    entityType: params.entityType,
    entityId: params.entityId,
    priority: params.priority,
    actionUrl: params.actionUrl,
    metadata: params.metadata,
  }));

  const result = await createNotificationsBatch(notifications);
  return { success: result.success, created: result.created, error: result.error };
}
