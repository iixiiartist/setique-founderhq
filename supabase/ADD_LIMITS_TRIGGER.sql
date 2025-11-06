-- Add the set_subscription_limits trigger from migration 005
-- This trigger automatically sets correct limits when plan_type changes

-- Function to initialize subscription limits based on plan
CREATE OR REPLACE FUNCTION set_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Set limits based on plan type
    CASE NEW.plan_type
        WHEN 'free' THEN
            NEW.ai_requests_limit := 20;
            NEW.storage_bytes_limit := 104857600; -- 100 MB
            NEW.file_count_limit := 25;
            NEW.seat_count := 1;
            
        WHEN 'pro-individual' THEN
            NEW.ai_requests_limit := 500;
            NEW.storage_bytes_limit := 1073741824; -- 1 GB
            NEW.file_count_limit := 250;
            NEW.seat_count := 1;
            
        WHEN 'power-individual' THEN
            NEW.ai_requests_limit := NULL; -- Unlimited
            NEW.storage_bytes_limit := 5368709120; -- 5 GB
            NEW.file_count_limit := NULL; -- Unlimited
            NEW.seat_count := 1;
            
        WHEN 'team-starter' THEN
            -- Per-user limits: 500 AI requests, 250 files per user
            -- Shared storage: 3 GB
            NEW.ai_requests_limit := 500 * NEW.seat_count;
            NEW.storage_bytes_limit := 3221225472; -- 3 GB shared
            NEW.file_count_limit := 250 * NEW.seat_count;
            
        WHEN 'team-pro' THEN
            -- Per-user limits: unlimited AI, unlimited files per user
            -- Shared storage: 10 GB
            NEW.ai_requests_limit := NULL; -- Unlimited
            NEW.storage_bytes_limit := 10737418240; -- 10 GB shared
            NEW.file_count_limit := NULL; -- Unlimited
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set limits on insert or plan change
DROP TRIGGER IF EXISTS set_subscription_limits_trigger ON subscriptions;
CREATE TRIGGER set_subscription_limits_trigger
    BEFORE INSERT OR UPDATE OF plan_type, seat_count ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_subscription_limits();

-- Fix existing subscriptions with wrong limits
UPDATE subscriptions
SET plan_type = plan_type -- Trigger the update to recalculate limits
WHERE ai_requests_limit = 1000 OR ai_requests_limit IS NULL;

-- Verify all subscriptions now have correct limits
SELECT 
    w.name as workspace_name,
    s.plan_type,
    s.ai_requests_limit,
    s.file_count_limit,
    s.storage_bytes_limit / 1048576.0 as storage_mb,
    s.seat_count
FROM workspaces w
JOIN subscriptions s ON s.workspace_id = w.id
ORDER BY w.name;
