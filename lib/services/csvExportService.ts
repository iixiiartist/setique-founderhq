/**
 * CSV Export Service
 * 
 * Server-side CSV generation for large datasets
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { showSuccess, showError, showLoading, updateToast } from '../utils/toast';

export interface CsvExportOptions {
    type?: 'investor' | 'customer' | 'partner' | 'all';
    status?: string;
    priority?: string;
    search?: string;
    assignedTo?: string;
    includeContacts?: boolean;
    maxRows?: number;
}

/**
 * Export CRM items to CSV using server-side generation
 * Handles large datasets (50K+ records) efficiently
 */
export async function exportCrmItemsToCsv(
    workspaceId: string,
    options: CsvExportOptions = {}
): Promise<void> {
    const toastId = showLoading('Generating CSV export...');
    
    try {
        logger.info('[CsvExportService] Starting CSV export', { workspaceId, options });
        
        const { data, error } = await supabase.rpc('export_crm_items_csv', {
            p_workspace_id: workspaceId,
            p_type: options.type === 'all' ? null : options.type,
            p_status: options.status || null,
            p_priority: options.priority || null,
            p_search: options.search || null,
            p_assigned_to: options.assignedTo || null,
            p_include_contacts: options.includeContacts ?? true,
            p_max_rows: options.maxRows || 10000
        });

        if (error) {
            logger.error('[CsvExportService] Export failed', error);
            updateToast(toastId, 'Failed to generate CSV export', 'error');
            throw error;
        }

        if (!data) {
            updateToast(toastId, 'No data to export', 'error');
            return;
        }

        // Create blob and download
        const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const timestamp = new Date().toISOString().split('T')[0];
        const typeSuffix = options.type && options.type !== 'all' ? `_${options.type}` : '';
        link.download = `crm_export${typeSuffix}_${timestamp}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        updateToast(toastId, 'CSV exported successfully!', 'success');
        logger.info('[CsvExportService] Export completed successfully');
    } catch (error) {
        logger.error('[CsvExportService] Error exporting CSV', error);
        showError('Failed to export CSV');
        throw error;
    }
}

/**
 * Get estimated row count before export
 */
export async function getExportRowCount(
    workspaceId: string,
    options: CsvExportOptions = {}
): Promise<number> {
    try {
        let query = supabase
            .from('crm_items')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId);

        if (options.type && options.type !== 'all') {
            query = query.eq('type', options.type);
        }
        if (options.status) {
            query = query.eq('status', options.status);
        }
        if (options.priority) {
            query = query.eq('priority', options.priority);
        }
        if (options.assignedTo) {
            query = query.eq('assigned_to', options.assignedTo);
        }

        const { count, error } = await query;

        if (error) throw error;

        return count || 0;
    } catch (error) {
        logger.error('[CsvExportService] Error getting row count', error);
        return 0;
    }
}
