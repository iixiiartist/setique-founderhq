import { supabase } from '../supabase';
import { logger } from '../logger';

// ============================================
// TYPES
// ============================================

export interface NotificationPreferences {
  id: string;
  userId: string;
  workspaceId?: string;
  
  // In-app settings
  inAppEnabled: boolean;
  
  // Email settings
  emailEnabled: boolean;
  emailFrequency: 'instant' | 'daily' | 'weekly' | 'never';
  emailDigestTime: string;
  emailDigestDay: number;
  
  // Notification categories
  notifyMentions: boolean;
  notifyComments: boolean;
  notifyTaskAssignments: boolean;
  notifyTaskUpdates: boolean;
  notifyTaskDueSoon: boolean;
  notifyTaskOverdue: boolean;
  notifyDealUpdates: boolean;
  notifyDealWon: boolean;
  notifyDealLost: boolean;
  notifyDocumentShares: boolean;
  notifyTeamUpdates: boolean;
  notifyAchievements: boolean;
  
  // Agent/background job notifications
  notifyAgentUpdates: boolean;
  notifyMarketBriefs: boolean;
  notifySyncUpdates: boolean;
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  createdAt: string;
  updatedAt: string;
}

interface NotificationPreferencesRow {
  id: string;
  user_id: string;
  workspace_id?: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  email_frequency: string;
  email_digest_time: string;
  email_digest_day: number;
  notify_mentions: boolean;
  notify_comments: boolean;
  notify_task_assignments: boolean;
  notify_task_updates: boolean;
  notify_task_due_soon: boolean;
  notify_task_overdue: boolean;
  notify_deal_updates: boolean;
  notify_deal_won: boolean;
  notify_deal_lost: boolean;
  notify_document_shares: boolean;
  notify_team_updates: boolean;
  notify_achievements: boolean;
  notify_agent_updates?: boolean;
  notify_market_briefs?: boolean;
  notify_sync_updates?: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

// Default preferences
export const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'id' | 'userId' | 'workspaceId' | 'createdAt' | 'updatedAt'> = {
  inAppEnabled: true,
  emailEnabled: true,
  emailFrequency: 'instant',
  emailDigestTime: '09:00:00',
  emailDigestDay: 1,
  notifyMentions: true,
  notifyComments: true,
  notifyTaskAssignments: true,
  notifyTaskUpdates: true,
  notifyTaskDueSoon: true,
  notifyTaskOverdue: true,
  notifyDealUpdates: true,
  notifyDealWon: true,
  notifyDealLost: true,
  notifyDocumentShares: true,
  notifyTeamUpdates: true,
  notifyAchievements: true,
  notifyAgentUpdates: true,
  notifyMarketBriefs: true,
  notifySyncUpdates: false, // Off by default - can be noisy
  quietHoursEnabled: false,
  quietHoursStart: '22:00:00',
  quietHoursEnd: '08:00:00',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function transformRow(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    inAppEnabled: row.in_app_enabled,
    emailEnabled: row.email_enabled,
    emailFrequency: row.email_frequency as NotificationPreferences['emailFrequency'],
    emailDigestTime: row.email_digest_time,
    emailDigestDay: row.email_digest_day,
    notifyMentions: row.notify_mentions,
    notifyComments: row.notify_comments,
    notifyTaskAssignments: row.notify_task_assignments,
    notifyTaskUpdates: row.notify_task_updates,
    notifyTaskDueSoon: row.notify_task_due_soon,
    notifyTaskOverdue: row.notify_task_overdue,
    notifyDealUpdates: row.notify_deal_updates,
    notifyDealWon: row.notify_deal_won,
    notifyDealLost: row.notify_deal_lost,
    notifyDocumentShares: row.notify_document_shares,
    notifyTeamUpdates: row.notify_team_updates,
    notifyAchievements: row.notify_achievements,
    notifyAgentUpdates: row.notify_agent_updates ?? true,
    notifyMarketBriefs: row.notify_market_briefs ?? true,
    notifySyncUpdates: row.notify_sync_updates ?? false,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get notification preferences for a user
 * Creates default preferences if none exist
 */
export async function getNotificationPreferences(
  userId: string,
  workspaceId?: string
): Promise<{ preferences: NotificationPreferences | null; error: string | null }> {
  try {
    // First try to get existing preferences
    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    } else {
      query = query.is('workspace_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logger.error('[NotificationPreferences] Error fetching preferences:', error);
      return { preferences: null, error: error.message };
    }

    // If no preferences exist, create default ones
    if (!data) {
      const { preferences, error: createError } = await createNotificationPreferences(userId, workspaceId);
      return { preferences, error: createError };
    }

    return { preferences: transformRow(data as NotificationPreferencesRow), error: null };
  } catch (err) {
    logger.error('[NotificationPreferences] Unexpected error:', err);
    return { preferences: null, error: 'Failed to get notification preferences' };
  }
}

/**
 * Create default notification preferences for a user
 */
export async function createNotificationPreferences(
  userId: string,
  workspaceId?: string
): Promise<{ preferences: NotificationPreferences | null; error: string | null }> {
  try {
    const insertData: any = {
      user_id: userId,
      workspace_id: workspaceId || null,
      in_app_enabled: DEFAULT_PREFERENCES.inAppEnabled,
      email_enabled: DEFAULT_PREFERENCES.emailEnabled,
      email_frequency: DEFAULT_PREFERENCES.emailFrequency,
      email_digest_time: DEFAULT_PREFERENCES.emailDigestTime,
      email_digest_day: DEFAULT_PREFERENCES.emailDigestDay,
      notify_mentions: DEFAULT_PREFERENCES.notifyMentions,
      notify_comments: DEFAULT_PREFERENCES.notifyComments,
      notify_task_assignments: DEFAULT_PREFERENCES.notifyTaskAssignments,
      notify_task_updates: DEFAULT_PREFERENCES.notifyTaskUpdates,
      notify_task_due_soon: DEFAULT_PREFERENCES.notifyTaskDueSoon,
      notify_task_overdue: DEFAULT_PREFERENCES.notifyTaskOverdue,
      notify_deal_updates: DEFAULT_PREFERENCES.notifyDealUpdates,
      notify_deal_won: DEFAULT_PREFERENCES.notifyDealWon,
      notify_deal_lost: DEFAULT_PREFERENCES.notifyDealLost,
      notify_document_shares: DEFAULT_PREFERENCES.notifyDocumentShares,
      notify_team_updates: DEFAULT_PREFERENCES.notifyTeamUpdates,
      notify_achievements: DEFAULT_PREFERENCES.notifyAchievements,
      quiet_hours_enabled: DEFAULT_PREFERENCES.quietHoursEnabled,
      quiet_hours_start: DEFAULT_PREFERENCES.quietHoursStart,
      quiet_hours_end: DEFAULT_PREFERENCES.quietHoursEnd,
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('[NotificationPreferences] Error creating preferences:', error);
      return { preferences: null, error: error.message };
    }

    return { preferences: transformRow(data as NotificationPreferencesRow), error: null };
  } catch (err) {
    logger.error('[NotificationPreferences] Unexpected error:', err);
    return { preferences: null, error: 'Failed to create notification preferences' };
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'id' | 'userId' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  workspaceId?: string
): Promise<{ preferences: NotificationPreferences | null; error: string | null }> {
  try {
    const updateData: Record<string, any> = {};

    // Map camelCase to snake_case
    if (updates.inAppEnabled !== undefined) updateData.in_app_enabled = updates.inAppEnabled;
    if (updates.emailEnabled !== undefined) updateData.email_enabled = updates.emailEnabled;
    if (updates.emailFrequency !== undefined) updateData.email_frequency = updates.emailFrequency;
    if (updates.emailDigestTime !== undefined) updateData.email_digest_time = updates.emailDigestTime;
    if (updates.emailDigestDay !== undefined) updateData.email_digest_day = updates.emailDigestDay;
    if (updates.notifyMentions !== undefined) updateData.notify_mentions = updates.notifyMentions;
    if (updates.notifyComments !== undefined) updateData.notify_comments = updates.notifyComments;
    if (updates.notifyTaskAssignments !== undefined) updateData.notify_task_assignments = updates.notifyTaskAssignments;
    if (updates.notifyTaskUpdates !== undefined) updateData.notify_task_updates = updates.notifyTaskUpdates;
    if (updates.notifyTaskDueSoon !== undefined) updateData.notify_task_due_soon = updates.notifyTaskDueSoon;
    if (updates.notifyTaskOverdue !== undefined) updateData.notify_task_overdue = updates.notifyTaskOverdue;
    if (updates.notifyDealUpdates !== undefined) updateData.notify_deal_updates = updates.notifyDealUpdates;
    if (updates.notifyDealWon !== undefined) updateData.notify_deal_won = updates.notifyDealWon;
    if (updates.notifyDealLost !== undefined) updateData.notify_deal_lost = updates.notifyDealLost;
    if (updates.notifyDocumentShares !== undefined) updateData.notify_document_shares = updates.notifyDocumentShares;
    if (updates.notifyTeamUpdates !== undefined) updateData.notify_team_updates = updates.notifyTeamUpdates;
    if (updates.notifyAchievements !== undefined) updateData.notify_achievements = updates.notifyAchievements;
    if (updates.notifyAgentUpdates !== undefined) updateData.notify_agent_updates = updates.notifyAgentUpdates;
    if (updates.notifyMarketBriefs !== undefined) updateData.notify_market_briefs = updates.notifyMarketBriefs;
    if (updates.notifySyncUpdates !== undefined) updateData.notify_sync_updates = updates.notifySyncUpdates;
    if (updates.quietHoursEnabled !== undefined) updateData.quiet_hours_enabled = updates.quietHoursEnabled;
    if (updates.quietHoursStart !== undefined) updateData.quiet_hours_start = updates.quietHoursStart;
    if (updates.quietHoursEnd !== undefined) updateData.quiet_hours_end = updates.quietHoursEnd;

    let query = supabase
      .from('notification_preferences')
      .update(updateData)
      .eq('user_id', userId);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    } else {
      query = query.is('workspace_id', null);
    }

    const { data, error } = await query.select().single();

    if (error) {
      logger.error('[NotificationPreferences] Error updating preferences:', error);
      return { preferences: null, error: error.message };
    }

    return { preferences: transformRow(data as NotificationPreferencesRow), error: null };
  } catch (err) {
    logger.error('[NotificationPreferences] Unexpected error:', err);
    return { preferences: null, error: 'Failed to update notification preferences' };
  }
}

/**
 * Check if a user should receive a specific type of notification
 */
export async function shouldNotifyUser(
  userId: string,
  workspaceId: string,
  notificationType: string,
  channel: 'in_app' | 'email' = 'in_app'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('should_notify_user', {
        p_user_id: userId,
        p_workspace_id: workspaceId,
        p_notification_type: notificationType,
        p_channel: channel,
      });

    if (error) {
      logger.error('[NotificationPreferences] Error checking notification preference:', error);
      return true; // Default to true if check fails
    }

    return data as boolean;
  } catch (err) {
    logger.error('[NotificationPreferences] Unexpected error:', err);
    return true;
  }
}

/**
 * Toggle all email notifications on/off
 */
export async function toggleEmailNotifications(
  userId: string,
  enabled: boolean,
  workspaceId?: string
): Promise<{ success: boolean; error: string | null }> {
  const { preferences, error } = await updateNotificationPreferences(
    userId,
    { emailEnabled: enabled },
    workspaceId
  );
  return { success: !!preferences, error };
}

/**
 * Toggle all in-app notifications on/off
 */
export async function toggleInAppNotifications(
  userId: string,
  enabled: boolean,
  workspaceId?: string
): Promise<{ success: boolean; error: string | null }> {
  const { preferences, error } = await updateNotificationPreferences(
    userId,
    { inAppEnabled: enabled },
    workspaceId
  );
  return { success: !!preferences, error };
}

/**
 * Set quiet hours
 */
export async function setQuietHours(
  userId: string,
  enabled: boolean,
  startTime?: string,
  endTime?: string,
  workspaceId?: string
): Promise<{ success: boolean; error: string | null }> {
  const updates: Partial<NotificationPreferences> = {
    quietHoursEnabled: enabled,
  };
  if (startTime) updates.quietHoursStart = startTime;
  if (endTime) updates.quietHoursEnd = endTime;

  const { preferences, error } = await updateNotificationPreferences(
    userId,
    updates,
    workspaceId
  );
  return { success: !!preferences, error };
}
