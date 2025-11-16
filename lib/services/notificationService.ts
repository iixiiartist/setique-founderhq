import { supabase } from '../supabase';
import { logger } from '../logger'

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
  | 'achievement_unlocked';

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
  entity_id?: string;
  read: boolean;
  created_at: string;
}

interface CreateNotificationParams {
  userId: string;
  workspaceId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
}

interface GetNotificationsParams {
  userId: string;
  workspaceId?: string;
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Create multiple notifications in batch (e.g., for mentions)
 */
export async function createNotificationsBatch(notifications: CreateNotificationParams[]): Promise<{ success: boolean; created: number; error: string | null }> {
  try {
    if (notifications.length === 0) {
      return { success: true, created: 0, error: null };
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`[NotificationService] Creating ${notifications.length} notifications in batch`);
    }

    const rows = notifications.map(params => ({
      user_id: params.userId,
      workspace_id: params.workspaceId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity_type: params.entityType,
      entity_id: params.entityId,
      read: false,
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(rows)
      .select();

    if (error) {
      logger.error('[NotificationService] Batch creation failed:', error);
      return { success: false, created: 0, error: error.message };
    }

    return { success: true, created: data?.length || 0, error: null };
  } catch (err) {
    logger.error('[NotificationService] Batch creation unexpected error:', err);
    return { success: false, created: 0, error: 'Failed to create notifications' };
  }
}

/**
 * Create a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<{ notification: Notification | null; error: string | null }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[NotificationService] Creating notification:', params);
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
