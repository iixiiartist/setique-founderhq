/**
 * React Query hooks for CRM item operations
 * 
 * Provides query and mutation hooks for:
 * - Fetching CRM items (investors, customers, partners)
 * - Creating CRM items
 * - Updating CRM items
 * - Deleting CRM items
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataPersistenceAdapter } from '../lib/services/dataPersistenceAdapter';
import type { AnyCrmItem, CrmCollectionName, Priority } from '../types';

// Query key factory for CRM items
export const crmKeys = {
  all: ['crm'] as const,
  lists: () => [...crmKeys.all, 'list'] as const,
  list: (workspaceId: string, collection?: CrmCollectionName) => {
    const key = [...crmKeys.lists(), workspaceId];
    if (collection) key.push(collection);
    return key;
  },
  details: () => [...crmKeys.all, 'detail'] as const,
  detail: (id: string) => [...crmKeys.details(), id] as const,
};

interface UseCrmItemsOptions {
  workspaceId: string;
  collection?: CrmCollectionName;
  enabled?: boolean;
}

/**
 * Hook to fetch CRM items for a workspace
 */
export function useCrmItems({ workspaceId, collection, enabled = true }: UseCrmItemsOptions) {
  return useQuery<AnyCrmItem[], Error>({
    queryKey: crmKeys.list(workspaceId, collection),
    queryFn: async () => {
      // CRM items are fetched as part of workspace data
      // This is a placeholder - in practice, items come from useWorkspaceData
      return [];
    },
    enabled: enabled && !!workspaceId,
  });
}

interface CreateCrmItemParams {
  userId: string;
  workspaceId: string;
  collection: CrmCollectionName;
  company: string;
  priority: Priority;
  status: string;
  nextAction?: string;
  nextActionDate?: string;
  checkSize?: number;
  dealValue?: number;
  opportunity?: string;
}

/**
 * Hook to create a new CRM item
 */
export function useCreateCrmItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCrmItemParams) => {
      const result = await DataPersistenceAdapter.createCrmItem(
        params.userId,
        params.workspaceId,
        params.collection,
        {
          company: params.company,
          priority: params.priority,
          status: params.status,
          nextAction: params.nextAction,
          nextActionDate: params.nextActionDate,
          checkSize: params.checkSize,
          dealValue: params.dealValue,
          opportunity: params.opportunity,
        }
      );

      if (result.error) {
        throw new Error(result.error.message || 'Failed to create CRM item');
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate workspace data to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
    },
  });
}

interface UpdateCrmItemParams {
  itemId: string;
  updates: Partial<AnyCrmItem>;
  workspaceId?: string;
}

/**
 * Hook to update a CRM item
 */
export function useUpdateCrmItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateCrmItemParams) => {
      const result = await DataPersistenceAdapter.updateCrmItem(
        params.itemId,
        params.updates
      );

      if (result.error) {
        throw new Error(result.error.message || 'Failed to update CRM item');
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate workspace data to trigger refetch
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      }
    },
  });
}

interface DeleteCrmItemParams {
  itemId: string;
  workspaceId?: string;
}

/**
 * Hook to delete a CRM item
 */
export function useDeleteCrmItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteCrmItemParams) => {
      const result = await DataPersistenceAdapter.deleteCrmItem(params.itemId);

      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete CRM item');
      }

      return params.itemId;
    },
    onSuccess: (itemId, variables) => {
      // Invalidate workspace data to trigger refetch
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      }
    },
  });
}
