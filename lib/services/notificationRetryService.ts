// lib/services/notificationRetryService.ts
// Phase 3: Notification retry logic for failed deliveries
// Handles exponential backoff, max retries, and dead letter queue

import { supabase } from '../supabase';
import { logger } from '../logger';
import * as Sentry from '@sentry/react';

// ============================================
// TYPES
// ============================================

export interface FailedNotification {
  id: string;
  userId: string;
  workspaceId: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  deliveryStatus: string;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
}

export interface RetryResult {
  success: boolean;
  notificationId: string;
  error?: string;
  nextRetryAt?: string;
}

export interface RetryBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  results: RetryResult[];
}

// ============================================
// CONSTANTS
// ============================================

const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 30 * 60 * 1000; // 30 minutes

// Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30min)
const getRetryDelay = (retryCount: number): number => {
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
};

// ============================================
// FETCH FAILED NOTIFICATIONS
// ============================================

/**
 * Get notifications that failed delivery and are eligible for retry
 */
export async function getFailedNotifications(
  limit = 50
): Promise<{ data: FailedNotification[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .in('delivery_status', ['failed', 'created'])
      .lt('retry_count', MAX_RETRY_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    const transformed = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      workspaceId: row.workspace_id,
      type: row.type,
      title: row.title,
      message: row.message,
      priority: row.priority || 'normal',
      deliveryStatus: row.delivery_status || 'created',
      retryCount: row.retry_count || 0,
      lastError: row.last_error,
      createdAt: row.created_at,
    }));

    return { data: transformed, error: null };
  } catch (err) {
    logger.error('[notificationRetryService] Failed to fetch notifications:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// RETRY SINGLE NOTIFICATION
// ============================================

/**
 * Attempt to retry delivery of a single notification
 */
export async function retryNotification(
  notificationId: string
): Promise<RetryResult> {
  try {
    // First, get the notification details
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (fetchError || !notification) {
      throw fetchError || new Error('Notification not found');
    }

    const currentRetryCount = notification.retry_count || 0;

    // Check if max retries exceeded
    if (currentRetryCount >= MAX_RETRY_ATTEMPTS) {
      // Move to dead letter (mark as permanently failed)
      await supabase
        .from('notifications')
        .update({
          delivery_status: 'failed',
          last_error: 'Max retry attempts exceeded',
        })
        .eq('id', notificationId);

      logger.warn(`[notificationRetryService] Notification ${notificationId} exceeded max retries`);
      
      return {
        success: false,
        notificationId,
        error: 'Max retry attempts exceeded',
      };
    }

    // Attempt delivery (mark as delivered)
    // In a real system, this would trigger the actual delivery mechanism
    // For in-app notifications, marking as delivered is sufficient
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        retry_count: currentRetryCount + 1,
        last_error: null,
      })
      .eq('id', notificationId);

    if (updateError) {
      // Update failed, increment retry count and record error
      const nextRetryDelay = getRetryDelay(currentRetryCount + 1);
      const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

      await supabase
        .from('notifications')
        .update({
          delivery_status: 'failed',
          retry_count: currentRetryCount + 1,
          last_error: updateError.message,
        })
        .eq('id', notificationId);

      return {
        success: false,
        notificationId,
        error: updateError.message,
        nextRetryAt,
      };
    }

    logger.info(`[notificationRetryService] Successfully retried notification ${notificationId}`);
    
    return {
      success: true,
      notificationId,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`[notificationRetryService] Retry failed for ${notificationId}:`, err);
    
    Sentry.captureException(err, {
      tags: { service: 'notificationRetry' },
      extra: { notificationId },
    });

    return {
      success: false,
      notificationId,
      error: errorMessage,
    };
  }
}

// ============================================
// BATCH RETRY
// ============================================

/**
 * Process a batch of failed notifications for retry
 */
export async function retryFailedNotifications(
  limit = 50
): Promise<RetryBatchResult> {
  const results: RetryResult[] = [];
  let succeeded = 0;
  let failed = 0;

  try {
    const { data: failedNotifications, error } = await getFailedNotifications(limit);

    if (error || !failedNotifications) {
      throw error || new Error('Failed to fetch notifications');
    }

    logger.info(`[notificationRetryService] Processing ${failedNotifications.length} failed notifications`);

    for (const notification of failedNotifications) {
      const result = await retryNotification(notification.id);
      results.push(result);
      
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }

      // Small delay between retries to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      processed: failedNotifications.length,
      succeeded,
      failed,
      results,
    };
  } catch (err) {
    logger.error('[notificationRetryService] Batch retry failed:', err);
    
    Sentry.captureException(err, {
      tags: { service: 'notificationRetry', action: 'batchRetry' },
    });

    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      results,
    };
  }
}

// ============================================
// MARK AS FAILED
// ============================================

/**
 * Mark a notification as failed with an error message
 */
export async function markNotificationFailed(
  notificationId: string,
  errorMessage: string
): Promise<boolean> {
  try {
    const { data: notification } = await supabase
      .from('notifications')
      .select('retry_count')
      .eq('id', notificationId)
      .single();

    const currentRetryCount = notification?.retry_count || 0;

    const { error } = await supabase
      .from('notifications')
      .update({
        delivery_status: 'failed',
        retry_count: currentRetryCount + 1,
        last_error: errorMessage,
      })
      .eq('id', notificationId);

    if (error) {
      throw error;
    }

    return true;
  } catch (err) {
    logger.error(`[notificationRetryService] Failed to mark notification as failed:`, err);
    return false;
  }
}

// ============================================
// GET RETRY STATISTICS
// ============================================

export interface RetryStats {
  totalFailed: number;
  pendingRetry: number;
  permanentlyFailed: number;
  byPriority: Record<string, number>;
}

/**
 * Get statistics about failed notifications
 */
export async function getRetryStatistics(
  workspaceId?: string
): Promise<{ data: RetryStats | null; error: Error | null }> {
  try {
    let query = supabase
      .from('notifications')
      .select('delivery_status, retry_count, priority')
      .in('delivery_status', ['failed', 'created']);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const stats: RetryStats = {
      totalFailed: data?.length || 0,
      pendingRetry: 0,
      permanentlyFailed: 0,
      byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
    };

    for (const notification of data || []) {
      const retryCount = notification.retry_count || 0;
      const priority = notification.priority || 'normal';

      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        stats.permanentlyFailed++;
      } else {
        stats.pendingRetry++;
      }

      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    }

    return { data: stats, error: null };
  } catch (err) {
    logger.error('[notificationRetryService] Failed to get statistics:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// CLEANUP OLD FAILED NOTIFICATIONS
// ============================================

/**
 * Delete permanently failed notifications older than specified days
 */
export async function cleanupOldFailedNotifications(
  olderThanDays = 30
): Promise<{ deleted: number; error: Error | null }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('delivery_status', 'failed')
      .gte('retry_count', MAX_RETRY_ATTEMPTS)
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw error;
    }

    const deletedCount = data?.length || 0;
    logger.info(`[notificationRetryService] Cleaned up ${deletedCount} old failed notifications`);

    return { deleted: deletedCount, error: null };
  } catch (err) {
    logger.error('[notificationRetryService] Cleanup failed:', err);
    return { deleted: 0, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export default {
  getFailedNotifications,
  retryNotification,
  retryFailedNotifications,
  markNotificationFailed,
  getRetryStatistics,
  cleanupOldFailedNotifications,
  MAX_RETRY_ATTEMPTS,
};
