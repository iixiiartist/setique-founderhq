// hooks/useApiKeys.ts
// React hook for managing API keys in the workspace settings

import { useState, useEffect, useCallback } from 'react';
import {
  listApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  revokeApiKey,
  regenerateApiKey,
  getApiKeyUsageStats,
  type ApiKey,
  type CreateApiKeyParams,
  type ApiScope,
  type RateLimitTier,
  type ApiKeyUsageStats,
} from '../lib/services/apiKeyService';
import { logger } from '../lib/logger';

// ============================================
// TYPES
// ============================================

export interface UseApiKeysOptions {
  workspaceId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseApiKeysResult {
  // Data
  apiKeys: ApiKey[];
  selectedKey: ApiKey | null;
  selectedKeyStats: ApiKeyUsageStats | null;
  
  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  loadingStats: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
  create: (params: CreateApiKeyInput) => Promise<{ apiKey: ApiKey; rawKey: string } | null>;
  update: (keyId: string, updates: UpdateApiKeyInput) => Promise<boolean>;
  remove: (keyId: string) => Promise<boolean>;
  revoke: (keyId: string) => Promise<boolean>;
  regenerate: (keyId: string) => Promise<{ apiKey: ApiKey; rawKey: string } | null>;
  selectKey: (keyId: string | null) => void;
  loadStats: (keyId: string) => Promise<void>;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiScope[];
  rateLimitTier?: RateLimitTier;
  monthlyRequestLimit?: number | null;
  expiresInDays?: number | null;
}

export interface UpdateApiKeyInput {
  name?: string;
  scopes?: ApiScope[];
  rateLimitTier?: RateLimitTier;
  monthlyRequestLimit?: number | null;
  isActive?: boolean;
}

// ============================================
// HOOK
// ============================================

export function useApiKeys(options: UseApiKeysOptions): UseApiKeysResult {
  const { workspaceId, autoRefresh = false, refreshInterval = 60000 } = options;

  // State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [selectedKeyStats, setSelectedKeyStats] = useState<ApiKeyUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH
  // ============================================

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await listApiKeys(workspaceId);
      
      if (fetchError) {
        throw new Error(fetchError);
      }
      
      setApiKeys(data || []);
      
      // Update selected key if it exists
      if (selectedKey) {
        const updated = data?.find(k => k.id === selectedKey.id);
        setSelectedKey(updated || null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load API keys';
      setError(message);
      logger.error('[useApiKeys] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedKey?.id]);

  // ============================================
  // CREATE
  // ============================================

  const create = useCallback(async (
    input: CreateApiKeyInput
  ): Promise<{ apiKey: ApiKey; rawKey: string } | null> => {
    try {
      setCreating(true);
      setError(null);

      // Calculate expiration date if specified
      let expiresAt: string | null = null;
      if (input.expiresInDays) {
        const date = new Date();
        date.setDate(date.getDate() + input.expiresInDays);
        expiresAt = date.toISOString();
      }

      const params: CreateApiKeyParams = {
        workspaceId,
        name: input.name,
        scopes: input.scopes,
        rateLimitTier: input.rateLimitTier,
        monthlyRequestLimit: input.monthlyRequestLimit,
        expiresAt,
      };

      const { data, error: createError } = await createApiKey(params);
      
      if (createError || !data) {
        throw new Error(createError || 'Failed to create API key');
      }
      
      // Add to local state
      setApiKeys(prev => [data.apiKey, ...prev]);
      
      logger.info(`[useApiKeys] Created API key: ${data.apiKey.keyPrefix}`);
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create API key';
      setError(message);
      logger.error('[useApiKeys] Create error:', err);
      return null;
    } finally {
      setCreating(false);
    }
  }, [workspaceId]);

  // ============================================
  // UPDATE
  // ============================================

  const update = useCallback(async (
    keyId: string,
    updates: UpdateApiKeyInput
  ): Promise<boolean> => {
    try {
      setUpdating(true);
      setError(null);

      const { data, error: updateError } = await updateApiKey(keyId, updates);
      
      if (updateError || !data) {
        throw new Error(updateError || 'Failed to update API key');
      }
      
      // Update local state
      setApiKeys(prev => prev.map(k => k.id === keyId ? data : k));
      
      if (selectedKey?.id === keyId) {
        setSelectedKey(data);
      }
      
      logger.info(`[useApiKeys] Updated API key: ${keyId}`);
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update API key';
      setError(message);
      logger.error('[useApiKeys] Update error:', err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [selectedKey?.id]);

  // ============================================
  // DELETE
  // ============================================

  const remove = useCallback(async (keyId: string): Promise<boolean> => {
    try {
      setDeleting(true);
      setError(null);

      const { success, error: deleteError } = await deleteApiKey(keyId);
      
      if (!success) {
        throw new Error(deleteError || 'Failed to delete API key');
      }
      
      // Update local state
      setApiKeys(prev => prev.filter(k => k.id !== keyId));
      
      if (selectedKey?.id === keyId) {
        setSelectedKey(null);
        setSelectedKeyStats(null);
      }
      
      logger.info(`[useApiKeys] Deleted API key: ${keyId}`);
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete API key';
      setError(message);
      logger.error('[useApiKeys] Delete error:', err);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [selectedKey?.id]);

  // ============================================
  // REVOKE
  // ============================================

  const revoke = useCallback(async (keyId: string): Promise<boolean> => {
    return update(keyId, { isActive: false });
  }, [update]);

  // ============================================
  // REGENERATE
  // ============================================

  const regenerate = useCallback(async (
    keyId: string
  ): Promise<{ apiKey: ApiKey; rawKey: string } | null> => {
    try {
      setUpdating(true);
      setError(null);

      const { data, error: regenError } = await regenerateApiKey(keyId);
      
      if (regenError || !data) {
        throw new Error(regenError || 'Failed to regenerate API key');
      }
      
      // Update local state - remove old, add new
      setApiKeys(prev => [
        data.apiKey,
        ...prev.filter(k => k.id !== keyId),
      ]);
      
      if (selectedKey?.id === keyId) {
        setSelectedKey(data.apiKey);
      }
      
      logger.info(`[useApiKeys] Regenerated API key: ${data.apiKey.keyPrefix}`);
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate API key';
      setError(message);
      logger.error('[useApiKeys] Regenerate error:', err);
      return null;
    } finally {
      setUpdating(false);
    }
  }, [selectedKey?.id]);

  // ============================================
  // SELECT & STATS
  // ============================================

  const selectKey = useCallback((keyId: string | null) => {
    if (!keyId) {
      setSelectedKey(null);
      setSelectedKeyStats(null);
      return;
    }
    
    const key = apiKeys.find(k => k.id === keyId);
    setSelectedKey(key || null);
    setSelectedKeyStats(null);
  }, [apiKeys]);

  const loadStats = useCallback(async (keyId: string) => {
    try {
      setLoadingStats(true);
      
      const { data, error: statsError } = await getApiKeyUsageStats(keyId);
      
      if (statsError) {
        throw new Error(statsError);
      }
      
      setSelectedKeyStats(data);
    } catch (err) {
      logger.error('[useApiKeys] Stats error:', err);
      setSelectedKeyStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const intervalId = setInterval(refresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refresh]);

  // Load stats when key is selected
  useEffect(() => {
    if (selectedKey) {
      loadStats(selectedKey.id);
    }
  }, [selectedKey?.id, loadStats]);

  // ============================================
  // RETURN
  // ============================================

  return {
    apiKeys,
    selectedKey,
    selectedKeyStats,
    loading,
    creating,
    updating,
    deleting,
    loadingStats,
    error,
    refresh,
    create,
    update,
    remove,
    revoke,
    regenerate,
    selectKey,
    loadStats,
  };
}

export default useApiKeys;
