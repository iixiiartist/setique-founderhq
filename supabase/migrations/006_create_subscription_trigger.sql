-- Migration: Auto-create subscriptions for new workspaces
-- Date: 2025-11-05
-- Description: Creates trigger to automatically create a free subscription when a workspace is created

-- Function to create default subscription for new workspace
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a free plan subscription for the new workspace
    INSERT INTO subscriptions (
        workspace_id,
        plan_type,
        status,
        ai_requests_used,
        ai_requests_reset_at,
        storage_bytes_used,
        file_count_used,
        seat_count,
        used_seats
    ) VALUES (
        NEW.id,
        'free',
        'active',
        0,
        NOW(),
        0,
        0,
        1,
        1
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create subscription
DROP TRIGGER IF EXISTS create_default_subscription_trigger ON workspaces;
CREATE TRIGGER create_default_subscription_trigger
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();

-- Backfill: Create subscriptions for existing workspaces that don't have one
INSERT INTO subscriptions (
    workspace_id,
    plan_type,
    status,
    ai_requests_used,
    ai_requests_reset_at,
    storage_bytes_used,
    file_count_used,
    seat_count,
    used_seats
)
SELECT 
    w.id as workspace_id,
    'free' as plan_type,
    'active' as status,
    0 as ai_requests_used,
    NOW() as ai_requests_reset_at,
    0 as storage_bytes_used,
    0 as file_count_used,
    1 as seat_count,
    1 as used_seats
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.workspace_id = w.id
);

-- Add comment
COMMENT ON FUNCTION create_default_subscription() IS 'Automatically creates a free subscription when a workspace is created';
