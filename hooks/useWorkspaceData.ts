/**
 * @deprecated This hook uses the heavy getAllDashboardData fan-out which loads all data at once.
 * Use useDashboardData instead, which provides lazy per-tab loading via useQueryDataPersistence.
 * 
 * This file is preserved for reference but should not be imported.
 * TODO: Remove this file after confirming no external dependencies.
 */

import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from '../types';

interface UseWorkspaceDataOptions {
  workspaceId: string;
  userId: string;
  enabled?: boolean;
}

/**
 * @deprecated Use useDashboardData instead for lazy per-tab loading.
 * This hook loads ALL dashboard data at once (9 parallel queries) which causes
 * performance issues on large workspaces.
 */
export function useWorkspaceData({ workspaceId, userId, enabled = true }: UseWorkspaceDataOptions) {
  console.warn('[useWorkspaceData] DEPRECATED: Use useDashboardData for lazy per-tab loading');
  
  return useQuery<Partial<DashboardData>, Error>({
    queryKey: ['workspace', workspaceId, 'data', 'DEPRECATED'],
    queryFn: async () => {
      throw new Error('useWorkspaceData is deprecated. Use useDashboardData instead.');
    },
    enabled: false, // Always disabled - this hook should not be used
    staleTime: Infinity,
  });
}
