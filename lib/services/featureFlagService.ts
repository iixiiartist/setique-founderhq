import { FeatureFlagKey } from '../featureFlags';
import { logger } from '../logger';
import { supabase } from '../supabase';

const TABLE_NAME = 'workspace_feature_flags';

export interface WorkspaceFeatureFlagOverride {
  id: string;
  workspace_id: string;
  feature_key: FeatureFlagKey;
  enabled: boolean;
  rollout_strategy?: string | null;
  rollout_percentage?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export class FeatureFlagService {
  static async getWorkspaceOverrides(workspaceId: string): Promise<WorkspaceFeatureFlagOverride[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch workspace feature flags', { error, workspaceId });
      throw error;
    }

    return data as WorkspaceFeatureFlagOverride[];
  }

  static async upsertWorkspaceOverride(
    params: {
      workspaceId: string;
      featureKey: FeatureFlagKey;
      enabled: boolean;
  metadata?: Record<string, unknown>;
      rolloutStrategy?: string;
      rolloutPercentage?: number;
      userId?: string;
    }
  ): Promise<WorkspaceFeatureFlagOverride> {
    const { workspaceId, featureKey, enabled, metadata, rolloutStrategy, rolloutPercentage, userId } = params;

    const timestamp = new Date().toISOString();

    const payload = {
      workspace_id: workspaceId,
      feature_key: featureKey,
      enabled,
      metadata: metadata ?? undefined,
      rollout_strategy: rolloutStrategy ?? undefined,
      rollout_percentage: rolloutPercentage ?? undefined,
  updated_by: userId ?? undefined,
      updated_at: timestamp
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, {
        onConflict: 'workspace_id,feature_key',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to upsert workspace feature flag', { error, workspaceId, featureKey });
      throw error;
    }

    return data as WorkspaceFeatureFlagOverride;
  }
}
