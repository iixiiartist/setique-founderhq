/**
 * Tab Prefetching Hook
 * Preloads React Query data when user hovers over tab buttons
 * Ensures instant tab switching with pre-cached data
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { TabType, Tab } from '../constants';
import { DatabaseService } from '../lib/services/database';
import { taskKeys } from './useTaskQueries';
import { crmKeys } from './useCrmQueries';

interface UsePrefetchTabsOptions {
  workspaceId?: string;
  userId?: string;
  enabled?: boolean;
}

export const usePrefetchTabs = ({ workspaceId, userId, enabled = true }: UsePrefetchTabsOptions) => {
  const queryClient = useQueryClient();

  const prefetchTab = useCallback(
    async (tab: TabType) => {
      if (!enabled || !workspaceId || !userId) return;

      // Prefetch data based on tab type using consistent query keys
      switch (tab) {
        case Tab.Investors:
        case Tab.Customers:
        case Tab.Partners:
          // Prefetch CRM items using consistent query keys
          await queryClient.prefetchQuery({
            queryKey: crmKeys.workspace(workspaceId),
            queryFn: async () => {
              const { data } = await DatabaseService.getCrmItems(workspaceId);
              return data;
            },
            staleTime: 5 * 60 * 1000,
          });
          break;

        case Tab.Marketing:
          // Prefetch marketing items
          await queryClient.prefetchQuery({
            queryKey: ['marketing-items', workspaceId],
            queryFn: async () => {
              const { data } = await DatabaseService.getMarketingItems(workspaceId);
              return data;
            },
            staleTime: 5 * 60 * 1000,
          });
          break;

        case Tab.Financials:
          // Prefetch financial data
          await Promise.all([
            queryClient.prefetchQuery({
              queryKey: ['financial-logs', workspaceId],
              queryFn: async () => {
                const { data } = await DatabaseService.getFinancialLogs(workspaceId);
                return data;
              },
              staleTime: 5 * 60 * 1000,
            }),
            queryClient.prefetchQuery({
              queryKey: ['expenses', workspaceId],
              queryFn: async () => {
                const { data } = await DatabaseService.getExpenses(workspaceId);
                return data;
              },
              staleTime: 5 * 60 * 1000,
            }),
          ]);
          break;

        case Tab.Calendar:
          // Prefetch tasks and CRM items for calendar using consistent keys
          await Promise.all([
            queryClient.prefetchQuery({
              queryKey: taskKeys.workspace(workspaceId),
              queryFn: async () => {
                const { data } = await DatabaseService.getTasks(userId, workspaceId);
                return data;
              },
              staleTime: 5 * 60 * 1000,
            }),
            queryClient.prefetchQuery({
              queryKey: crmKeys.workspace(workspaceId),
              queryFn: async () => {
                const { data } = await DatabaseService.getCrmItems(workspaceId);
                return data;
              },
              staleTime: 5 * 60 * 1000,
            }),
          ]);
          break;

        case Tab.ProductsServices:
          // Prefetch products & services tasks
          await queryClient.prefetchQuery({
            queryKey: taskKeys.workspace(workspaceId),
            queryFn: async () => {
              const { data } = await DatabaseService.getTasks(userId, workspaceId);
              return data;
            },
            staleTime: 5 * 60 * 1000,
          });
          break;

        case Tab.Documents:
          // Prefetch documents
          await queryClient.prefetchQuery({
            queryKey: ['documents', workspaceId],
            queryFn: async () => {
              const { data } = await DatabaseService.getDocuments(workspaceId);
              return data;
            },
            staleTime: 5 * 60 * 1000,
          });
          break;

        case Tab.Settings:
          // Settings data is lightweight, no prefetch needed
          break;

        default:
          // No prefetching needed for Dashboard, Admin
          break;
      }
    },
    [queryClient, workspaceId, userId, enabled]
  );

  /**
   * Prefetch tab data with debounce
   * Call this on mouseEnter/hover with 200ms delay
   */
  const prefetchTabWithDelay = useCallback(
    (tab: TabType) => {
      // Use a timeout to avoid prefetching on quick mouse movements
      const timeoutId = setTimeout(() => {
        prefetchTab(tab);
      }, 200); // 200ms hover delay

      // Return cleanup function
      return () => clearTimeout(timeoutId);
    },
    [prefetchTab]
  );

  return {
    prefetchTab,
    prefetchTabWithDelay,
  };
};
