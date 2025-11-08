/**
 * Tab Prefetching Hook
 * Preloads React Query data when user hovers over tab buttons
 * Ensures instant tab switching with pre-cached data
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { TabType, Tab } from '../constants';
import { DatabaseService } from '../lib/services/database';

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

      // Prefetch data based on tab type
      switch (tab) {
        case Tab.Investors:
        case Tab.Customers:
        case Tab.Partners:
          // Prefetch CRM items
          await queryClient.prefetchQuery({
            queryKey: ['crm-items', workspaceId],
            queryFn: () => DatabaseService.getCrmItems(workspaceId),
            staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
          });
          break;

        case Tab.Marketing:
          // Prefetch marketing items
          await queryClient.prefetchQuery({
            queryKey: ['marketing-items', workspaceId],
            queryFn: () => DatabaseService.getMarketingItems(workspaceId),
            staleTime: 5 * 60 * 1000,
          });
          break;

        case Tab.Financials:
          // Prefetch financial data
          await queryClient.prefetchQuery({
            queryKey: ['financial-logs', workspaceId],
            queryFn: () => DatabaseService.getFinancialLogs(workspaceId),
            staleTime: 5 * 60 * 1000,
          });
          await queryClient.prefetchQuery({
            queryKey: ['expenses', workspaceId],
            queryFn: () => DatabaseService.getExpenses(workspaceId),
            staleTime: 5 * 60 * 1000,
          });
          break;

        case Tab.Calendar:
          // Prefetch tasks and CRM items for calendar
          await Promise.all([
            queryClient.prefetchQuery({
              queryKey: ['tasks', userId, workspaceId],
              queryFn: () => DatabaseService.getTasks(userId, workspaceId),
              staleTime: 5 * 60 * 1000,
            }),
            queryClient.prefetchQuery({
              queryKey: ['crm-items', workspaceId],
              queryFn: () => DatabaseService.getCrmItems(workspaceId),
              staleTime: 5 * 60 * 1000,
            }),
          ]);
          break;

        case Tab.Platform:
          // Prefetch platform tasks
          await queryClient.prefetchQuery({
            queryKey: ['tasks', userId, workspaceId],
            queryFn: () => DatabaseService.getTasks(userId, workspaceId),
            staleTime: 5 * 60 * 1000,
          });
          break;

        case Tab.Documents:
          // Prefetch documents
          await queryClient.prefetchQuery({
            queryKey: ['documents', workspaceId],
            queryFn: () => DatabaseService.getDocuments(workspaceId),
            staleTime: 5 * 60 * 1000,
          });
          break;

        case Tab.Settings:
          // Settings data is lightweight, no prefetch needed
          break;

        case Tab.Achievements:
          // Gamification data is already loaded in sidebar
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
