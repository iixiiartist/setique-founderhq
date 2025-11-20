-- ============================================================================
-- Signup & Workspace Members Fix (2025-11-19)
-- Ensures new accounts can be created without referencing non-existent columns
-- and that workspace member lookups return profile data via joins.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Fix get_workspace_members_with_profiles to join profiles for full_name/email
-- --------------------------------------------------------------------------
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
    wm.role::TEXT,
    COALESCE(p.full_name, p.email, '') AS full_name,
    p.email,
    wm.joined_at
  FROM workspace_members wm
  LEFT JOIN profiles p ON p.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id;
END;
$$;

-- --------------------------------------------------------------------------
-- Ensure workspace owners are inserted into workspace_members automatically
-- --------------------------------------------------------------------------
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
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.add_owner_to_workspace_members();

-- --------------------------------------------------------------------------
-- Admin helper to add members without referencing nonexistent columns
-- --------------------------------------------------------------------------
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
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    p_workspace_id,
    p_user_id,
    p_role
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role
  RETURNING jsonb_build_object(
    'id', id,
    'workspace_id', workspace_id,
    'user_id', user_id,
    'role', role
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- --------------------------------------------------------------------------
-- Signup trigger: create profile & workspace without touching workspace_members
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    has_invitation BOOLEAN := FALSE;
    v_workspace_id UUID;
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
            SELECT EXISTS (
                SELECT 1 FROM workspace_invitations 
                WHERE email = NEW.email 
                AND status IN ('pending', 'processing', 'accepted')
                AND expires_at > NOW()
            ) INTO has_invitation;
        ELSE
            has_invitation := FALSE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        has_invitation := FALSE;
    END;
    
    IF NOT has_invitation THEN
        IF NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = NEW.id) THEN
            INSERT INTO public.workspaces (owner_id, name, plan_type)
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email) || '''s Workspace',
                'free'
            )
            RETURNING id INTO v_workspace_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
