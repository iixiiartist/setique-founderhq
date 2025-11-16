/**
 * JSON Patch Service
 * 
 * Implements RFC 6902 JSON Patch for efficient partial updates
 * Reduces payload size by 90%+ for small changes
 */

import { compare, applyPatch, Operation } from 'fast-json-patch';
import { logger } from '../utils/logger';
import { CrmItem } from '../../types';

export interface PatchResult<T> {
    patched: T;
    operations: Operation[];
}

/**
 * Generate JSON Patch operations between two objects
 * 
 * @example
 * const original = { company: 'Acme', status: 'Active' };
 * const updated = { company: 'Acme', status: 'Closed' };
 * const patch = generatePatch(original, updated);
 * // Returns: [{ op: 'replace', path: '/status', value: 'Closed' }]
 */
export function generatePatch<T extends object>(
    original: T,
    updated: T
): Operation[] {
    try {
        const operations = compare(original, updated);
        logger.debug('[JsonPatchService] Generated patch', {
            operationCount: operations.length,
            operations
        });
        return operations;
    } catch (error) {
        logger.error('[JsonPatchService] Failed to generate patch', error);
        throw error;
    }
}

/**
 * Apply JSON Patch operations to an object
 * 
 * @example
 * const original = { company: 'Acme', status: 'Active' };
 * const patch = [{ op: 'replace', path: '/status', value: 'Closed' }];
 * const result = applyJsonPatch(original, patch);
 * // Returns: { company: 'Acme', status: 'Closed' }
 */
export function applyJsonPatch<T extends object>(
    original: T,
    operations: Operation[]
): PatchResult<T> {
    try {
        // Clone to avoid mutating original
        const cloned = JSON.parse(JSON.stringify(original));
        const result = applyPatch(cloned, operations);
        
        logger.debug('[JsonPatchService] Applied patch', {
            operationCount: operations.length,
            success: !result.some(r => r !== null)
        });
        
        return {
            patched: result.newDocument,
            operations
        };
    } catch (error) {
        logger.error('[JsonPatchService] Failed to apply patch', error);
        throw error;
    }
}

/**
 * Calculate patch size savings
 * 
 * @returns Percentage of data saved by using patch vs full object
 */
export function calculatePatchSavings<T extends object>(
    original: T,
    updated: T
): {
    fullSize: number;
    patchSize: number;
    savedBytes: number;
    savedPercent: number;
} {
    const fullPayload = JSON.stringify(updated);
    const patch = generatePatch(original, updated);
    const patchPayload = JSON.stringify(patch);
    
    const fullSize = fullPayload.length;
    const patchSize = patchPayload.length;
    const savedBytes = fullSize - patchSize;
    const savedPercent = ((savedBytes / fullSize) * 100);
    
    return {
        fullSize,
        patchSize,
        savedBytes,
        savedPercent: Math.round(savedPercent * 100) / 100
    };
}

/**
 * Determine if patch should be used based on size threshold
 * 
 * @param threshold Minimum savings percentage to use patch (default: 30%)
 */
export function shouldUsePatch<T extends object>(
    original: T,
    updated: T,
    threshold: number = 30
): boolean {
    const savings = calculatePatchSavings(original, updated);
    return savings.savedPercent >= threshold;
}

/**
 * Optimize CRM item update by using patch when beneficial
 */
export function optimizeCrmUpdate(
    original: CrmItem,
    updated: Partial<CrmItem>
): {
    method: 'patch' | 'full';
    payload: Operation[] | Partial<CrmItem>;
    savings?: number;
} {
    // Merge updates with original to get full updated state
    const fullUpdated = { ...original, ...updated };
    
    // Check if patch is worthwhile
    if (shouldUsePatch(original, fullUpdated)) {
        const patch = generatePatch(original, fullUpdated);
        const savings = calculatePatchSavings(original, fullUpdated);
        
        logger.info('[JsonPatchService] Using patch method', {
            savings: `${savings.savedPercent}% (${savings.savedBytes} bytes)`
        });
        
        return {
            method: 'patch',
            payload: patch,
            savings: savings.savedPercent
        };
    }
    
    logger.debug('[JsonPatchService] Using full update (patch not beneficial)');
    return {
        method: 'full',
        payload: updated
    };
}

/**
 * Batch multiple patches efficiently
 */
export function batchPatches<T extends { id: string }>(
    items: Array<{ original: T; updated: Partial<T> }>
): Array<{
    id: string;
    method: 'patch' | 'full';
    payload: Operation[] | Partial<T>;
}> {
    return items.map(({ original, updated }) => {
        const fullUpdated = { ...original, ...updated } as T;
        const usePatch = shouldUsePatch(original, fullUpdated);
        
        return {
            id: original.id,
            method: usePatch ? 'patch' : 'full',
            payload: usePatch ? generatePatch(original, fullUpdated) : updated
        };
    });
}
