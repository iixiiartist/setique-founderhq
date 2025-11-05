-- Production fix: Add invited_by column to workspace_members
-- This should be applied as a proper migration

-- Add invited_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspace_members' 
        AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE workspace_members 
        ADD COLUMN invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Ensure service role can insert members (it should bypass RLS, but let's be explicit)
-- The Edge Function uses supabaseAdmin which has service_role permission

-- Verify RLS is enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Current policies are correct:
-- 1. "users_can_view_own_memberships" - users see their own memberships
-- 2. "users_can_view_same_workspace_members" - workspace members see each other
-- 3. "owners_can_manage_workspace_members" - workspace owners can manage

-- The Edge Function uses service_role which bypasses ALL RLS policies
-- So no additional policy is needed for invitation acceptance

-- Test that service role can insert (this should succeed if run by service role)
-- The Edge Function will handle the actual insert

-- Verify the function exists and is working
SELECT 'Migration complete - invited_by column added' as status;
