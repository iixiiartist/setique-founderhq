/**
 * Load Testing Utilities
 * 
 * Generate test data and measure performance under load
 */

import { supabase } from '../supabase';
import { logger } from '../logger';
import { performanceMonitor } from './performanceMonitor';

export interface LoadTestConfig {
    numItems: number;
    batchSize?: number;
    delay?: number;
}

export interface LoadTestResult {
    success: boolean;
    itemsCreated: number;
    duration: number;
    avgItemTime: number;
    errors: string[];
}

/**
 * Generate realistic test CRM item
 */
function generateTestItem(workspaceId: string, userId: string, index: number) {
    const types = ['investor', 'customer', 'partner'] as const;
    const statuses = ['Active', 'Prospecting', 'Closed', 'On Hold'];
    const priorities = ['Low', 'Medium', 'High'];
    const industries = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing'];
    
    const type = types[index % types.length];
    
    return {
        workspace_id: workspaceId,
        user_id: userId,
        company: `Test Company ${index + 1}`,
        type,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        industry: industries[Math.floor(Math.random() * industries.length)],
        website: `https://testcompany${index + 1}.com`,
        description: `Generated test data for load testing. Index: ${index}`,
        check_size: type === 'investor' ? Math.floor(Math.random() * 1000000) : null,
        deal_value: type === 'customer' ? Math.floor(Math.random() * 500000) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

/**
 * Create test data for load testing
 */
export async function createTestData(
    workspaceId: string,
    userId: string,
    config: LoadTestConfig
): Promise<LoadTestResult> {
    const { numItems, batchSize = 100, delay = 0 } = config;
    const errors: string[] = [];
    let itemsCreated = 0;
    
    logger.info('[LoadTest] Starting test data generation', { numItems, batchSize });
    
    const startTime = performance.now();
    
    try {
        const batches = Math.ceil(numItems / batchSize);
        
        for (let batch = 0; batch < batches; batch++) {
            const startIdx = batch * batchSize;
            const endIdx = Math.min(startIdx + batchSize, numItems);
            const items = [];
            
            for (let i = startIdx; i < endIdx; i++) {
                items.push(generateTestItem(workspaceId, userId, i));
            }
            
            const { data, error } = await performanceMonitor.measure(
                'load_test_insert',
                async () => supabase.from('crm_items').insert(items).select(),
                { batchSize: items.length, batch: batch + 1 }
            );
            
            if (error) {
                errors.push(`Batch ${batch + 1}: ${error.message}`);
                logger.error('[LoadTest] Batch insert failed', { batch, error });
            } else {
                itemsCreated += data?.length || 0;
            }
            
            if (delay > 0 && batch < batches - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        const duration = performance.now() - startTime;
        const avgItemTime = duration / itemsCreated;
        
        logger.info('[LoadTest] Test data generation complete', {
            itemsCreated,
            duration: `${duration.toFixed(2)}ms`,
            avgItemTime: `${avgItemTime.toFixed(2)}ms`
        });
        
        return {
            success: errors.length === 0,
            itemsCreated,
            duration,
            avgItemTime,
            errors
        };
    } catch (error) {
        logger.error('[LoadTest] Test data generation failed', error);
        return {
            success: false,
            itemsCreated,
            duration: performance.now() - startTime,
            avgItemTime: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error']
        };
    }
}

/**
 * Clean up test data
 */
export async function cleanupTestData(workspaceId: string): Promise<number> {
    logger.info('[LoadTest] Cleaning up test data', { workspaceId });
    
    const { data, error } = await supabase
        .from('crm_items')
        .delete()
        .eq('workspace_id', workspaceId)
        .like('company', 'Test Company %')
        .select();
    
    if (error) {
        logger.error('[LoadTest] Cleanup failed', error);
        return 0;
    }
    
    const deletedCount = data?.length || 0;
    logger.info('[LoadTest] Cleanup complete', { deletedCount });
    
    return deletedCount;
}

/**
 * Run pagination performance test
 */
export async function testPaginationPerformance(
    workspaceId: string,
    pages: number = 10
): Promise<{
    avgLoadTime: number;
    minLoadTime: number;
    maxLoadTime: number;
    results: Array<{ page: number; duration: number }>;
}> {
    logger.info('[LoadTest] Testing pagination performance', { pages });
    
    const results: Array<{ page: number; duration: number }> = [];
    
    for (let page = 1; page <= pages; page++) {
        const result = await performanceMonitor.measure(
            'pagination_load',
            async () => {
                const { data, error } = await supabase.rpc('get_crm_items_paginated', {
                    p_workspace_id: workspaceId,
                    p_page: page,
                    p_page_size: 50,
                    p_include_contacts: true,
                    p_include_stats: false
                });
                
                if (error) throw error;
                return data;
            },
            { page }
        );
        
        const metrics = performanceMonitor.getMetrics('pagination_load');
        const lastMetric = metrics[metrics.length - 1];
        
        results.push({
            page,
            duration: lastMetric?.avgDuration || 0
        });
    }
    
    const durations = results.map(r => r.duration);
    
    return {
        avgLoadTime: durations.reduce((a, b) => a + b, 0) / durations.length,
        minLoadTime: Math.min(...durations),
        maxLoadTime: Math.max(...durations),
        results
    };
}

/**
 * Run search performance test
 */
export async function testSearchPerformance(
    workspaceId: string,
    queries: string[]
): Promise<{
    avgSearchTime: number;
    results: Array<{ query: string; duration: number; resultCount: number }>;
}> {
    logger.info('[LoadTest] Testing search performance', { queryCount: queries.length });
    
    const results: Array<{ query: string; duration: number; resultCount: number }> = [];
    
    for (const query of queries) {
        const startTime = performance.now();
        
        const { data, error } = await supabase.rpc('get_crm_items_paginated', {
            p_workspace_id: workspaceId,
            p_search: query,
            p_page: 1,
            p_page_size: 50,
            p_include_contacts: false,
            p_include_stats: false
        });
        
        const duration = performance.now() - startTime;
        
        results.push({
            query,
            duration,
            resultCount: data?.items?.length || 0
        });
    }
    
    const avgSearchTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    return {
        avgSearchTime,
        results
    };
}

/**
 * Run concurrent request test
 */
export async function testConcurrentRequests(
    workspaceId: string,
    concurrency: number = 10
): Promise<{
    totalDuration: number;
    avgDuration: number;
    successCount: number;
    errorCount: number;
}> {
    logger.info('[LoadTest] Testing concurrent requests', { concurrency });
    
    const startTime = performance.now();
    
    const promises = Array.from({ length: concurrency }, (_, i) =>
        supabase.rpc('get_crm_items_paginated', {
            p_workspace_id: workspaceId,
            p_page: (i % 5) + 1, // Vary pages
            p_page_size: 50,
            p_include_contacts: true,
            p_include_stats: false
        })
    );
    
    const results = await Promise.allSettled(promises);
    
    const totalDuration = performance.now() - startTime;
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.filter(r => r.status === 'rejected').length;
    
    return {
        totalDuration,
        avgDuration: totalDuration / concurrency,
        successCount,
        errorCount
    };
}
