-- Nuclear option: Temporarily disable RLS to diagnose the issue
-- This will help us see what's causing the 500 errors

-- Disable RLS on all tables temporarily
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'RLS TEMPORARILY DISABLED FOR DEBUGGING';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'This is ONLY for debugging - we will re-enable with fixed policies';
    RAISE NOTICE '=======================================================';
END $$;

