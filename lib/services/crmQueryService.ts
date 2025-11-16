/**
 * CRM Query Service
 * 
 * Provides React Query hooks for paginated, server-filtered CRM data.
 * Replaces client-side filtering with backend queries for scalability.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, QueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { CrmItem, CrmType } from '../../types';
import { logger } from '../logger';

export interface CrmQueryFilters {
    type?: CrmType | 'all';
    status?: string;
    priority?: string;
    search?: string;
    assignedTo?: string;
    sortBy?: 'company' | 'status' | 'priority' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
}

export interface CrmQueryOptions extends CrmQueryFilters {
    page?: number;
    pageSize?: number;
    includeContacts?: boolean;
    includeStats?: boolean;
}

export interface PaginationInfo {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface CrmAggregations {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    totalValue: number;
    withContacts: number;
    overdueCount: number;
}

export interface PaginatedCrmResponse {
    items: CrmItem[];
    pagination: PaginationInfo;
    aggregations?: CrmAggregations;
}

/**
 * Fetch paginated CRM items with server-side filtering and sorting
 */
export async function fetchCrmItems(
    workspaceId: string,
    options: CrmQueryOptions = {}
): Promise<PaginatedCrmResponse> {
    const {
        type = null,
        status = null,
        priority = null,
        search = null,
        assignedTo = null,
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        pageSize = 50,
        includeContacts = true,
        includeStats = false
    } = options;

    try {
        logger.debug('[CrmQueryService] Fetching CRM items', {
            workspaceId,
            page,
            pageSize,
            type,
            search
        });

        const { data, error } = await supabase.rpc('get_crm_items_paginated', {
            p_workspace_id: workspaceId,
            p_type: type === 'all' ? null : type,
            p_status: status,
            p_priority: priority,
            p_search: search,
            p_assigned_to: assignedTo,
            p_sort_by: sortBy,
            p_sort_order: sortOrder,
            p_page: page,
            p_page_size: pageSize,
            p_include_contacts: includeContacts,
            p_include_stats: includeStats
        });

        if (error) {
            logger.error('[CrmQueryService] RPC call failed', error);
            throw error;
        }

        if (!data) {
            logger.warn('[CrmQueryService] No data returned from RPC');
            return {
                items: [],
                pagination: {
                    page: 1,
                    pageSize,
                    totalItems: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: false
                }
            };
        }

        logger.info('[CrmQueryService] Successfully fetched CRM items', {
            itemCount: data.items?.length || 0,
            totalItems: data.pagination?.totalItems || 0
        });

        return data as PaginatedCrmResponse;
    } catch (error) {
        logger.error('[CrmQueryService] Error fetching CRM items', error);
        throw error;
    }
}

/**
 * Query key factory for consistent cache keys
 */
export const crmQueryKeys = {
    all: ['crm'] as const,
    lists: () => [...crmQueryKeys.all, 'list'] as const,
    list: (workspaceId: string, filters: CrmQueryFilters, page: number) => 
        [...crmQueryKeys.lists(), workspaceId, filters, page] as const,
    details: () => [...crmQueryKeys.all, 'detail'] as const,
    detail: (id: string) => [...crmQueryKeys.details(), id] as const,
    stats: (workspaceId: string, type?: CrmType | 'all') => 
        [...crmQueryKeys.all, 'stats', workspaceId, type] as const,
};

/**
 * Hook for paginated CRM items with React Query
 * 
 * Features:
 * - Server-side pagination
 * - Automatic caching (30s stale time)
 * - Keeps previous data while fetching new page
 * - Optimistic updates
 * 
 * @example
 * const { data, isLoading, error } = useCrmItems(workspaceId, {
 *   type: 'investor',
 *   page: 1,
 *   pageSize: 50,
 *   search: 'acme'
 * });
 */
export function useCrmItems(
    workspaceId: string | undefined,
    options: CrmQueryOptions = {},
    queryOptions?: Omit<UseQueryOptions<PaginatedCrmResponse, Error>, 'queryKey' | 'queryFn'>
) {
    const { page = 1, ...filters } = options;

    return useQuery<PaginatedCrmResponse, Error>({
        queryKey: crmQueryKeys.list(workspaceId || '', filters, page),
        queryFn: () => {
            if (!workspaceId) throw new Error('Workspace ID is required');
            return fetchCrmItems(workspaceId, options);
        },
        enabled: !!workspaceId,
        staleTime: 30000, // 30 seconds - data is considered fresh
        gcTime: 5 * 60 * 1000, // 5 minutes - cache time (renamed from cacheTime)
        placeholderData: (previousData) => previousData, // Keep old data while fetching (renamed from keepPreviousData)
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        ...queryOptions
    });
}

/**
 * Hook for CRM statistics (aggregations)
 * 
 * Fetches only aggregated data without items for dashboard widgets.
 */
export function useCrmStats(
    workspaceId: string | undefined,
    type?: CrmType | 'all'
) {
    return useQuery({
        queryKey: crmQueryKeys.stats(workspaceId || '', type),
        queryFn: async () => {
            if (!workspaceId) throw new Error('Workspace ID is required');
            
            const result = await fetchCrmItems(workspaceId, {
                type: type || 'all',
                page: 1,
                pageSize: 1, // We only need stats, not items
                includeContacts: false,
                includeStats: true
            });
            
            return result.aggregations;
        },
        enabled: !!workspaceId,
        staleTime: 60000, // 1 minute
        retry: 2
    });
}

/**
 * Prefetch next page for better UX
 * 
 * Call this when user is likely to navigate to next page
 * (e.g., hovering over "Next" button)
 */
export function usePrefetchNextPage(
    workspaceId: string | undefined,
    options: CrmQueryOptions
) {
    const queryClient = useQueryClient();
    const { page = 1, ...filters } = options;

    return () => {
        if (!workspaceId) return;
        
        queryClient.prefetchQuery({
            queryKey: crmQueryKeys.list(workspaceId, filters, page + 1),
            queryFn: () => fetchCrmItems(workspaceId, { ...options, page: page + 1 }),
            staleTime: 30000
        });
    };
}

/**
 * Mutation for creating CRM item
 * 
 * Automatically invalidates cache on success
 */
export function useCreateCrmItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (item: Partial<CrmItem> & { workspaceId: string }) => {
            logger.info('[CrmQueryService] Creating CRM item', { company: item.company });
            
            const { data, error } = await supabase
                .from('crm_items')
                .insert({
                    ...item,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                logger.error('[CrmQueryService] Failed to create CRM item', error);
                throw error;
            }
            
            logger.info('[CrmQueryService] CRM item created successfully', { id: data.id });
            return data;
        },
        onSuccess: () => {
            // Invalidate all CRM queries to refetch
            queryClient.invalidateQueries({ queryKey: crmQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: crmQueryKeys.all });
        },
        onError: (error) => {
            logger.error('[CrmQueryService] Create mutation failed', error);
        }
    });
}

/**
 * Mutation for updating CRM item with optimistic updates
 * 
 * Features:
 * - Optimistic UI updates
 * - Automatic rollback on error
 * - Cache invalidation on success
 */
export function useUpdateCrmItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<CrmItem> }) => {
            logger.info('[CrmQueryService] Updating CRM item', { id, updates });
            
            const { data, error } = await supabase
                .from('crm_items')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                logger.error('[CrmQueryService] Failed to update CRM item', error);
                throw error;
            }
            
            logger.info('[CrmQueryService] CRM item updated successfully', { id: data.id });
            return data;
        },
        onMutate: async ({ id, updates }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: crmQueryKeys.lists() });

            // Snapshot previous value
            const previousData = queryClient.getQueriesData({ queryKey: crmQueryKeys.lists() });

            // Optimistically update cache
            queryClient.setQueriesData(
                { queryKey: crmQueryKeys.lists() },
                (old: PaginatedCrmResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        items: old.items.map(item =>
                            item.id === id ? { ...item, ...updates } : item
                        ),
                    };
                }
            );

            return { previousData };
        },
        onError: (err, variables, context) => {
            logger.error('[CrmQueryService] Update mutation failed, rolling back', err);
            
            // Rollback on error
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: crmQueryKeys.lists() });
        },
    });
}

/**
 * Mutation for deleting CRM item
 */
export function useDeleteCrmItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            logger.info('[CrmQueryService] Deleting CRM item', { id });
            
            // Soft delete by setting deleted_at
            const { error } = await supabase
                .from('crm_items')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                logger.error('[CrmQueryService] Failed to delete CRM item', error);
                throw error;
            }
            
            logger.info('[CrmQueryService] CRM item deleted successfully', { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: crmQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: crmQueryKeys.all });
        },
        onError: (error) => {
            logger.error('[CrmQueryService] Delete mutation failed', error);
        }
    });
}

/**
 * Invalidate all CRM cache
 * 
 * Useful after bulk operations or external updates
 */
export function invalidateCrmCache(queryClient: QueryClient) {
    logger.info('[CrmQueryService] Invalidating all CRM cache');
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.all });
}
