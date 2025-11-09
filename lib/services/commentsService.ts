import { supabase } from '../supabase';
import { logger } from './lib/logger'
import { createNotification } from './notificationService';
import { logActivity } from './activityService';

export interface TaskComment {
  id: string;
  taskId: string;
  workspaceId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  mentions: string[]; // Array of mentioned user IDs
  createdAt: string;
  updatedAt: string;
}

interface TaskCommentRow {
  id: string;
  task_id: string;
  workspace_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface CreateCommentParams {
  taskId: string;
  workspaceId: string;
  userId: string;
  content: string;
  taskName?: string; // For notifications
}

/**
 * Extract @mentions from comment content
 * Returns array of user IDs that were mentioned
 */
export function extractMentions(content: string, workspaceMembers: Array<{ id: string; name: string }>): string[] {
  logger.info('[CommentsService] Extracting mentions from:', content);
  logger.info('[CommentsService] Available workspace members:', workspaceMembers);
  
  // Match @username (no spaces, just word characters)
  const mentionPattern = /@(\w+)/g;
  const matches = Array.from(content.matchAll(mentionPattern));
  
  logger.info('[CommentsService] Regex matches:', matches.map(m => m[0]));
  
  if (matches.length === 0) return [];

  const mentionedUserIds: string[] = [];
  
  matches.forEach((match) => {
    const username = match[1]; // Get the captured group
    logger.info('[CommentsService] Looking for username:', username);
    
    // Compare with name that has spaces removed
    const member = workspaceMembers.find((m) => {
      const nameNoSpaces = m.name.replace(/\s+/g, '');
      const nameMatch = nameNoSpaces.toLowerCase() === username.toLowerCase();
      logger.info('[CommentsService] Checking member:', m.name, '| Match:', nameMatch);
      return nameMatch;
    });
    
    if (member) {
      logger.info('[CommentsService] Found member:', member);
      if (!mentionedUserIds.includes(member.id)) {
        mentionedUserIds.push(member.id);
      }
    } else {
      logger.info('[CommentsService] No member found for:', username);
    }
  });

  logger.info('[CommentsService] Final mentioned user IDs:', mentionedUserIds);
  return mentionedUserIds;
}

/**
 * Create a new comment on a task
 */
export async function createComment(params: CreateCommentParams): Promise<{ comment: TaskComment | null; error: string | null }> {
  try {
    logger.info('[CommentsService] Creating comment on task:', params.taskId);
    logger.info('[CommentsService] Workspace ID:', params.workspaceId);

    // First, get workspace members to resolve mentions
    // Note: We specify the exact foreign key relationship because workspace_members has multiple FKs to profiles
    const { data: membersData, error: membersError } = await supabase
      .from('workspace_members')
      .select('user_id, profiles!workspace_members_user_id_fkey(id, full_name)')
      .eq('workspace_id', params.workspaceId);

    if (membersError) {
      logger.error('[CommentsService] Workspace members query ERROR:', membersError);
      logger.error('[CommentsService] Error details:', JSON.stringify(membersError, null, 2));
    }

    logger.info('[CommentsService] Workspace members query result:', { membersData, membersError });

    const workspaceMembers = (membersData || []).map((m: any) => ({
      id: m.user_id,
      name: m.profiles?.full_name || '',
    }));

    logger.info('[CommentsService] Transformed workspace members:', workspaceMembers);

    // Extract mentions from content
    const mentions = extractMentions(params.content, workspaceMembers);

    // Insert comment
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: params.taskId,
        workspace_id: params.workspaceId,
        user_id: params.userId,
        content: params.content,
        mentions,
      })
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('[CommentsService] Failed to create comment:', error);
      return { comment: null, error: error.message };
    }

    const commentRow = data as TaskCommentRow;
    const comment: TaskComment = {
      id: commentRow.id,
      taskId: commentRow.task_id,
      workspaceId: commentRow.workspace_id,
      userId: commentRow.user_id,
      userName: commentRow.profiles?.full_name,
      userAvatar: commentRow.profiles?.avatar_url || undefined,
      content: commentRow.content,
      mentions: commentRow.mentions,
      createdAt: commentRow.created_at,
      updatedAt: commentRow.updated_at,
    };

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      logger.info('[CommentsService] Creating notifications for mentions:', mentions);
      const commenterName = commentRow.profiles?.full_name || 'Someone';
      const taskName = params.taskName || 'a task';

      for (const mentionedUserId of mentions) {
        // Don't notify the commenter themselves
        if (mentionedUserId !== params.userId) {
          logger.info('[CommentsService] Creating notification for user:', mentionedUserId);
          const result = await createNotification({
            userId: mentionedUserId,
            workspaceId: params.workspaceId,
            type: 'mention',
            title: `${commenterName} mentioned you`,
            message: `${commenterName} mentioned you in a comment on "${taskName}"`,
            entityType: 'comment',
            entityId: comment.id,
          });
          logger.info('[CommentsService] Notification creation result:', result);
        } else {
          logger.info('[CommentsService] Skipping self-notification for:', mentionedUserId);
        }
      }
    } else {
      logger.info('[CommentsService] No mentions found in comment');
    }

    // Log activity
    if (params.taskName) {
      await logActivity({
        workspaceId: params.workspaceId,
        userId: params.userId,
        actionType: 'comment_added',
        entityType: 'task',
        entityId: params.taskId,
        metadata: {
          taskName: params.taskName,
          commentPreview: params.content.substring(0, 100),
        },
      });
    }

    logger.info('[CommentsService] Created comment:', comment.id);
    return { comment, error: null };
  } catch (err) {
    logger.error('[CommentsService] Unexpected error:', err);
    return { comment: null, error: 'Failed to create comment' };
  }
}

/**
 * Get all comments for a task
 */
export async function getTaskComments(taskId: string): Promise<{ comments: TaskComment[]; error: string | null }> {
  try {
    logger.info('[CommentsService] Fetching comments for task:', taskId);

    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        profiles(full_name, email, avatar_url)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('[CommentsService] Failed to fetch comments:', error);
      return { comments: [], error: error.message };
    }

    const comments: TaskComment[] = (data as TaskCommentRow[]).map((row) => ({
      id: row.id,
      taskId: row.task_id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      userName: row.profiles?.full_name || row.profiles?.email || 'Unknown User',
      userAvatar: row.profiles?.avatar_url || undefined,
      content: row.content,
      mentions: row.mentions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    logger.info('[CommentsService] Loaded comments:', comments.length);
    return { comments, error: null };
  } catch (err) {
    logger.error('[CommentsService] Unexpected error:', err);
    return { comments: [], error: 'Failed to fetch comments' };
  }
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, content: string, workspaceMembers: Array<{ id: string; name: string }>): Promise<{ comment: TaskComment | null; error: string | null }> {
  try {
    logger.info('[CommentsService] Updating comment:', commentId);

    // Extract mentions from updated content
    const mentions = extractMentions(content, workspaceMembers);

    const { data, error } = await supabase
      .from('task_comments')
      .update({
        content,
        mentions,
      })
      .eq('id', commentId)
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('[CommentsService] Failed to update comment:', error);
      return { comment: null, error: error.message };
    }

    const commentRow = data as TaskCommentRow;
    const comment: TaskComment = {
      id: commentRow.id,
      taskId: commentRow.task_id,
      workspaceId: commentRow.workspace_id,
      userId: commentRow.user_id,
      userName: commentRow.profiles?.full_name,
      userAvatar: commentRow.profiles?.avatar_url || undefined,
      content: commentRow.content,
      mentions: commentRow.mentions,
      createdAt: commentRow.created_at,
      updatedAt: commentRow.updated_at,
    };

    logger.info('[CommentsService] Updated comment:', comment.id);
    return { comment, error: null };
  } catch (err) {
    logger.error('[CommentsService] Unexpected error:', err);
    return { comment: null, error: 'Failed to update comment' };
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    logger.info('[CommentsService] Deleting comment:', commentId);

    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      logger.error('[CommentsService] Failed to delete comment:', error);
      return { success: false, error: error.message };
    }

    logger.info('[CommentsService] Deleted comment:', commentId);
    return { success: true, error: null };
  } catch (err) {
    logger.error('[CommentsService] Unexpected error:', err);
    return { success: false, error: 'Failed to delete comment' };
  }
}
