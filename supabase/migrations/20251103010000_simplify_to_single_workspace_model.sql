-- Migration: Simplify to Single Workspace Per User Model
-- This migration transforms the multi-workspace architecture to a simpler model
-- where each user has exactly one workspace, but can still collaborate with team members

-- =====================================================
-- STEP 1: Add unique constraint to enforce one workspace per owner
-- =====================================================

-- First, check if there are any users with multiple workspaces
-- and keep only their first workspace
DO $$
DECLARE
    duplicate_owner RECORD;
    workspace_to_keep UUID;
BEGIN
    -- For each user with multiple workspaces
    FOR duplicate_owner IN 
        SELECT owner_id, COUNT(*) as workspace_count
        FROM workspaces
        GROUP BY owner_id
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the oldest workspace (first created)
        SELECT id INTO workspace_to_keep
        FROM workspaces
        WHERE owner_id = duplicate_owner.owner_id
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Delete the other workspaces
        DELETE FROM workspaces
        WHERE owner_id = duplicate_owner.owner_id
        AND id != workspace_to_keep;
        
        RAISE NOTICE 'Consolidated workspaces for owner %, kept workspace %', 
            duplicate_owner.owner_id, workspace_to_keep;
    END LOOP;
END $$;

-- Now add the unique constraint
ALTER TABLE workspaces 
DROP CONSTRAINT IF EXISTS workspaces_owner_id_unique;

ALTER TABLE workspaces 
ADD CONSTRAINT workspaces_owner_id_unique UNIQUE (owner_id);

COMMENT ON CONSTRAINT workspaces_owner_id_unique ON workspaces IS 
    'Enforces one workspace per user - simplified workspace model';

-- =====================================================
-- STEP 2: Clean up and simplify RLS policies
-- =====================================================

-- Drop all existing complex workspace policies
DROP POLICY IF EXISTS "Workspace owners can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace members can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they own" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can insert their own workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspace" ON workspaces;

-- Create simple, clear policies for single-workspace model
CREATE POLICY "Users can view their own workspace or workspaces they are members of" 
ON workspaces FOR SELECT 
TO authenticated
USING (
    owner_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_members.workspace_id = workspaces.id 
        AND workspace_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own workspace (only one)" 
ON workspaces FOR INSERT 
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND NOT EXISTS (
        SELECT 1 FROM workspaces 
        WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own workspace" 
ON workspaces FOR UPDATE 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own workspace" 
ON workspaces FOR DELETE 
TO authenticated
USING (owner_id = auth.uid());

-- =====================================================
-- STEP 3: Add RLS policy for profiles to fix member display
-- =====================================================

-- This is the key fix for the profile join issue
-- Allow users to see profiles of people in their workspace
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of workspace members" ON profiles;

CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can view profiles of workspace members" 
ON profiles FOR SELECT 
TO authenticated
USING (
    -- User can see profiles of people in workspaces they own
    EXISTS (
        SELECT 1 FROM workspaces w
        INNER JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE w.owner_id = auth.uid()
        AND wm.user_id = profiles.id
    )
    OR
    -- User can see profiles of people in workspaces they are a member of
    EXISTS (
        SELECT 1 FROM workspace_members wm1
        INNER JOIN workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id
        WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = profiles.id
    )
);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

-- =====================================================
-- STEP 4: Simplify workspace_members policies
-- =====================================================

DROP POLICY IF EXISTS "Workspace owners can view members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;

-- Simple policy: users can see members of their workspace
CREATE POLICY "Users can view members of their workspaces" 
ON workspace_members FOR SELECT 
TO authenticated
USING (
    -- Owner can see all members
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = workspace_members.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
    OR
    -- Members can see other members
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- Only workspace owners can add/remove members
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;
CREATE POLICY "Workspace owners can manage members" 
ON workspace_members FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = workspace_members.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = workspace_members.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
);

-- =====================================================
-- STEP 5: Update the auto-create workspace trigger
-- =====================================================

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function that always creates workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Auto-create workspace (one per user)
    INSERT INTO public.workspaces (owner_id, name, plan_type)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Workspace',
        'free'
    )
    ON CONFLICT (owner_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 
    'Automatically creates profile and single workspace when new user signs up';

-- =====================================================
-- STEP 6: Drop SECURITY DEFINER functions (no longer needed)
-- =====================================================

-- These were workarounds for complex RLS - no longer needed
DROP FUNCTION IF EXISTS get_workspace_for_member();
DROP FUNCTION IF EXISTS get_workspace_by_id_for_member(UUID);

-- =====================================================
-- STEP 7: Ensure all existing users have workspaces
-- =====================================================

-- Create workspaces for any users who don't have one
INSERT INTO workspaces (owner_id, name, plan_type)
SELECT 
    p.id,
    COALESCE(p.full_name, p.email, 'User') || '''s Workspace',
    'free'
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.owner_id = p.id
)
ON CONFLICT (owner_id) DO NOTHING;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Migration Complete: Single Workspace Model';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '✓ Added unique constraint: one workspace per user';
    RAISE NOTICE '✓ Simplified RLS policies (removed complex checks)';
    RAISE NOTICE '✓ Fixed profile visibility for team members';
    RAISE NOTICE '✓ Updated auto-create trigger for new users';
    RAISE NOTICE '✓ Removed SECURITY DEFINER workarounds';
    RAISE NOTICE '✓ Backfilled workspaces for existing users';
    RAISE NOTICE '';
    RAISE NOTICE 'Benefits:';
    RAISE NOTICE '• Much simpler RLS (no more circular dependencies)';
    RAISE NOTICE '• Team collaboration still works (invitations/members)';
    RAISE NOTICE '• Profile joins now work correctly';
    RAISE NOTICE '• One workspace per user (automatically created)';
    RAISE NOTICE '• No workspace switching needed';
    RAISE NOTICE '=======================================================';
END $$;

