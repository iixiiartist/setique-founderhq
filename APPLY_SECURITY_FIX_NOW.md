# 🔒 Apply Security Fix for get_workspace_members_with_profiles

## Issue
The `get_workspace_members_with_profiles` function is trying to access `wm.full_name` and `wm.email` columns that don't exist in the `workspace_members` table.

## Fix Applied
Updated the function to:
- Join with `profiles` table to get `full_name` and `email`
- Remove invalid column references from INSERT statements

## Run This SQL

Copy and paste into Supabase SQL Editor:

```sql
-- Fix: get_workspace_members_with_profiles
DROP FUNCTION IF EXISTS public.get_workspace_members_with_profiles(UUID);

CREATE FUNCTION public.get_workspace_members_with_profiles(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  user_id UUID,
  role TEXT,
  full_name TEXT,
  email TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.workspace_id,
    wm.user_id,
    wm.role,
    COALESCE(p.full_name, p.email, '') AS full_name,
    p.email,
    wm.joined_at
  FROM workspace_members wm
  LEFT JOIN profiles p ON p.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id;
END;
$$;

-- Fix: add_owner_to_workspace_members
CREATE OR REPLACE FUNCTION public.add_owner_to_workspace_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    NEW.id,
    NEW.owner_id,
    'owner'
  );
  RETURN NEW;
END;
$$;

-- Fix: admin_add_workspace_member
CREATE OR REPLACE FUNCTION public.admin_add_workspace_member(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Insert the member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    p_workspace_id,
    p_user_id,
    p_role
  )
  RETURNING jsonb_build_object(
    'id', id,
    'workspace_id', workspace_id,
    'user_id', user_id,
    'role', role
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
```

## Expected Result
After running this, the workspace members loading error should be fixed.

## Verify
Refresh your browser and check that:
- No more "column wm.full_name does not exist" errors
- Team members load successfully in Settings → Team
