-- Production-ready fix for team invitation system
-- This addresses the root causes of invitation failures

-- STEP 1: Ensure invited_by column exists (already done in migration)
-- STEP 2: Fix the Edge Function to handle ALL edge cases properly

-- The Edge Function should:
-- 1. Use service_role client (bypasses RLS) ✅ Already doing this
-- 2. Handle profile creation race conditions ✅ Already has retry logic
-- 3. Add user to workspace_members ✅ Already does this
-- 4. Handle the case where user exists but isn't in workspace

-- STEP 3: Add a "rescue" function for manual fixes when Edge Function fails
-- This is useful for debugging and handling edge cases

CREATE OR REPLACE FUNCTION admin_rescue_add_workspace_member(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member',
  p_invited_by UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  member_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges, bypasses RLS
AS $$
DECLARE
  v_member_id UUID;
  v_workspace_exists BOOLEAN;
  v_user_exists BOOLEAN;
BEGIN
  -- Validate workspace exists
  SELECT EXISTS (
    SELECT 1 FROM workspaces WHERE id = p_workspace_id
  ) INTO v_workspace_exists;
  
  IF NOT v_workspace_exists THEN
    RETURN QUERY SELECT FALSE, 'Workspace does not exist'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Validate user/profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id
  ) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN QUERY SELECT FALSE, 'User profile does not exist'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Insert or update the workspace member
  INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
  VALUES (p_workspace_id, p_user_id, p_role, p_invited_by)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    invited_by = COALESCE(EXCLUDED.invited_by, workspace_members.invited_by),
    joined_at = COALESCE(workspace_members.joined_at, NOW())
  RETURNING id INTO v_member_id;
  
  -- Return success
  RETURN QUERY SELECT TRUE, 'User added to workspace successfully'::TEXT, v_member_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN QUERY SELECT FALSE, ('Error: ' || SQLERRM)::TEXT, NULL::UUID;
END;
$$;

-- Grant execute to authenticated users (function itself has SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION admin_rescue_add_workspace_member(UUID, UUID, TEXT, UUID) TO authenticated;

-- STEP 4: Add monitoring query to check invitation system health
CREATE OR REPLACE FUNCTION check_invitation_system_health()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check 1: Invitations in processing state for too long (stuck invitations)
  RETURN QUERY
  SELECT 
    'Stuck Invitations'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'WARNING'::TEXT
      ELSE 'OK'::TEXT
    END,
    (COUNT(*)::TEXT || ' invitations stuck in processing state')::TEXT
  FROM workspace_invitations
  WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '5 minutes';
  
  -- Check 2: Users with profiles but no workspace membership
  RETURN QUERY
  SELECT 
    'Orphaned Users'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'WARNING'::TEXT
      ELSE 'OK'::TEXT
    END,
    (COUNT(*)::TEXT || ' users have no workspace membership')::TEXT
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.user_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.owner_id = p.id
  );
  
  -- Check 3: get_member_workspace function exists
  RETURN QUERY
  SELECT 
    'Member Workspace Function'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_member_workspace'
      ) THEN 'OK'::TEXT
      ELSE 'ERROR'::TEXT
    END,
    'Function for fetching member workspaces'::TEXT;
    
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION check_invitation_system_health() TO authenticated;

SELECT 'Production invitation system fixes applied' as status;

-- Run health check
SELECT * FROM check_invitation_system_health();
