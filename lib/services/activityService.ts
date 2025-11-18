import { supabase } from '../supabase';

export type ActivityActionType =
  // Task actions
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'task_updated'
  | 'task_deleted'
  // Comment actions
  | 'comment_added'
  | 'comment_updated'
  | 'comment_deleted'
  // CRM Company actions
  | 'crm_company_created'
  | 'crm_company_updated'
  | 'crm_company_assigned'
  | 'crm_company_status_changed'
  // CRM Contact actions
  | 'crm_contact_added'
  | 'crm_contact_updated'
  | 'crm_contact_assigned'
  // Meeting actions
  | 'meeting_scheduled'
  | 'meeting_attendee_added'
  // Marketing actions
  | 'marketing_campaign_created'
  | 'marketing_campaign_assigned'
  | 'marketing_campaign_status_changed'
  | 'marketing_campaign_completed'
  // Financial actions
  | 'financial_log_created'
  | 'expense_submitted'
  | 'expense_approved'
  // Document actions
  | 'document_uploaded'
  | 'document_shared'
  | 'document_assigned_for_review'
  | 'document_reviewed'
  | 'document_commented'
  // Calendar actions
  | 'calendar_event_created'
  | 'calendar_meeting_invited'
  // Note actions
  | 'note_added'
  // New actions
  | 'revenue_created'
  | 'payment_received'
  | 'budget_created'
  | 'attribution_created'
  | 'calendar_linked'
  | 'deal_created'
  | 'deal_updated';

export type ActivityEntityType = 
  | 'task' 
  | 'comment' 
  | 'crm_company'
  | 'crm_contact'
  | 'meeting'
  | 'marketing'
  | 'financial'
  | 'document'
  | 'calendar'
  | 'note'
  | 'revenue'
  | 'budget'
  | 'attribution'
  | 'deal'
  | 'marketing_campaign'
  | 'financial_log'
  | 'expense'
  | 'calendar_event';

export interface Activity {
  id: string;
  workspaceId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  actionType: ActivityActionType;
  entityType: ActivityEntityType;
  entityId?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface ActivityLogRow {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

/**
 * Log an activity to the activity feed
 */
export async function logActivity(params: {
  workspaceId: string;
  userId: string;
  actionType: ActivityActionType;
  entityType: ActivityEntityType;
  entityId?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[ActivityService] Logging activity:', params);

    const { error } = await supabase.from('activity_log').insert({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      action: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[ActivityService] Failed to log activity:', error);
      return { success: false, error: error.message };
    }

    console.log('[ActivityService] Activity logged successfully');
    return { success: true };
  } catch (error) {
    console.error('[ActivityService] Exception logging activity:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch recent activities for a workspace
 */
export async function getWorkspaceActivities(params: {
  workspaceId: string;
  limit?: number;
}): Promise<{ activities: Activity[]; error?: string }> {
  try {
    const limit = params.limit || 50;

    console.log('[ActivityService] Fetching activities for workspace:', params.workspaceId);

    const { data, error } = await supabase
      .from('activity_log')
      .select(
        `
        *,
        profiles(full_name, avatar_url)
      `
      )
      .eq('workspace_id', params.workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ActivityService] Failed to fetch activities:', error);
      return { activities: [], error: error.message };
    }

    const activities: Activity[] = (data as ActivityLogRow[]).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      userName: row.profiles?.full_name || 'Unknown User',
      userAvatar: row.profiles?.avatar_url || undefined,
      actionType: row.action as ActivityActionType,
      entityType: row.entity_type as ActivityEntityType,
      entityId: row.entity_id || undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));

    console.log('[ActivityService] Loaded activities:', activities.length);
    return { activities };
  } catch (error) {
    console.error('[ActivityService] Exception fetching activities:', error);
    return { activities: [], error: String(error) };
  }
}

/**
 * Get activities for a specific entity
 */
export async function getEntityActivities(params: {
  entityType: ActivityEntityType;
  entityId: string;
  limit?: number;
}): Promise<{ activities: Activity[]; error?: string }> {
  try {
    const limit = params.limit || 20;

    const { data, error } = await supabase
      .from('activity_log')
      .select(
        `
        *,
        profiles(full_name, avatar_url)
      `
      )
      .eq('entity_type', params.entityType)
      .eq('entity_id', params.entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ActivityService] Failed to fetch entity activities:', error);
      return { activities: [], error: error.message };
    }

    const activities: Activity[] = (data as ActivityLogRow[]).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      userName: row.profiles?.full_name || 'Unknown User',
      userAvatar: row.profiles?.avatar_url || undefined,
      actionType: row.action as ActivityActionType,
      entityType: row.entity_type as ActivityEntityType,
      entityId: row.entity_id || undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));

    return { activities };
  } catch (error) {
    console.error('[ActivityService] Exception fetching entity activities:', error);
    return { activities: [], error: String(error) };
  }
}

/**
 * Format activity description for display
 */
export function formatActivityDescription(activity: Activity): string {
  const { actionType, entityType, metadata } = activity;

  switch (actionType) {
    case 'task_created':
      return `created a task: "${metadata.taskName || 'Untitled'}"`;
    case 'task_completed':
      return `completed task: "${metadata.taskName || 'Untitled'}"`;
    case 'task_assigned':
      return `assigned task "${metadata.taskName || 'Untitled'}" to ${metadata.assigneeName || 'someone'}`;
    case 'task_updated':
      return `updated task: "${metadata.taskName || 'Untitled'}"`;
    case 'task_deleted':
      return `deleted task: "${metadata.taskName || 'Untitled'}"`;
    case 'crm_contact_added':
      return `added ${entityType === 'crm_contact' ? 'contact' : entityType}: "${metadata.contactName || 'Unknown'}"`;
    case 'crm_contact_updated':
      return `updated ${entityType === 'crm_contact' ? 'contact' : entityType}: "${metadata.contactName || 'Unknown'}"`;
    case 'document_uploaded':
      return `uploaded document: "${metadata.fileName || 'Unknown'}"`;
    case 'meeting_scheduled':
      return `scheduled meeting: "${metadata.meetingTitle || 'Untitled'}"`;
    case 'note_added':
      return `added a note to ${entityType}`;
    default:
      return `performed action: ${actionType}`;
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "just now")
 */
export function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}
