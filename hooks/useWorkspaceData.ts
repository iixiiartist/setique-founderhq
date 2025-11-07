/**
 * React Query hook for fetching complete workspace data
 * 
 * This hook replaces the manual data loading in DashboardApp
 * with automatic caching, background refetching, and error handling.
 */

import { useQuery } from '@tanstack/react-query';
import { DatabaseService } from '../lib/services/database';
import type { DashboardData } from '../types';

interface UseWorkspaceDataOptions {
  workspaceId: string;
  userId: string;
  enabled?: boolean;
}

export function useWorkspaceData({ workspaceId, userId, enabled = true }: UseWorkspaceDataOptions) {
  return useQuery<Partial<DashboardData>, Error>({
    queryKey: ['workspace', workspaceId, 'data'],
    queryFn: async () => {
      const { data, error } = await DatabaseService.getAllDashboardData(userId, workspaceId);
      if (error) {
        throw new Error(error.message || 'Failed to load workspace data');
      }
      if (!data) {
        throw new Error('No workspace data returned');
      }
      return data;
    },
    enabled: enabled && !!workspaceId && !!userId,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
}
