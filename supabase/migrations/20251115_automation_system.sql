-- Migration: Automation System
-- Description: Create tables for declarative automation rules, execution logs, and workspace preferences
-- Created: 2025-11-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: automation_rules
-- Purpose: Store declarative automation rules per workspace
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Trigger configuration
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'deal_stage_change',
        'contact_added',
        'meeting_scheduled',
        'date_based',
        'inventory_low',
        'contract_expiring',
        'revenue_milestone'
    )),
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Actions to execute
    actions JSONB NOT NULL,
    
    -- Control flags
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    -- Rate limiting
    max_executions_per_minute INTEGER DEFAULT 10,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_executed_at TIMESTAMPTZ,
    execution_count INTEGER DEFAULT 0,
    
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 100)
);

-- Indexes for performance
CREATE INDEX idx_automation_rules_workspace_active 
    ON automation_rules(workspace_id, is_active) 
    WHERE is_active = true;

CREATE INDEX idx_automation_rules_trigger 
    ON automation_rules(trigger_type, is_active) 
    WHERE is_active = true;

CREATE INDEX idx_automation_rules_priority 
    ON automation_rules(workspace_id, priority DESC, is_active) 
    WHERE is_active = true;

-- =====================================================
-- Table: automation_logs
-- Purpose: Audit trail for all automation executions
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Execution context
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_data JSONB,
    
    -- Actions and results
    actions_executed JSONB,
    result TEXT NOT NULL CHECK (result IN ('success', 'partial', 'failed', 'skipped')),
    error_details TEXT,
    
    -- Performance metrics
    execution_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    -- Related entities (for easier querying)
    related_entity_type TEXT,
    related_entity_id UUID
);

-- Indexes for common queries
CREATE INDEX idx_automation_logs_rule 
    ON automation_logs(rule_id, triggered_at DESC);

CREATE INDEX idx_automation_logs_workspace 
    ON automation_logs(workspace_id, triggered_at DESC);

CREATE INDEX idx_automation_logs_failed 
    ON automation_logs(result, triggered_at DESC) 
    WHERE result IN ('failed', 'partial');

CREATE INDEX idx_automation_logs_entity 
    ON automation_logs(related_entity_type, related_entity_id, triggered_at DESC);

-- Partial index for recent logs (last 30 days)
-- Note: Cannot use NOW() in index predicate as it's not immutable
-- Instead, use a regular index - PostgreSQL will efficiently filter recent dates
CREATE INDEX idx_automation_logs_recent 
    ON automation_logs(workspace_id, triggered_at DESC);

-- =====================================================
-- Table: automation_preferences
-- Purpose: Per-workspace automation configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_preferences (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Feature toggles
    auto_create_revenue_enabled BOOLEAN DEFAULT true,
    auto_create_tasks_enabled BOOLEAN DEFAULT true,
    auto_invoice_enabled BOOLEAN DEFAULT false,
    auto_notifications_enabled BOOLEAN DEFAULT true,
    
    -- Thresholds and timings
    inventory_reorder_threshold INTEGER DEFAULT 10,
    contract_renewal_lead_time_days INTEGER DEFAULT 30,
    deal_follow_up_days INTEGER DEFAULT 7,
    
    -- Notification preferences
    notification_preferences JSONB DEFAULT '{
        "deal_closed": true,
        "revenue_created": true,
        "inventory_low": true,
        "contract_expiring": true,
        "automation_failed": true
    }'::jsonb,
    
    -- Global controls
    automation_enabled BOOLEAN DEFAULT true,
    max_automations_per_hour INTEGER DEFAULT 100,
    
    -- Audit
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- Functions: Update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_automation_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers: Auto-update timestamps
-- =====================================================
CREATE TRIGGER automation_rules_updated_at_trigger
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_rules_updated_at();

CREATE TRIGGER automation_preferences_updated_at_trigger
    BEFORE UPDATE ON automation_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_preferences_updated_at();

-- =====================================================
-- Function: Increment execution counter
-- =====================================================
CREATE OR REPLACE FUNCTION increment_rule_execution_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE automation_rules
    SET 
        execution_count = execution_count + 1,
        last_executed_at = NEW.triggered_at
    WHERE id = NEW.rule_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automation_logs_increment_counter
    AFTER INSERT ON automation_logs
    FOR EACH ROW
    WHEN (NEW.result IN ('success', 'partial'))
    EXECUTE FUNCTION increment_rule_execution_count();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see automations for their workspace
CREATE POLICY automation_rules_workspace_isolation ON automation_rules
    FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY automation_logs_workspace_isolation ON automation_logs
    FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY automation_preferences_workspace_isolation ON automation_preferences
    FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- Seed: Default automation preferences for existing workspaces
-- =====================================================
INSERT INTO automation_preferences (workspace_id)
SELECT id FROM workspaces
WHERE id NOT IN (SELECT workspace_id FROM automation_preferences)
ON CONFLICT (workspace_id) DO NOTHING;

-- =====================================================
-- Seed: Default deal-to-revenue automation rule
-- =====================================================
INSERT INTO automation_rules (
    workspace_id,
    name,
    description,
    trigger_type,
    trigger_conditions,
    actions,
    is_active,
    priority
)
SELECT 
    w.id as workspace_id,
    'Auto-create Revenue from Closed Deals',
    'Automatically create revenue transactions when deals are marked as closed won',
    'deal_stage_change',
    '{"field": "stage", "operator": "equals", "value": "closed_won"}'::jsonb,
    '[{
        "type": "create_revenue",
        "params": {
            "source": "deal",
            "use_deal_close_date": true,
            "require_product_link": true
        },
        "retryConfig": {
            "maxAttempts": 3,
            "backoffMs": 1000
        }
    }]'::jsonb,
    true,
    90
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM automation_rules ar
    WHERE ar.workspace_id = w.id
    AND ar.trigger_type = 'deal_stage_change'
    AND ar.name = 'Auto-create Revenue from Closed Deals'
);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE automation_rules IS 'Declarative automation rules with triggers and actions';
COMMENT ON TABLE automation_logs IS 'Audit trail of all automation executions with performance metrics';
COMMENT ON TABLE automation_preferences IS 'Per-workspace configuration for automation behavior';

COMMENT ON COLUMN automation_rules.trigger_conditions IS 'JSONB conditions that must be met for rule to execute';
COMMENT ON COLUMN automation_rules.actions IS 'JSONB array of actions to execute when rule triggers';
COMMENT ON COLUMN automation_logs.execution_time_ms IS 'Time taken to execute all actions in milliseconds';
COMMENT ON COLUMN automation_preferences.notification_preferences IS 'JSONB map of notification types to enabled state';
