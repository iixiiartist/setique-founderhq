/**
 * Audit Log Service
 * 
 * Query audit logs for compliance and debugging
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { logger } from '../utils/logger';

export interface AuditLog {
    id: string;
    workspaceId: string;
    userId: string;
    entityType: string;
    entityId: string;
    action: 'create' | 'update' | 'delete' | 'restore';
    oldValues: any;
    newValues: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export interface AuditLogFilters {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
}

/**
 * Query keys for audit logs
 */
export const auditLogKeys = {
    all: ['auditLogs'] as const,
    lists: () => [...auditLogKeys.all, 'list'] as const,
    list: (workspaceId: string, filters: AuditLogFilters) => 
        [...auditLogKeys.lists(), workspaceId, filters] as const,
};

/**
 * Fetch audit logs with filters
 */
export async function fetchAuditLogs(
    workspaceId: string,
    filters: AuditLogFilters = {}
): Promise<AuditLog[]> {
    try {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(100); // Limit to recent 100 logs

        if (filters.entityType) {
            query = query.eq('entity_type', filters.entityType);
        }
        if (filters.entityId) {
            query = query.eq('entity_id', filters.entityId);
        }
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters.action) {
            query = query.eq('action', filters.action);
        }
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }

        const { data, error } = await query;

        if (error) {
            logger.error('[AuditLogService] Failed to fetch audit logs', error);
            throw error;
        }

        return data || [];
    } catch (error) {
        logger.error('[AuditLogService] Error fetching audit logs', error);
        throw error;
    }
}

/**
 * React Query hook for audit logs
 */
export function useAuditLogs(
    workspaceId: string | undefined,
    filters: AuditLogFilters = {}
) {
    return useQuery({
        queryKey: auditLogKeys.list(workspaceId || '', filters),
        queryFn: () => {
            if (!workspaceId) throw new Error('Workspace ID is required');
            return fetchAuditLogs(workspaceId, filters);
        },
        enabled: !!workspaceId,
        staleTime: 10000, // 10 seconds
    });
}

/**
 * Get audit logs for a specific CRM item
 */
export function useCrmItemAuditLogs(workspaceId: string | undefined, crmItemId: string | undefined) {
    return useAuditLogs(workspaceId, {
        entityType: 'crm_item',
        entityId: crmItemId,
    });
}
