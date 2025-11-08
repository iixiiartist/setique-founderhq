import { supabase } from '../supabase';

// Notification types
export type NotificationType = 
  | 'mention' 
  | 'assignment' 
  | 'task_completed' 
  | 'comment_reply'
  | 'task_updated'
  | 'team_invitation';

export type NotificationEntityType = 'task' | 'comment' | 'workspace' | 'document';

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
 * Create a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<{ notification: Notification | null; error: string | null }> {
  try {
    console.log('[NotificationService] Creating notification:', params);

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
      console.error('[NotificationService] Failed to create notification:', error);
      return { notification: null, error: error.message };
    }

    console.log('[NotificationService] Notification created successfully with ID:', data.id);

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

    console.log('[NotificationService] Created notification:', notification.id);
    return { notification, error: null };
  } catch (err) {
    console.error('[NotificationService] Unexpected error:', err);
    return { notification: null, error: 'Failed to create notification' };
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(params: GetNotificationsParams): Promise<{ notifications: Notification[]; error: string | null }> {
  try {
    const limit = params.limit || 50;

    console.log('[NotificationService] Fetching notifications for user:', params.userId);

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
      console.error('[NotificationService] Failed to fetch notifications:', error);
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

    console.log('[NotificationService] Loaded notifications:', notifications.length);
    return { notifications, error: null };
  } catch (err) {
    console.error('[NotificationService] Unexpected error:', err);
    return { notifications: [], error: 'Failed to fetch notifications' };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('[NotificationService] Marking notification as read:', notificationId);

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationService] Failed to mark as read:', error);
      return { success: false, error: error.message };
    }

    console.log('[NotificationService] Marked as read:', notificationId);
    return { success: true, error: null };
  } catch (err) {
    console.error('[NotificationService] Unexpected error:', err);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string, workspaceId?: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('[NotificationService] Marking all notifications as read for user:', userId);

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
      console.error('[NotificationService] Failed to mark all as read:', error);
      return { success: false, error: error.message };
    }

    console.log('[NotificationService] Marked all as read for user:', userId);
    return { success: true, error: null };
  } catch (err) {
    console.error('[NotificationService] Unexpected error:', err);
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
      console.error('[NotificationService] Failed to get unread count:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (err) {
    console.error('[NotificationService] Unexpected error:', err);
    return { count: 0, error: 'Failed to get unread count' };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('[NotificationService] Deleting notification:', notificationId);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationService] Failed to delete notification:', error);
      return { success: false, error: error.message };
    }

    console.log('[NotificationService] Deleted notification:', notificationId);
    return { success: true, error: null };
  } catch (err) {
    console.error('[NotificationService] Unexpected error:', err);
    return { success: false, error: 'Failed to delete notification' };
  }
}
