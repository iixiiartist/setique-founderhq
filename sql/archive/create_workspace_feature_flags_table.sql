-- Workspace Feature Flags Table Migration
-- Provides workspace-scoped overrides for frontend/runtime gating
-- Run inside Supabase SQL editor (safe to re-run)

CREATE TABLE IF NOT EXISTS workspace_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_strategy TEXT,
    rollout_percentage INTEGER CHECK (rollout_percentage BETWEEN 0 AND 100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure single override per workspace + feature combination
CREATE UNIQUE INDEX IF NOT EXISTS workspace_feature_flags_workspace_feature_idx
    ON workspace_feature_flags (workspace_id, feature_key);

-- Helpful partial index for API patterns fetching enabled flags per workspace
CREATE INDEX IF NOT EXISTS workspace_feature_flags_enabled_idx
    ON workspace_feature_flags (workspace_id)
    WHERE enabled = TRUE;

COMMENT ON TABLE workspace_feature_flags IS 'Workspace-scoped feature flag overrides with rollout metadata';
COMMENT ON COLUMN workspace_feature_flags.feature_key IS 'Feature flag key string (matches frontend FeatureFlagKey union)';
COMMENT ON COLUMN workspace_feature_flags.rollout_strategy IS 'Optional description of rollout strategy (e.g., percentage, cohort)';
COMMENT ON COLUMN workspace_feature_flags.rollout_percentage IS 'Optional rollout percentage (0-100)';
COMMENT ON COLUMN workspace_feature_flags.metadata IS 'Arbitrary JSON metadata for admin tooling';
COMMENT ON COLUMN workspace_feature_flags.created_by IS 'User who created the override';
COMMENT ON COLUMN workspace_feature_flags.updated_by IS 'Most recent user to update the override';

-- NOTE: Enable RLS + workspace-aware policies via a follow-up script
-- Example scaffold (uncomment + adjust when ready):
-- ALTER TABLE workspace_feature_flags ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Workspace members can read feature flags" ON workspace_feature_flags
--     FOR SELECT USING (
--         workspace_id IN (
--             SELECT workspace_id
--             FROM workspace_members
--             WHERE user_id = auth.uid()
--         )
--     );
-- CREATE POLICY "Workspace admins manage feature flags" ON workspace_feature_flags
--     FOR INSERT WITH CHECK (
--         workspace_id IN (
--             SELECT workspace_id
--             FROM workspace_members
--             WHERE user_id = auth.uid()
--               AND role IN ('owner', 'admin')
--         )
--     );
-- CREATE POLICY "Workspace admins update feature flags" ON workspace_feature_flags
--     FOR UPDATE USING (
--         workspace_id IN (
--             SELECT workspace_id
--             FROM workspace_members
--             WHERE user_id = auth.uid()
--               AND role IN ('owner', 'admin')
--         )
--     );
