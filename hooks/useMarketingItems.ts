/**
 * React Query hooks for marketing item operations
 * 
 * Provides query and mutation hooks for:
 * - Fetching marketing items
 * - Creating marketing items
 * - Updating marketing items
 * - Deleting marketing items
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataPersistenceAdapter } from '../lib/services/dataPersistenceAdapter';
import type { MarketingItem } from '../types';
import { showSuccess, showError } from '../lib/utils/toast';

// Query key factory for marketing items
export const marketingKeys = {
  all: ['marketing'] as const,
  lists: () => [...marketingKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...marketingKeys.lists(), workspaceId] as const,
  details: () => [...marketingKeys.all, 'detail'] as const,
  detail: (id: string) => [...marketingKeys.details(), id] as const,
};

interface UseMarketingItemsOptions {
  workspaceId: string;
  enabled?: boolean;
}

/**
 * Hook to fetch all marketing items for a workspace
 */
export function useMarketingItems({ workspaceId, enabled = true }: UseMarketingItemsOptions) {
  return useQuery<MarketingItem[], Error>({
    queryKey: marketingKeys.list(workspaceId),
    queryFn: async () => {
      // Marketing items are fetched as part of workspace data
      // This is a placeholder - in practice, items come from useWorkspaceData
      return [];
    },
    enabled: enabled && !!workspaceId,
  });
}

interface CreateMarketingItemParams {
  userId: string;
  workspaceId: string;
  title: string;
  type: MarketingItem['type'];
  status?: MarketingItem['status'];
  dueDate?: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
}

/**
 * Hook to create a new marketing item
 */
export function useCreateMarketingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateMarketingItemParams) => {
      const result = await DataPersistenceAdapter.createMarketingItem(
        params.userId,
        params.workspaceId,
        {
          title: params.title,
          type: params.type,
          status: params.status,
          dueDate: params.dueDate,
          assignedTo: params.assignedTo,
          assignedToName: params.assignedToName,
        }
      );

      if (result.error) {
        throw new Error(result.error.message || 'Failed to create marketing item');
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate workspace data to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      showSuccess('Marketing item created successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to create marketing item');
    },
  });
}

interface UpdateMarketingItemParams {
  itemId: string;
  updates: Partial<MarketingItem>;
  workspaceId?: string;
}

/**
 * Hook to update a marketing item
 */
export function useUpdateMarketingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateMarketingItemParams) => {
      const result = await DataPersistenceAdapter.updateMarketingItem(
        params.itemId,
        params.updates
      );

      if (result.error) {
        throw new Error(result.error.message || 'Failed to update marketing item');
      }

      return result.data;
    },
    onMutate: async (params) => {
      // Optimistic update
      if (params.workspaceId) {
        await queryClient.cancelQueries({ queryKey: ['workspace', params.workspaceId] });
        const previousData = queryClient.getQueryData(['workspace', params.workspaceId, 'data']);

        queryClient.setQueryData(['workspace', params.workspaceId, 'data'], (old: any) => {
          if (!old?.marketingItems) return old;
          return {
            ...old,
            marketingItems: old.marketingItems.map((item: MarketingItem) =>
              item.id === params.itemId ? { ...item, ...params.updates } : item
            ),
          };
        });

        return { previousData };
      }
    },
    onSuccess: (data, variables) => {
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      }
      showSuccess('Marketing item updated successfully');
    },
    onError: (error: Error, variables, context) => {
      if (variables.workspaceId && context?.previousData) {
        queryClient.setQueryData(['workspace', variables.workspaceId, 'data'], context.previousData);
      }
      showError(error.message || 'Failed to update marketing item');
    },
  });
}

interface DeleteMarketingItemParams {
  itemId: string;
  workspaceId?: string;
}

/**
 * Hook to delete a marketing item
 */
export function useDeleteMarketingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteMarketingItemParams) => {
      const result = await DataPersistenceAdapter.deleteMarketingItem(params.itemId);

      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete marketing item');
      }

      return params.itemId;
    },
    onMutate: async (params) => {
      // Optimistic delete
      if (params.workspaceId) {
        await queryClient.cancelQueries({ queryKey: ['workspace', params.workspaceId] });
        const previousData = queryClient.getQueryData(['workspace', params.workspaceId, 'data']);

        queryClient.setQueryData(['workspace', params.workspaceId, 'data'], (old: any) => {
          if (!old?.marketingItems) return old;
          return {
            ...old,
            marketingItems: old.marketingItems.filter((item: MarketingItem) => item.id !== params.itemId),
          };
        });

        return { previousData };
      }
    },
    onSuccess: (itemId, variables) => {
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      }
      showSuccess('Marketing item deleted successfully');
    },
    onError: (error: Error, variables, context) => {
      if (variables.workspaceId && context?.previousData) {
        queryClient.setQueryData(['workspace', variables.workspaceId, 'data'], context.previousData);
      }
      showError(error.message || 'Failed to delete marketing item');
    },
  });
}
