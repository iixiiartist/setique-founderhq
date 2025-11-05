-- Simplify the workspace_invitations setup
-- Drop the trigger that might be causing issues

-- Drop the trigger and function
DROP TRIGGER IF EXISTS trigger_expire_invitations ON workspace_invitations;
DROP FUNCTION IF EXISTS expire_old_invitations();

-- Recreate the function without the UPDATE that might cause RLS issues
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- Just return NULL, we'll handle expiration in application code or via a cron job
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Don't recreate the trigger - let's handle expiration differently
-- The trigger was running on every INSERT/UPDATE and might be causing RLS recursion

-- Add a simple view for non-expired invitations instead
CREATE OR REPLACE VIEW active_workspace_invitations AS
SELECT * FROM workspace_invitations
WHERE status = 'pending' 
AND expires_at > NOW();

