// hooks/useAgentReports.ts
// React hook for managing Research Agent reports

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { AgentReportService, type AgentReport, type CreateReportParams } from '../lib/services/agentReportService';
import { logger } from '../lib/logger';

const REPORTS_QUERY_KEY = 'agent-reports';

export interface UseAgentReportsReturn {
  reports: AgentReport[];
  isLoading: boolean;
  error: string | null;
  saveReport: (params: Omit<CreateReportParams, 'workspaceId' | 'userId'>) => Promise<AgentReport | null>;
  deleteReport: (reportId: string) => Promise<boolean>;
  refreshReports: () => void;
  isSaving: boolean;
}

export function useAgentReports(workspaceId: string | undefined, userId: string | undefined): UseAgentReportsReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

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
    },
    onError: (err) => {
      logger.error('[useAgentReports] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save report');
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
    },
    onError: (err) => {
      logger.error('[useAgentReports] Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    },
  });

  const saveReport = useCallback(async (params: Omit<CreateReportParams, 'workspaceId' | 'userId'>) => {
    try {
      return await saveMutation.mutateAsync(params);
    } catch {
      return null;
    }
  }, [saveMutation]);

  const deleteReport = useCallback(async (reportId: string) => {
    try {
      await deleteMutation.mutateAsync(reportId);
      return true;
    } catch {
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
  };
}
