// lib/services/apiKeyService.ts
// Service for managing Premium API keys
// Handles key generation, validation, and CRUD operations

import { supabase } from '../supabase';
import { logger } from '../logger';
import * as Sentry from '@sentry/react';

// ============================================
// TYPES
// ============================================

export type ApiScope = 
  | 'contacts:read' | 'contacts:write'
  | 'tasks:read' | 'tasks:write'
  | 'deals:read' | 'deals:write'
  | 'documents:read' | 'documents:write'
  | 'crm:read' | 'crm:write'
  | 'financials:read' | 'financials:write'
  | 'marketing:read' | 'marketing:write'
  | 'products:read' | 'products:write'
  | 'calendar:read' | 'calendar:write'
  | 'agents:run'
  | 'webhooks:manage'
  | 'context:read';

export type RateLimitTier = 'standard' | 'elevated' | 'unlimited';

export interface ApiKey {
  id: string;
  workspaceId: string;
  createdBy: string;
  name: string;
  keyPrefix: string;
  scopes: ApiScope[];
  rateLimitTier: RateLimitTier;
  requestsPerMinute: number;
  monthlyRequestLimit: number | null;
  requestsThisMonth: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyParams {
  workspaceId: string;
  name: string;
  scopes: ApiScope[];
  rateLimitTier?: RateLimitTier;
  monthlyRequestLimit?: number | null;
  expiresAt?: string | null;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  rawKey: string; // Only returned once at creation time
}

export interface ApiKeyValidation {
  isValid: boolean;
  keyId: string | null;
  workspaceId: string | null;
  scopes: ApiScope[];
  rateLimitTier: RateLimitTier | null;
  requestsPerMinute: number;
  errorMessage: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const KEY_PREFIX = 'fhq_live_';
const KEY_LENGTH = 32; // 32 bytes = 64 hex chars

const RATE_LIMIT_TIERS: Record<RateLimitTier, number> = {
  standard: 100,
  elevated: 500,
  unlimited: 10000, // Soft limit for protection
};

// Available scopes grouped by category
export const API_SCOPES: Record<string, ApiScope[]> = {
  contacts: ['contacts:read', 'contacts:write'],
  tasks: ['tasks:read', 'tasks:write'],
  deals: ['deals:read', 'deals:write'],
  documents: ['documents:read', 'documents:write'],
  crm: ['crm:read', 'crm:write'],
  financials: ['financials:read', 'financials:write'],
  marketing: ['marketing:read', 'marketing:write'],
  products: ['products:read', 'products:write'],
  calendar: ['calendar:read', 'calendar:write'],
  agents: ['agents:run'],
  webhooks: ['webhooks:manage'],
  context: ['context:read'],
};

export const ALL_SCOPES: ApiScope[] = Object.values(API_SCOPES).flat();

// ============================================
// KEY GENERATION
// ============================================

/**
 * Generate a cryptographically secure API key
 */
function generateRawKey(): string {
  const array = new Uint8Array(KEY_LENGTH);
  crypto.getRandomValues(array);
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${KEY_PREFIX}${hex}`;
}

/**
 * Hash an API key using SHA-256
 */
async function hashKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract the prefix from a raw key for display
 */
function extractPrefix(rawKey: string): string {
  return rawKey.substring(0, KEY_PREFIX.length + 8);
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new API key
 */
export async function createApiKey(
  params: CreateApiKeyParams
): Promise<{ data: CreateApiKeyResult | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Generate key
    const rawKey = generateRawKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = extractPrefix(rawKey);

    // Determine rate limit
    const rateLimitTier = params.rateLimitTier || 'standard';
    const requestsPerMinute = RATE_LIMIT_TIERS[rateLimitTier];

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        workspace_id: params.workspaceId,
        created_by: user.id,
        name: params.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: params.scopes,
        rate_limit_tier: rateLimitTier,
        requests_per_minute: requestsPerMinute,
        monthly_request_limit: params.monthlyRequestLimit ?? null,
        expires_at: params.expiresAt ?? null,
      })
      .select()
      .single();

    if (error) {
      logger.error('[ApiKeyService] Create error:', error);
      return { data: null, error: error.message };
    }

    const apiKey = transformRow(data);
    
    logger.info(`[ApiKeyService] Created API key ${keyPrefix} for workspace ${params.workspaceId}`);
    
    return {
      data: {
        apiKey,
        rawKey, // Only time the raw key is available
      },
      error: null,
    };
  } catch (err) {
    logger.error('[ApiKeyService] Create unexpected error:', err);
    Sentry.captureException(err);
    return { data: null, error: 'Failed to create API key' };
  }
}

/**
 * List API keys for a workspace
 */
export async function listApiKeys(
  workspaceId: string
): Promise<{ data: ApiKey[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[ApiKeyService] List error:', error);
      return { data: null, error: error.message };
    }

    return { data: data.map(transformRow), error: null };
  } catch (err) {
    logger.error('[ApiKeyService] List unexpected error:', err);
    return { data: null, error: 'Failed to list API keys' };
  }
}

/**
 * Get a single API key by ID
 */
export async function getApiKey(
  keyId: string
): Promise<{ data: ApiKey | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (error) {
      logger.error('[ApiKeyService] Get error:', error);
      return { data: null, error: error.message };
    }

    return { data: transformRow(data), error: null };
  } catch (err) {
    logger.error('[ApiKeyService] Get unexpected error:', err);
    return { data: null, error: 'Failed to get API key' };
  }
}

/**
 * Update an API key
 */
export async function updateApiKey(
  keyId: string,
  updates: Partial<Pick<ApiKey, 'name' | 'scopes' | 'rateLimitTier' | 'monthlyRequestLimit' | 'expiresAt' | 'isActive'>>
): Promise<{ data: ApiKey | null; error: string | null }> {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.scopes !== undefined) updateData.scopes = updates.scopes;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.monthlyRequestLimit !== undefined) updateData.monthly_request_limit = updates.monthlyRequestLimit;
    if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt;
    
    if (updates.rateLimitTier !== undefined) {
      updateData.rate_limit_tier = updates.rateLimitTier;
      updateData.requests_per_minute = RATE_LIMIT_TIERS[updates.rateLimitTier];
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .select()
      .single();

    if (error) {
      logger.error('[ApiKeyService] Update error:', error);
      return { data: null, error: error.message };
    }

    logger.info(`[ApiKeyService] Updated API key ${keyId}`);
    return { data: transformRow(data), error: null };
  } catch (err) {
    logger.error('[ApiKeyService] Update unexpected error:', err);
    return { data: null, error: 'Failed to update API key' };
  }
}

/**
 * Delete an API key
 */
export async function deleteApiKey(
  keyId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      logger.error('[ApiKeyService] Delete error:', error);
      return { success: false, error: error.message };
    }

    logger.info(`[ApiKeyService] Deleted API key ${keyId}`);
    return { success: true, error: null };
  } catch (err) {
    logger.error('[ApiKeyService] Delete unexpected error:', err);
    return { success: false, error: 'Failed to delete API key' };
  }
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(
  keyId: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await updateApiKey(keyId, { isActive: false });
  return { success: result.data !== null, error: result.error };
}

/**
 * Regenerate an API key (creates new key with same settings)
 */
export async function regenerateApiKey(
  keyId: string
): Promise<{ data: CreateApiKeyResult | null; error: string | null }> {
  try {
    // Get existing key
    const { data: existingKey, error: getError } = await getApiKey(keyId);
    if (getError || !existingKey) {
      return { data: null, error: getError || 'Key not found' };
    }

    // Deactivate old key
    await revokeApiKey(keyId);

    // Create new key with same settings
    return await createApiKey({
      workspaceId: existingKey.workspaceId,
      name: existingKey.name,
      scopes: existingKey.scopes,
      rateLimitTier: existingKey.rateLimitTier,
      monthlyRequestLimit: existingKey.monthlyRequestLimit,
      expiresAt: existingKey.expiresAt,
    });
  } catch (err) {
    logger.error('[ApiKeyService] Regenerate unexpected error:', err);
    return { data: null, error: 'Failed to regenerate API key' };
  }
}

// ============================================
// VALIDATION (For Edge Functions)
// ============================================

/**
 * Validate an API key (call from Edge Functions)
 * Uses the database function for consistent validation
 */
export async function validateApiKey(
  rawKey: string
): Promise<ApiKeyValidation> {
  try {
    const keyHash = await hashKey(rawKey);
    
    const { data, error } = await supabase.rpc('validate_api_key', {
      p_key_hash: keyHash,
    });

    if (error) {
      logger.error('[ApiKeyService] Validation RPC error:', error);
      return {
        isValid: false,
        keyId: null,
        workspaceId: null,
        scopes: [],
        rateLimitTier: null,
        requestsPerMinute: 0,
        errorMessage: 'Validation failed',
      };
    }

    const result = data?.[0];
    if (!result) {
      return {
        isValid: false,
        keyId: null,
        workspaceId: null,
        scopes: [],
        rateLimitTier: null,
        requestsPerMinute: 0,
        errorMessage: 'Invalid API key',
      };
    }

    return {
      isValid: result.is_valid,
      keyId: result.key_id,
      workspaceId: result.workspace_id,
      scopes: result.scopes || [],
      rateLimitTier: result.rate_limit_tier,
      requestsPerMinute: result.requests_per_minute || 100,
      errorMessage: result.error_message,
    };
  } catch (err) {
    logger.error('[ApiKeyService] Validation unexpected error:', err);
    return {
      isValid: false,
      keyId: null,
      workspaceId: null,
      scopes: [],
      rateLimitTier: null,
      requestsPerMinute: 0,
      errorMessage: 'Validation error',
    };
  }
}

/**
 * Check if a key has a specific scope
 */
export function hasScope(scopes: ApiScope[], requiredScope: ApiScope): boolean {
  // Check exact match
  if (scopes.includes(requiredScope)) return true;
  
  // Check if write scope covers read
  const [resource, action] = requiredScope.split(':') as [string, string];
  if (action === 'read') {
    const writeScope = `${resource}:write` as ApiScope;
    if (scopes.includes(writeScope)) return true;
  }
  
  return false;
}

/**
 * Check if a key has all required scopes
 */
export function hasAllScopes(scopes: ApiScope[], requiredScopes: ApiScope[]): boolean {
  return requiredScopes.every(scope => hasScope(scopes, scope));
}

// ============================================
// USAGE STATISTICS
// ============================================

export interface ApiKeyUsageStats {
  keyId: string;
  totalRequests: number;
  requestsToday: number;
  requestsThisMonth: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: { endpoint: string; count: number }[];
}

/**
 * Get usage statistics for an API key
 */
export async function getApiKeyUsageStats(
  keyId: string,
  days = 30
): Promise<{ data: ApiKeyUsageStats | null; error: string | null }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Get request logs
    const { data: logs, error } = await supabase
      .from('api_request_log')
      .select('endpoint, status_code, response_time_ms, created_at')
      .eq('api_key_id', keyId)
      .gte('created_at', startDate.toISOString());

    if (error) {
      return { data: null, error: error.message };
    }

    const totalRequests = logs.length;
    const requestsToday = logs.filter(l => new Date(l.created_at) >= todayStart).length;
    const requestsThisMonth = logs.filter(l => new Date(l.created_at) >= monthStart).length;
    
    const responseTimes = logs.map(l => l.response_time_ms).filter(Boolean);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const errors = logs.filter(l => l.status_code >= 400).length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
    
    // Count by endpoint
    const endpointCounts: Record<string, number> = {};
    logs.forEach(l => {
      endpointCounts[l.endpoint] = (endpointCounts[l.endpoint] || 0) + 1;
    });
    
    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      data: {
        keyId,
        totalRequests,
        requestsToday,
        requestsThisMonth,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        topEndpoints,
      },
      error: null,
    };
  } catch (err) {
    logger.error('[ApiKeyService] Usage stats error:', err);
    return { data: null, error: 'Failed to get usage statistics' };
  }
}

// ============================================
// HELPERS
// ============================================

interface ApiKeyRow {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_tier: string;
  requests_per_minute: number;
  monthly_request_limit: number | null;
  requests_this_month: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function transformRow(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes as ApiScope[],
    rateLimitTier: row.rate_limit_tier as RateLimitTier,
    requestsPerMinute: row.requests_per_minute,
    monthlyRequestLimit: row.monthly_request_limit,
    requestsThisMonth: row.requests_this_month,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default {
  createApiKey,
  listApiKeys,
  getApiKey,
  updateApiKey,
  deleteApiKey,
  revokeApiKey,
  regenerateApiKey,
  validateApiKey,
  hasScope,
  hasAllScopes,
  getApiKeyUsageStats,
  API_SCOPES,
  ALL_SCOPES,
};
