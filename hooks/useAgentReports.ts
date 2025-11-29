// hooks/useAgentReports.ts
// React hook for managing Research Agent reports

import { useState, useCallback, useRef } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { AgentReportService, type AgentReport, type CreateReportParams } from '../lib/services/agentReportService';
import { logger } from '../lib/logger';
import { showSuccess, showError } from '../lib/utils/toast';
import { OperationQueue, OperationQueueError } from '../lib/utils/operationQueue';

const REPORTS_QUERY_KEY = 'agent-reports';

export interface UseAgentReportsReturn {
  reports: AgentReport[];
  isLoading: boolean;
  error: string | null;
  saveReport: (params: Omit<CreateReportParams, 'workspaceId' | 'userId'>) => Promise<AgentReport | null>;
  deleteReport: (reportId: string) => Promise<boolean>;
  refreshReports: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}

export function useAgentReports(workspaceId: string | undefined, userId: string | undefined): UseAgentReportsReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  
  // Operation queue for deduplication
  const operationQueueRef = useRef(new OperationQueue({ dedupeDelayMs: 1000 }));

  // Fetch reports
  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: [REPORTS_QUERY_KEY, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return AgentReportService.getReports(workspaceId);
    },
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (params: Omit<CreateReportParams, 'workspaceId' | 'userId'>) => {
      if (!workspaceId || !userId) {
        throw new Error('Workspace or user not available');
      }
      const result = await AgentReportService.saveReport({
        ...params,
        workspaceId,
        userId,
      });
      if (!result) {
        throw new Error('Failed to save report');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_QUERY_KEY, workspaceId] });
      setError(null);
      showSuccess('Report saved successfully');
    },
    onError: (err) => {
      logger.error('[useAgentReports] Save error:', err);
      const message = err instanceof Error ? err.message : 'Failed to save report';
      setError(message);
      showError(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const success = await AgentReportService.deleteReport(reportId);
      if (!success) {
        throw new Error('Failed to delete report');
      }
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_QUERY_KEY, workspaceId] });
      setError(null);
      showSuccess('Report deleted');
    },
    onError: (err) => {
      logger.error('[useAgentReports] Delete error:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete report';
      setError(message);
      showError(message);
    },
  });

  const saveReport = useCallback(async (params: Omit<CreateReportParams, 'workspaceId' | 'userId'>) => {
    // Use operation queue to prevent duplicate saves
    const operationKey = `save-${params.target}-${params.agentSlug}`;
    try {
      return await operationQueueRef.current.enqueue(operationKey, async () => {
        return await saveMutation.mutateAsync(params);
      });
    } catch (err) {
      // Don't show error for debounced operations
      if (err instanceof OperationQueueError && err.code === 'debounced') {
        logger.debug('[useAgentReports] Save debounced');
        return null;
      }
      return null;
    }
  }, [saveMutation]);

  const deleteReport = useCallback(async (reportId: string) => {
    // Use operation queue to prevent duplicate deletes
    const operationKey = `delete-${reportId}`;
    try {
      await operationQueueRef.current.enqueue(operationKey, async () => {
        await deleteMutation.mutateAsync(reportId);
      });
      return true;
    } catch (err) {
      // Don't show error for debounced operations
      if (err instanceof OperationQueueError && err.code === 'debounced') {
        logger.debug('[useAgentReports] Delete debounced');
        return false;
      }
      return false;
    }
  }, [deleteMutation]);

  const refreshReports = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    reports,
    isLoading,
    error,
    saveReport,
    deleteReport,
    refreshReports,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
