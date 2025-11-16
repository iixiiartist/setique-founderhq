/**
 * Task Reminder Service
 * 
 * Automatically sends notifications for:
 * - Tasks due soon (24 hours before)
 * - Overdue tasks
 * - Task deadline changes
 * - Task reassignments
 */

import { supabase } from '../supabase';
import { createNotification, createNotificationsBatch } from './notificationService';
import { logger } from '../logger';

interface Task {
  id: string;
  text: string;
  userId: string;
  assignedTo?: string;
  dueDate?: string;
  dueTime?: string;
  status: string;
  workspaceId?: string;
}

/**
 * Check for tasks due soon and send reminders
 * Should be called periodically (e.g., hourly via Supabase Edge Function or cron job)
 */
export async function checkAndSendDueSoonReminders(workspaceId: string): Promise<{ sent: number; error: string | null }> {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Get tasks due in the next 24 hours that aren't completed
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('status', 'Done')
      .gte('due_date', now.toISOString().split('T')[0])
      .lte('due_date', tomorrow.toISOString().split('T')[0]);

    if (error) {
      logger.error('[TaskReminderService] Failed to fetch due soon tasks:', error);
      return { sent: 0, error: error.message };
    }

    if (!tasks || tasks.length === 0) {
      return { sent: 0, error: null };
    }

    // Create notifications for each task
    const notifications = tasks.map(task => ({
      userId: task.assigned_to || task.user_id,
      workspaceId: task.workspace_id,
      type: 'task_due_soon' as const,
      title: '⏰ Task Due Soon',
      message: `"${task.text}" is due ${formatDueDate(task.due_date, task.due_time)}`,
      entityType: 'task' as const,
      entityId: task.id,
    }));

    const { created } = await createNotificationsBatch(notifications);

    logger.info('[TaskReminderService] Sent due soon reminders:', { count: created, workspaceId });
    return { sent: created, error: null };
  } catch (error) {
    logger.error('[TaskReminderService] Error checking due soon tasks:', error);
    return { sent: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check for overdue tasks and send reminders
 */
export async function checkAndSendOverdueReminders(workspaceId: string): Promise<{ sent: number; error: string | null }> {
  try {
    const now = new Date();
    
    // Get tasks that are overdue and not completed
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('status', 'Done')
      .lt('due_date', now.toISOString().split('T')[0]);

    if (error) {
      logger.error('[TaskReminderService] Failed to fetch overdue tasks:', error);
      return { sent: 0, error: error.message };
    }

    if (!tasks || tasks.length === 0) {
      return { sent: 0, error: null };
    }

    // Create notifications for each overdue task
    const notifications = tasks.map(task => ({
      userId: task.assigned_to || task.user_id,
      workspaceId: task.workspace_id,
      type: 'task_overdue' as const,
      title: '🚨 Task Overdue',
      message: `"${task.text}" was due ${formatDueDate(task.due_date, task.due_time)}`,
      entityType: 'task' as const,
      entityId: task.id,
    }));

    const { created } = await createNotificationsBatch(notifications);

    logger.info('[TaskReminderService] Sent overdue reminders:', { count: created, workspaceId });
    return { sent: created, error: null };
  } catch (error) {
    logger.error('[TaskReminderService] Error checking overdue tasks:', error);
    return { sent: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send notification when task is reassigned
 */
export async function notifyTaskReassigned(params: {
  taskId: string;
  taskText: string;
  fromUserId: string;
  toUserId: string;
  reassignedByName: string;
  workspaceId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { notification, error } = await createNotification({
      userId: params.toUserId,
      workspaceId: params.workspaceId,
      type: 'task_reassigned',
      title: '🔄 Task Reassigned to You',
      message: `${params.reassignedByName} assigned you: "${params.taskText}"`,
      entityType: 'task',
      entityId: params.taskId,
    });

    if (error) {
      logger.error('[TaskReminderService] Failed to send reassignment notification:', error);
      return { success: false, error };
    }

    logger.info('[TaskReminderService] Sent task reassignment notification:', {
      taskId: params.taskId,
      to: params.toUserId,
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error('[TaskReminderService] Error sending reassignment notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send notification when task deadline changes
 */
export async function notifyDeadlineChanged(params: {
  taskId: string;
  taskText: string;
  userId: string;
  oldDate?: string;
  newDate?: string;
  changedByName: string;
  workspaceId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const message = params.newDate
      ? `${params.changedByName} changed deadline for "${params.taskText}" to ${formatDueDate(params.newDate)}`
      : `${params.changedByName} removed deadline from "${params.taskText}"`;

    const { notification, error } = await createNotification({
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: 'task_deadline_changed',
      title: '📅 Task Deadline Changed',
      message,
      entityType: 'task',
      entityId: params.taskId,
    });

    if (error) {
      logger.error('[TaskReminderService] Failed to send deadline change notification:', error);
      return { success: false, error };
    }

    logger.info('[TaskReminderService] Sent deadline change notification:', {
      taskId: params.taskId,
      to: params.userId,
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error('[TaskReminderService] Error sending deadline change notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Format due date for display in notifications
 */
function formatDueDate(date: string, time?: string): string {
  const dueDate = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Reset times for comparison
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  let dateStr = '';
  if (dueDateOnly.getTime() === todayOnly.getTime()) {
    dateStr = 'today';
  } else if (dueDateOnly.getTime() === tomorrowOnly.getTime()) {
    dateStr = 'tomorrow';
  } else {
    dateStr = `on ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  if (time) {
    dateStr += ` at ${time}`;
  }

  return dateStr;
}

/**
 * Initialize reminder checking (would be called by a cron job or edge function)
 * This is a placeholder for the actual implementation
 */
export async function initializeReminderChecks(workspaceId: string): Promise<void> {
  logger.info('[TaskReminderService] Initializing reminder checks for workspace:', workspaceId);
  
  // This would typically be handled by:
  // 1. Supabase Edge Function with cron trigger
  // 2. External cron service (e.g., Vercel Cron, AWS EventBridge)
  // 3. Client-side periodic check (less reliable)
  
  // For now, we'll document the recommended approach
  logger.info('[TaskReminderService] Recommendation: Set up Supabase Edge Function with pg_cron or external cron service');
}
