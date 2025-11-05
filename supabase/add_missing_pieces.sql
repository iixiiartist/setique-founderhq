-- Add missing database pieces
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add is_admin column to profiles table if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 2. Create get_workspace_members_with_profiles function
CREATE OR REPLACE FUNCTION get_workspace_members_with_profiles(workspace_uuid UUID)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  user_id UUID,
  role workspace_role,
  joined_at TIMESTAMP WITH TIME ZONE,
  profile_id UUID,
  profile_email TEXT,
  profile_full_name TEXT,
  profile_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.workspace_id,
    wm.user_id,
    wm.role,
    wm.joined_at,
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_full_name,
    p.avatar_url as profile_avatar_url
  FROM workspace_members wm
  INNER JOIN profiles p ON p.id = wm.user_id
  WHERE wm.workspace_id = workspace_uuid;
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_workspace_members_with_profiles(UUID) TO authenticated;

-- 4. Make joe@setique.com admin
UPDATE profiles 
SET is_admin = TRUE 
WHERE email LIKE '%@setique.com' OR email = 'joe@setique.com';

-- 5. Upgrade joe@setique.com workspace to team-pro plan
UPDATE workspaces 
SET plan_type = 'team-pro',
    updated_at = NOW()
WHERE owner_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@setique.com' OR email = 'joe@setique.com'
);

SELECT 'Missing pieces added successfully! Admin status updated. Workspace upgraded to team-pro!' as status;
