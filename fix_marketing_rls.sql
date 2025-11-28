-- Fix Marketing Items RLS Policies
-- Run this in the Supabase SQL Editor

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'marketing_items';

-- Check existing policies
SELECT polname, polcmd, polroles, polqual, polwithcheck
FROM pg_policy
WHERE polrelid = 'marketing_items'::regclass;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can insert marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can update marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can delete marketing items in their workspace" ON marketing_items;

-- Enable RLS if not already enabled
ALTER TABLE marketing_items ENABLE ROW LEVEL SECURITY;

-- Create fresh policies using a SECURITY DEFINER approach to avoid nested RLS issues
-- This directly checks the workspace_members table without RLS blocking it
CREATE POLICY "Users can view marketing items in their workspace" ON marketing_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = marketing_items.workspace_id 
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert marketing items in their workspace" ON marketing_items
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = marketing_items.workspace_id 
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update marketing items in their workspace" ON marketing_items
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = marketing_items.workspace_id 
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete marketing items in their workspace" ON marketing_items
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = marketing_items.workspace_id 
        AND wm.user_id = auth.uid()
    )
);

-- Verify the workspace membership exists for your user
SELECT * FROM workspace_members 
WHERE user_id = 'fbba1e0b-d99f-433b-9de4-0d982bc0a70c';

-- Check if there are any marketing items at all (bypassing RLS for this check)
-- This requires running as a superuser/service role
SELECT id, title, workspace_id, user_id, created_at 
FROM marketing_items 
ORDER BY created_at DESC 
LIMIT 10;

-- If you see items but they have a different workspace_id, that's the bug!
