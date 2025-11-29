// hooks/useNotificationRetry.ts
// Hook for managing notification retry operations
// Provides UI components access to retry statistics and manual retry triggers

import { useState, useEffect, useCallback } from 'react';
import {
  getRetryStatistics,
  retryFailedNotifications,
  retryNotification,
  cleanupOldFailedNotifications,
  type RetryStats,
  type RetryBatchResult,
} from '../lib/services/notificationRetryService';
import { logger } from '../lib/logger';

export interface UseNotificationRetryOptions {
  workspaceId?: string;
  /** Auto-refresh statistics interval in ms (default: 60000, 0 to disable) */
  refreshInterval?: number;
  /** Enable automatic background retry (default: false) */
  autoRetry?: boolean;
  /** Auto-retry interval in ms (default: 300000 = 5 minutes) */
  autoRetryInterval?: number;
}

export interface UseNotificationRetryResult {
  // Statistics
  stats: RetryStats | null;
  statsLoading: boolean;
  statsError: string | null;
  
  // Actions
  refreshStats: () => Promise<void>;
  retryAll: () => Promise<RetryBatchResult>;
  retrySingle: (notificationId: string) => Promise<boolean>;
  cleanup: (olderThanDays?: number) => Promise<number>;
  
  // Retry state
  retrying: boolean;
  lastRetryResult: RetryBatchResult | null;
}

export function useNotificationRetry(
  options: UseNotificationRetryOptions = {}
): UseNotificationRetryResult {
  const {
    workspaceId,
    refreshInterval = 60000,
    autoRetry = false,
    autoRetryInterval = 300000,
  } = options;

  const [stats, setStats] = useState<RetryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [lastRetryResult, setLastRetryResult] = useState<RetryBatchResult | null>(null);

  // Fetch statistics
  const refreshStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      
      const { data, error } = await getRetryStatistics(workspaceId);
      
      if (error) {
        throw error;
      }
      
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch retry statistics';
      setStatsError(message);
      logger.error('[useNotificationRetry] Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [workspaceId]);

  // Retry all failed notifications
  const retryAll = useCallback(async (): Promise<RetryBatchResult> => {
    setRetrying(true);
    try {
      const result = await retryFailedNotifications();
      setLastRetryResult(result);
      
      // Refresh stats after retry
      await refreshStats();
      
      return result;
    } finally {
      setRetrying(false);
    }
  }, [refreshStats]);

  // Retry single notification
  const retrySingle = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const result = await retryNotification(notificationId);
      
      // Refresh stats after retry
      await refreshStats();
      
      return result.success;
    } catch (err) {
      logger.error('[useNotificationRetry] Single retry error:', err);
      return false;
    }
  }, [refreshStats]);

  // Cleanup old failed notifications
  const cleanup = useCallback(async (olderThanDays = 30): Promise<number> => {
    try {
      const { deleted, error } = await cleanupOldFailedNotifications(olderThanDays);
      
      if (error) {
        throw error;
      }
      
      // Refresh stats after cleanup
      await refreshStats();
      
      return deleted;
    } catch (err) {
      logger.error('[useNotificationRetry] Cleanup error:', err);
      return 0;
    }
  }, [refreshStats]);

  // Initial fetch
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Auto-refresh statistics
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(refreshStats, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, refreshStats]);

  // Auto-retry background process
  useEffect(() => {
    if (!autoRetry || autoRetryInterval <= 0) return;

    const intervalId = setInterval(async () => {
      logger.info('[useNotificationRetry] Running auto-retry...');
      await retryAll();
    }, autoRetryInterval);

    return () => clearInterval(intervalId);
  }, [autoRetry, autoRetryInterval, retryAll]);

  return {
    stats,
    statsLoading,
    statsError,
    refreshStats,
    retryAll,
    retrySingle,
    cleanup,
    retrying,
    lastRetryResult,
  };
}

export default useNotificationRetry;
