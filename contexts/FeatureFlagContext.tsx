import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { ReactNode } from 'react';
import { FeatureFlagKey, featureFlags } from '../lib/featureFlags';
import { FeatureFlagService, WorkspaceFeatureFlagOverride } from '../lib/services/featureFlagService';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './AuthContext';
import { logger } from '../lib/logger';

interface FeatureFlagContextValue {
  loading: boolean;
  error: string | null;
  overrides: Partial<Record<FeatureFlagKey, boolean>>;
  isFeatureEnabled: (key: FeatureFlagKey) => boolean;
  refreshFlags: () => Promise<void>;
  updateWorkspaceFlag: (key: FeatureFlagKey, enabled: boolean, options?: UpdateFlagOptions) => Promise<void>;
}

interface UpdateFlagOptions {
  metadata?: Record<string, unknown>;
  rolloutStrategy?: string;
  rolloutPercentage?: number;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

const CACHE_PREFIX = 'workspace_flags';

const getCacheKey = (workspaceId?: string | null) =>
  workspaceId ? `${CACHE_PREFIX}_${workspaceId}` : null;

const readCache = (cacheKey: string | null): Partial<Record<FeatureFlagKey, boolean>> => {
  if (!cacheKey || typeof window === 'undefined') {
    return {};
  }

  try {
    const payload = window.sessionStorage.getItem(cacheKey);
    if (!payload) {
      return {};
    }
    return JSON.parse(payload) as Partial<Record<FeatureFlagKey, boolean>>;
  } catch (error) {
    logger.warn('Failed to read feature flag cache', { error });
    return {};
  }
};

const writeCache = (cacheKey: string | null, value: Partial<Record<FeatureFlagKey, boolean>>) => {
  if (!cacheKey || typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(value));
  } catch (error) {
    logger.warn('Failed to persist feature flag cache', { error });
  }
};

const mapOverrides = (rows: WorkspaceFeatureFlagOverride[]): Partial<Record<FeatureFlagKey, boolean>> => {
  return rows.reduce((acc, row) => {
    acc[row.feature_key] = row.enabled;
    return acc;
  }, {} as Partial<Record<FeatureFlagKey, boolean>>);
};

const applyRuntimeOverrides = (overrides: Partial<Record<FeatureFlagKey, boolean>>) => {
  (Object.entries(overrides) as Array<[FeatureFlagKey, boolean]>).forEach(([key, enabled]) => {
    if (typeof enabled === 'boolean') {
      featureFlags.setEnabled(key, enabled);
    }
  });
};

interface FeatureFlagProviderProps {
  children: ReactNode;
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({ children }) => {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Partial<Record<FeatureFlagKey, boolean>>>({});
  const cacheKeyRef = useRef<string | null>(null);

  const workspaceId = workspace?.id ?? null;

  const resolveEffectiveFlag = useCallback(
    (key: FeatureFlagKey) => {
      if (workspaceId && typeof overrides[key] === 'boolean') {
        return overrides[key] as boolean;
      }
      return featureFlags.isEnabled(key);
    },
    [workspaceId, overrides]
  );

  const syncOverrides = useCallback((nextOverrides: Partial<Record<FeatureFlagKey, boolean>>) => {
    setOverrides(nextOverrides);
    applyRuntimeOverrides(nextOverrides);
    writeCache(cacheKeyRef.current, nextOverrides);
  }, []);

  const fetchWorkspaceFlags = useCallback(async () => {
    if (!workspaceId) {
      syncOverrides({});
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const overrides = await FeatureFlagService.getWorkspaceOverrides(workspaceId);
      const mapped = mapOverrides(overrides);
      syncOverrides(mapped);
      setError(null);
    } catch (err) {
      logger.error('Failed to refresh workspace flags', { err });
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, syncOverrides]);

  useEffect(() => {
    cacheKeyRef.current = getCacheKey(workspaceId);

    if (!workspaceId) {
      syncOverrides({});
      setLoading(false);
      return;
    }

    const cached = readCache(cacheKeyRef.current);
    if (Object.keys(cached).length) {
      syncOverrides(cached);
    }

    fetchWorkspaceFlags();
  }, [workspaceId, fetchWorkspaceFlags, syncOverrides]);

  const updateWorkspaceFlag = useCallback(async (
    key: FeatureFlagKey,
    enabled: boolean,
    options?: UpdateFlagOptions
  ) => {
    if (!workspaceId) {
      throw new Error('Workspace not ready for feature flag updates');
    }

    try {
      await FeatureFlagService.upsertWorkspaceOverride({
        workspaceId,
        featureKey: key,
        enabled,
        metadata: options?.metadata,
        rolloutStrategy: options?.rolloutStrategy,
        rolloutPercentage: options?.rolloutPercentage,
        userId: user?.id
      });

      const next = { ...overrides, [key]: enabled };
      syncOverrides(next);
    } catch (err) {
      logger.error('Failed to update workspace feature flag', { err, key, workspaceId });
      throw err;
    }
  }, [workspaceId, overrides, syncOverrides, user?.id]);

  const contextValue = useMemo<FeatureFlagContextValue>(() => ({
    loading,
    error,
    overrides,
    isFeatureEnabled: (key: FeatureFlagKey) => resolveEffectiveFlag(key),
    refreshFlags: fetchWorkspaceFlags,
    updateWorkspaceFlag
  }), [loading, error, overrides, resolveEffectiveFlag, fetchWorkspaceFlags, updateWorkspaceFlag]);

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
};
