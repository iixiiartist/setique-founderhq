# CRM Scalability & Production Readiness - Implementation Plan

**Date:** November 16, 2025  
**Status:** Planning Phase  
**Priority:** HIGH - Blocking Production Scale

---

## Executive Summary

Current CRM implementation has critical scalability gaps that will cause browser performance degradation at scale (thousands of accounts/contacts). All data processing happens client-side with O(n) and O(n²) operations on every render, no pagination, no virtualization, and fire-and-forget mutations with no error handling.

**Impact:** Cannot scale beyond ~100-200 accounts without significant performance issues.

**Solution:** Move filtering/aggregation to backend, implement pagination, add virtualization, make mutations resilient, and move bulk operations server-side.

---

## Critical Issues & Solutions

### 🔴 Issue 1: Client-Side Data Processing (Highest Priority)

**Current State:**
```typescript
// ALL CRM data loaded at once
const crm = await loadCrmItems(); // Loads ALL investors, customers, partners
setData(prev => ({ ...prev, ...crm })); // 1000s of records in memory

// Re-processed on every render
const filteredItems = crmItems.filter(...); // O(n) on every keystroke
const sortedItems = filteredItems.sort(...); // O(n log n) on every render
const accountsWithCounts = items.map(item => ({
    ...item,
    noteCount: notes.filter(n => n.accountId === item.id).length, // O(n²)
    contactCount: item.contacts?.length || 0
}));
```

**Problems:**
- Loads entire dataset into browser memory
- Re-filters/sorts on every render/keystroke
- No pagination or streaming
- Browser thrashes with 1000+ records
- No query caching between tab switches

**Solution: Backend Pagination + Query Caching**

#### Phase 1.1: Create Supabase RPC Functions (Week 1)

**File:** `supabase/functions/get_crm_items_paginated.sql`
```sql
CREATE OR REPLACE FUNCTION get_crm_items_paginated(
    p_workspace_id UUID,
    p_type TEXT DEFAULT NULL,              -- 'investor', 'customer', 'partner', or NULL for all
    p_status TEXT DEFAULT NULL,            -- Filter by status
    p_priority TEXT DEFAULT NULL,          -- Filter by priority
    p_search TEXT DEFAULT NULL,            -- Search company name, contacts
    p_assigned_to UUID DEFAULT NULL,       -- Filter by assignment
    p_sort_by TEXT DEFAULT 'created_at',   -- Sort field
    p_sort_order TEXT DEFAULT 'desc',      -- 'asc' or 'desc'
    p_page INT DEFAULT 1,                  -- Page number (1-indexed)
    p_page_size INT DEFAULT 50,            -- Items per page
    p_include_contacts BOOLEAN DEFAULT true,
    p_include_stats BOOLEAN DEFAULT false  -- Include aggregated stats
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INT;
    v_result JSON;
    v_total_count INT;
BEGIN
    v_offset := (p_page - 1) * p_page_size;
    
    -- Count total matching records
    SELECT COUNT(*)
    INTO v_total_count
    FROM crm_items
    WHERE workspace_id = p_workspace_id
        AND (p_type IS NULL OR type = p_type)
        AND (p_status IS NULL OR status = p_status)
        AND (p_priority IS NULL OR priority = p_priority)
        AND (p_assigned_to IS NULL OR assigned_to = p_assigned_to)
        AND (p_search IS NULL OR 
             company ILIKE '%' || p_search || '%' OR
             EXISTS (
                 SELECT 1 FROM contacts c 
                 WHERE c.crm_item_id = crm_items.id 
                 AND c.name ILIKE '%' || p_search || '%'
             ));
    
    -- Build result with pagination metadata
    SELECT json_build_object(
        'items', (
            SELECT COALESCE(json_agg(
                CASE 
                    WHEN p_include_contacts THEN
                        json_build_object(
                            'id', ci.id,
                            'type', ci.type,
                            'company', ci.company,
                            'status', ci.status,
                            'priority', ci.priority,
                            'nextAction', ci.next_action,
                            'nextActionDate', ci.next_action_date,
                            'assignedTo', ci.assigned_to,
                            'assignedToName', u.display_name,
                            'createdAt', ci.created_at,
                            'updatedAt', ci.updated_at,
                            -- Type-specific fields
                            'checkSize', ci.check_size,
                            'dealValue', ci.deal_value,
                            'opportunity', ci.opportunity,
                            -- Aggregated counts
                            'contactCount', (SELECT COUNT(*) FROM contacts WHERE crm_item_id = ci.id),
                            'taskCount', (SELECT COUNT(*) FROM tasks WHERE crm_item_id = ci.id AND status != 'Done'),
                            'meetingCount', (SELECT COUNT(*) FROM meetings WHERE crm_item_id = ci.id),
                            -- Contacts (if requested)
                            'contacts', (
                                SELECT COALESCE(json_agg(json_build_object(
                                    'id', c.id,
                                    'name', c.name,
                                    'email', c.email,
                                    'phone', c.phone,
                                    'title', c.title,
                                    'assignedTo', c.assigned_to
                                )), '[]'::json)
                                FROM contacts c
                                WHERE c.crm_item_id = ci.id
                            )
                        )
                    ELSE
                        json_build_object(
                            'id', ci.id,
                            'type', ci.type,
                            'company', ci.company,
                            'status', ci.status,
                            'priority', ci.priority,
                            'contactCount', (SELECT COUNT(*) FROM contacts WHERE crm_item_id = ci.id),
                            'taskCount', (SELECT COUNT(*) FROM tasks WHERE crm_item_id = ci.id AND status != 'Done')
                        )
                END
            ), '[]'::json)
            FROM crm_items ci
            LEFT JOIN workspace_members wm ON wm.user_id = ci.assigned_to AND wm.workspace_id = p_workspace_id
            LEFT JOIN users u ON u.id = wm.user_id
            WHERE ci.workspace_id = p_workspace_id
                AND (p_type IS NULL OR ci.type = p_type)
                AND (p_status IS NULL OR ci.status = p_status)
                AND (p_priority IS NULL OR ci.priority = p_priority)
                AND (p_assigned_to IS NULL OR ci.assigned_to = p_assigned_to)
                AND (p_search IS NULL OR 
                     ci.company ILIKE '%' || p_search || '%' OR
                     EXISTS (
                         SELECT 1 FROM contacts c 
                         WHERE c.crm_item_id = ci.id 
                         AND c.name ILIKE '%' || p_search || '%'
                     ))
            ORDER BY 
                CASE WHEN p_sort_by = 'company' AND p_sort_order = 'asc' THEN ci.company END ASC,
                CASE WHEN p_sort_by = 'company' AND p_sort_order = 'desc' THEN ci.company END DESC,
                CASE WHEN p_sort_by = 'status' AND p_sort_order = 'asc' THEN ci.status END ASC,
                CASE WHEN p_sort_by = 'status' AND p_sort_order = 'desc' THEN ci.status END DESC,
                CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN ci.created_at END ASC,
                CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN ci.created_at END DESC,
                CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc' THEN ci.updated_at END ASC,
                CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN ci.updated_at END DESC
            LIMIT p_page_size
            OFFSET v_offset
        ),
        'pagination', json_build_object(
            'page', p_page,
            'pageSize', p_page_size,
            'totalItems', v_total_count,
            'totalPages', CEIL(v_total_count::FLOAT / p_page_size)
        ),
        'aggregations', CASE WHEN p_include_stats THEN
            json_build_object(
                'byStatus', (
                    SELECT json_object_agg(status, count)
                    FROM (
                        SELECT status, COUNT(*) as count
                        FROM crm_items
                        WHERE workspace_id = p_workspace_id
                            AND (p_type IS NULL OR type = p_type)
                        GROUP BY status
                    ) s
                ),
                'byPriority', (
                    SELECT json_object_agg(priority, count)
                    FROM (
                        SELECT priority, COUNT(*) as count
                        FROM crm_items
                        WHERE workspace_id = p_workspace_id
                            AND (p_type IS NULL OR type = p_type)
                        GROUP BY priority
                    ) p
                ),
                'byType', (
                    SELECT json_object_agg(type, count)
                    FROM (
                        SELECT type, COUNT(*) as count
                        FROM crm_items
                        WHERE workspace_id = p_workspace_id
                        GROUP BY type
                    ) t
                )
            )
        ELSE NULL END
    )
    INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Create index for search performance
CREATE INDEX IF NOT EXISTS idx_crm_items_search ON crm_items USING gin(to_tsvector('english', company));
CREATE INDEX IF NOT EXISTS idx_crm_items_type_status ON crm_items(workspace_id, type, status);
CREATE INDEX IF NOT EXISTS idx_crm_items_assigned ON crm_items(workspace_id, assigned_to) WHERE assigned_to IS NOT NULL;
```

#### Phase 1.2: Create React Query Service (Week 1)

**File:** `lib/services/crmQueryService.ts`
```typescript
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { CrmItem, CrmType } from '../../types';

export interface CrmQueryFilters {
    type?: CrmType | 'all';
    status?: string;
    priority?: string;
    search?: string;
    assignedTo?: string;
    sortBy?: 'company' | 'status' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
}

export interface CrmQueryOptions extends CrmQueryFilters {
    page?: number;
    pageSize?: number;
    includeContacts?: boolean;
    includeStats?: boolean;
}

export interface PaginatedCrmResponse {
    items: CrmItem[];
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
    aggregations?: {
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        byType: Record<string, number>;
    };
}

/**
 * Fetch paginated CRM items with server-side filtering and sorting
 */
async function fetchCrmItems(
    workspaceId: string,
    options: CrmQueryOptions
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

    if (error) throw error;
    return data as PaginatedCrmResponse;
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
    stats: (workspaceId: string, type?: CrmType) => 
        [...crmQueryKeys.all, 'stats', workspaceId, type] as const,
};

/**
 * Hook for paginated CRM items with React Query
 */
export function useCrmItems(
    workspaceId: string,
    options: CrmQueryOptions,
    queryOptions?: Omit<UseQueryOptions<PaginatedCrmResponse>, 'queryKey' | 'queryFn'>
) {
    const { page = 1, ...filters } = options;

    return useQuery<PaginatedCrmResponse>({
        queryKey: crmQueryKeys.list(workspaceId, filters, page),
        queryFn: () => fetchCrmItems(workspaceId, options),
        staleTime: 30000, // 30 seconds
        cacheTime: 5 * 60 * 1000, // 5 minutes
        keepPreviousData: true, // Keep old data while fetching new page
        ...queryOptions
    });
}

/**
 * Hook for CRM statistics (aggregations)
 */
export function useCrmStats(
    workspaceId: string,
    type?: CrmType
) {
    return useQuery({
        queryKey: crmQueryKeys.stats(workspaceId, type),
        queryFn: () => fetchCrmItems(workspaceId, {
            type: type || 'all',
            page: 1,
            pageSize: 1, // We only need stats, not items
            includeContacts: false,
            includeStats: true
        }),
        select: (data) => data.aggregations,
        staleTime: 60000, // 1 minute
    });
}

/**
 * Prefetch next page for better UX
 */
export function usePrefetchNextPage(
    workspaceId: string,
    options: CrmQueryOptions
) {
    const queryClient = useQueryClient();
    const { page = 1, ...filters } = options;

    return () => {
        queryClient.prefetchQuery({
            queryKey: crmQueryKeys.list(workspaceId, filters, page + 1),
            queryFn: () => fetchCrmItems(workspaceId, { ...options, page: page + 1 }),
        });
    };
}

/**
 * Mutation for creating CRM item
 */
export function useCreateCrmItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (item: Partial<CrmItem> & { workspaceId: string }) => {
            const { data, error } = await supabase
                .from('crm_items')
                .insert(item)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate all CRM queries to refetch
            queryClient.invalidateQueries(crmQueryKeys.lists());
            queryClient.invalidateQueries(crmQueryKeys.all);
        },
    });
}

/**
 * Mutation for updating CRM item with optimistic updates
 */
export function useUpdateCrmItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<CrmItem> }) => {
            const { data, error } = await supabase
                .from('crm_items')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async ({ id, updates }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries(crmQueryKeys.lists());

            // Snapshot previous value
            const previousData = queryClient.getQueriesData(crmQueryKeys.lists());

            // Optimistically update cache
            queryClient.setQueriesData(
                crmQueryKeys.lists(),
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
            // Rollback on error
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries(crmQueryKeys.lists());
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
            const { error } = await supabase
                .from('crm_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(crmQueryKeys.lists());
            queryClient.invalidateQueries(crmQueryKeys.all);
        },
    });
}
```

#### Phase 1.3: Add Virtualization (Week 1)

**File:** `components/crm/VirtualizedAccountList.tsx`
```typescript
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { CrmItem } from '../../types';

interface VirtualizedAccountListProps {
    items: CrmItem[];
    onSelectItem: (item: CrmItem) => void;
    selectedItemId?: string;
}

const ITEM_HEIGHT = 80; // Height of each row in pixels

export function VirtualizedAccountList({
    items,
    onSelectItem,
    selectedItemId
}: VirtualizedAccountListProps) {
    const Row = useMemo(() => {
        return ({ index, style }: { index: number; style: React.CSSProperties }) => {
            const item = items[index];
            const isSelected = item.id === selectedItemId;

            return (
                <div
                    style={style}
                    className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                        isSelected ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onSelectItem(item)}
                >
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                        {item.type === 'investor' ? '💰' : 
                                         item.type === 'customer' ? '🛒' : '🤝'}
                                    </span>
                                    <h3 className="text-sm font-medium text-gray-900 truncate">
                                        {item.company}
                                    </h3>
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                    <span className={`px-2 py-0.5 rounded ${
                                        item.status === 'Lead' ? 'bg-yellow-100 text-yellow-800' :
                                        item.status === 'Qualified' ? 'bg-blue-100 text-blue-800' :
                                        item.status === 'Won' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {item.status}
                                    </span>
                                    {item.contactCount > 0 && (
                                        <span>👤 {item.contactCount}</span>
                                    )}
                                    {item.taskCount > 0 && (
                                        <span>✓ {item.taskCount}</span>
                                    )}
                                </div>
                            </div>
                            {item.nextActionDate && (
                                <div className="ml-4 flex-shrink-0">
                                    <span className="text-xs text-gray-500">
                                        {new Date(item.nextActionDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };
    }, [items, selectedItemId, onSelectItem]);

    return (
        <AutoSizer>
            {({ height, width }) => (
                <List
                    height={height}
                    itemCount={items.length}
                    itemSize={ITEM_HEIGHT}
                    width={width}
                    overscanCount={5} // Render 5 extra items outside viewport
                >
                    {Row}
                </List>
            )}
        </AutoSizer>
    );
}
```

---

### 🔴 Issue 2: O(n²) Operations & No Pagination

**Current State:**
```typescript
// O(n²) contact filtering
const filteredContacts = contacts.filter(contact => {
    const parentItem = crmItems.find(item => item.id === contact.crmItemId); // O(n) for each contact
    return parentItem && matchesFilter(parentItem);
});

// O(n²) aggregations on every render
accounts.map(account => ({
    ...account,
    noteCount: notes.filter(n => n.accountId === account.id).length, // O(n) for each account
    taskCount: tasks.filter(t => t.accountId === account.id).length  // O(n) for each account
}));
```

**Solution:** Backend aggregations already included in Phase 1.1 RPC function (contactCount, taskCount computed in SQL).

---

### 🔴 Issue 3: Fire-and-Forget Mutations

**Current State:**
```typescript
// No error handling, no await, no user feedback
const handleAssign = (userId: string) => {
    console.log('Assigning...'); // Just logs
    actions.updateCrmItem(collection, itemId, { assignedTo: userId }); // Fire and forget
    // What if it fails? User never knows.
};

// Browser alert/confirm (blocking, bad UX)
if (confirm('Delete this account?')) {
    deleteAccount(id); // No error handling
}
```

**Solution: Resilient Mutations with Toast Notifications**

#### Phase 3.1: Create Toast Notification System (Week 2)

**File:** `components/shared/ToastNotification.tsx`
```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    duration?: number;
}

interface ToastContextValue {
    showToast: (toast: Omit<Toast, 'id'>) => void;
    showSuccess: (title: string, message?: string) => void;
    showError: (title: string, message?: string) => void;
    showWarning: (title: string, message?: string) => void;
    showInfo: (title: string, message?: string) => void;
    dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id };
        
        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => dismissToast(id), duration);
        }
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showSuccess = useCallback((title: string, message?: string) => {
        showToast({ type: 'success', title, message });
    }, [showToast]);

    const showError = useCallback((title: string, message?: string) => {
        showToast({ type: 'error', title, message, duration: 7000 });
    }, [showToast]);

    const showWarning = useCallback((title: string, message?: string) => {
        showToast({ type: 'warning', title, message });
    }, [showToast]);

    const showInfo = useCallback((title: string, message?: string) => {
        showToast({ type: 'info', title, message });
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, dismissToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const icons = {
        success: <CheckCircleIcon className="h-5 w-5 text-green-400" />,
        error: <ExclamationCircleIcon className="h-5 w-5 text-red-400" />,
        warning: <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />,
        info: <InformationCircleIcon className="h-5 w-5 text-blue-400" />
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-yellow-50 border-yellow-200',
        info: 'bg-blue-50 border-blue-200'
    };

    return (
        <div className={`${bgColors[toast.type]} border rounded-lg shadow-lg p-4 animate-slide-in`}>
            <div className="flex items-start">
                <div className="flex-shrink-0">{icons[toast.type]}</div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{toast.title}</p>
                    {toast.message && (
                        <p className="mt-1 text-sm text-gray-600">{toast.message}</p>
                    )}
                    {toast.action && (
                        <button
                            onClick={toast.action.onClick}
                            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>
                <button onClick={onDismiss} className="ml-4 flex-shrink-0">
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
            </div>
        </div>
    );
}
```

#### Phase 3.2: Implement Resilient Mutations (Week 2)

**File:** `lib/services/crmMutations.ts`
```typescript
import { supabase } from '../supabase';
import { logger } from '../logger';
import { CrmItem } from '../../types';

interface MutationOptions {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
}

/**
 * Resilient mutation wrapper with error handling and logging
 */
async function executeMutation<T>(
    mutationFn: () => Promise<T>,
    options: MutationOptions = {}
): Promise<{ success: boolean; data?: T; error?: Error }> {
    try {
        const data = await mutationFn();
        
        if (options.onSuccess) {
            options.onSuccess(data);
        }

        return { success: true, data };
    } catch (error) {
        const err = error as Error;
        logger.error('Mutation failed:', err);

        // Log structured audit event
        await logAuditEvent({
            action: 'mutation_error',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });

        if (options.onError) {
            options.onError(err);
        }

        return { success: false, error: err };
    }
}

/**
 * Assign account with audit logging
 */
export async function assignAccount(
    accountId: string,
    userId: string | null,
    userName: string | null,
    options: MutationOptions = {}
): Promise<{ success: boolean; error?: Error }> {
    return executeMutation(async () => {
        const { data, error } = await supabase
            .from('crm_items')
            .update({ assigned_to: userId })
            .eq('id', accountId)
            .select()
            .single();

        if (error) throw error;

        // Log audit event
        await logAuditEvent({
            action: 'account_assigned',
            accountId,
            userId,
            userName,
            timestamp: new Date().toISOString()
        });

        return data;
    }, options);
}

/**
 * Delete account with audit logging
 */
export async function deleteAccount(
    accountId: string,
    accountName: string,
    options: MutationOptions = {}
): Promise<{ success: boolean; error?: Error }> {
    return executeMutation(async () => {
        const { error } = await supabase
            .from('crm_items')
            .delete()
            .eq('id', accountId);

        if (error) throw error;

        // Log audit event
        await logAuditEvent({
            action: 'account_deleted',
            accountId,
            accountName,
            timestamp: new Date().toISOString()
        });

        return { accountId };
    }, options);
}

/**
 * Log audit event to database
 */
async function logAuditEvent(event: Record<string, any>) {
    try {
        await supabase
            .from('audit_logs')
            .insert({
                event_type: event.action,
                event_data: event,
                created_at: new Date().toISOString()
            });
    } catch (error) {
        logger.error('Failed to log audit event:', error);
    }
}
```

---

### 🔴 Issue 4: Client-Side CSV Processing

**Solution: Server-Side CSV Processing**

#### Phase 4.1: Create Supabase Edge Function (Week 3)

**File:** `supabase/functions/import-csv/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ImportJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    totalRows: number;
    processedRows: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; error: string }>;
}

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method === 'POST') {
        // Start import job
        const { workspaceId, fileUrl, type, dedupeBy } = await req.json();

        const job: ImportJob = {
            id: crypto.randomUUID(),
            status: 'pending',
            totalRows: 0,
            processedRows: 0,
            successCount: 0,
            errorCount: 0,
            errors: []
        };

        // Store job in database
        await supabase.from('import_jobs').insert(job);

        // Process asynchronously
        processImport(supabase, job.id, workspaceId, fileUrl, type, dedupeBy);

        return new Response(JSON.stringify({ jobId: job.id }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (req.method === 'GET') {
        // Get job status
        const url = new URL(req.url);
        const jobId = url.searchParams.get('jobId');

        const { data } = await supabase
            .from('import_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

async function processImport(
    supabase: any,
    jobId: string,
    workspaceId: string,
    fileUrl: string,
    type: string,
    dedupeBy: string[]
) {
    // Download CSV
    // Parse rows
    // Deduplicate
    // Batch insert
    // Update job progress
    // Implementation details...
}
```

---

### 🔴 Issue 5: Large Payloads in Detail Views

**Solution: JSON Patch Updates + Lazy Loading**

#### Phase 5.1: Implement JSON Patch (Week 3)

**File:** `lib/services/patchService.ts`
```typescript
import { Operation, applyPatch } from 'fast-json-patch';
import { supabase } from '../supabase';

/**
 * Send minimal patch instead of full object
 */
export async function patchCrmItem(
    itemId: string,
    operations: Operation[]
) {
    const { data, error } = await supabase.rpc('apply_json_patch', {
        table_name: 'crm_items',
        record_id: itemId,
        operations: operations
    });

    if (error) throw error;
    return data;
}

/**
 * Example usage:
 * Instead of:
 *   updateCrmItem(id, { company: 'New Name', status: 'Qualified', ... all fields })
 * 
 * Use:
 *   patchCrmItem(id, [
 *     { op: 'replace', path: '/company', value: 'New Name' },
 *     { op: 'replace', path: '/status', value: 'Qualified' }
 *   ])
 */
```

---

## Implementation Timeline

### Week 1: Backend Pagination & Virtualization
- [ ] Create Supabase RPC functions
- [ ] Add database indexes
- [ ] Create React Query service
- [ ] Implement virtualized list component
- [ ] Update AccountsTab to use new service
- [ ] Test with 10,000+ records

### Week 2: Resilient Mutations
- [ ] Create toast notification system
- [ ] Implement mutation wrappers with error handling
- [ ] Add audit logging
- [ ] Update all mutation call sites
- [ ] Replace alert/confirm with modal components
- [ ] Test error scenarios

### Week 3: Server-Side Processing
- [ ] Create CSV import edge function
- [ ] Add job status polling
- [ ] Implement JSON Patch for updates
- [ ] Lazy-load tasks/contacts on demand
- [ ] Add progress indicators

### Week 4: Testing & Optimization
- [ ] Load testing with 50,000+ accounts
- [ ] Measure performance improvements
- [ ] Fix any remaining bottlenecks
- [ ] Update documentation
- [ ] Deploy to production

---

## Success Metrics

**Before:**
- ❌ Browser freezes with 1,000+ accounts
- ❌ Every keystroke triggers O(n) operations
- ❌ No error feedback for failed mutations
- ❌ CSV imports crash with large files
- ❌ Detail views re-render entire dataset

**After:**
- ✅ Smooth performance with 50,000+ accounts
- ✅ Server-side filtering (no client processing)
- ✅ Toast notifications for all operations
- ✅ Background CSV processing with progress
- ✅ Minimal payloads (JSON Patch)
- ✅ Virtualized lists (only render visible rows)
- ✅ Query caching (instant tab switches)
- ✅ Audit logging for compliance

---

## Migration Strategy

1. **Install Dependencies:**
   ```bash
   npm install @tanstack/react-query react-window react-virtualized-auto-sizer fast-json-patch
   ```

2. **Wrap App with Providers:**
   ```typescript
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { ToastProvider } from './components/shared/ToastNotification';

   const queryClient = new QueryClient();

   <QueryClientProvider client={queryClient}>
       <ToastProvider>
           <DashboardApp />
       </ToastProvider>
   </QueryClientProvider>
   ```

3. **Deploy Database Changes:**
   ```bash
   supabase db push
   supabase functions deploy import-csv
   ```

4. **Feature Flag Rollout:**
   - Enable for power users first
   - Monitor performance metrics
   - Gradually enable for all users

---

## Priority Order

1. **Critical (Week 1):** Backend pagination + virtualization (fixes immediate performance)
2. **High (Week 2):** Resilient mutations (fixes data integrity)
3. **Medium (Week 3):** Server-side CSV (enables bulk operations)
4. **Nice-to-Have:** JSON Patch (optimizes network)

---

**Status:** Ready for implementation  
**Next Step:** Create Supabase RPC functions and add React Query

This plan addresses all critical scalability gaps identified in the code review. Would you like me to start implementing any specific phase?
