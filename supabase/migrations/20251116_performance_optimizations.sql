-- Migration: Add database performance optimizations
-- Date: 2025-11-16
-- Purpose: Optimize queries and add performance monitoring

-- Create index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_crm_items_workspace_priority_status
    ON crm_items(workspace_id, priority, status)
    WHERE priority IS NOT NULL AND status IS NOT NULL;

-- Partial index for items with next actions
CREATE INDEX IF NOT EXISTS idx_crm_items_upcoming_actions
    ON crm_items(workspace_id, next_action_date)
    WHERE next_action_date >= CURRENT_DATE;

-- Partial index for overdue actions
CREATE INDEX IF NOT EXISTS idx_crm_items_overdue_actions
    ON crm_items(workspace_id, next_action_date)
    WHERE next_action_date < CURRENT_DATE;

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_crm_items_tags
    ON crm_items USING GIN(tags)
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

-- Index for contacts by assignment
CREATE INDEX IF NOT EXISTS idx_contacts_assigned
    ON contacts(crm_item_id, assigned_to)
    WHERE assigned_to IS NOT NULL;

-- Add query performance tracking function
CREATE OR REPLACE FUNCTION track_query_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Log slow queries (over 1 second)
    IF (EXTRACT(EPOCH FROM (clock_timestamp() - statement_timestamp())) > 1) THEN
        RAISE WARNING 'Slow query detected: % seconds', 
            EXTRACT(EPOCH FROM (clock_timestamp() - statement_timestamp()));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update statistics for query planner
ANALYZE crm_items;
ANALYZE contacts;
ANALYZE audit_logs;

-- Add table comments for documentation
COMMENT ON INDEX idx_crm_items_workspace_priority_status IS 
'Composite index for filtering by priority and status within a workspace';

COMMENT ON INDEX idx_crm_items_upcoming_actions IS 
'Partial index for efficiently finding upcoming actions';

COMMENT ON INDEX idx_crm_items_overdue_actions IS 
'Partial index for efficiently finding overdue actions';

-- Create view for slow queries monitoring
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    query,
    calls,
    total_time / 1000 as total_seconds,
    mean_time / 1000 as mean_seconds,
    max_time / 1000 as max_seconds
FROM pg_stat_statements
WHERE mean_time > 1000 -- queries taking more than 1 second on average
ORDER BY mean_time DESC
LIMIT 20;

COMMENT ON VIEW slow_queries IS 
'Monitor slow queries for performance optimization';
