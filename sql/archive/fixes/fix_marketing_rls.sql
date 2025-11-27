-- Fix Row-Level Security policies for marketing_items table
-- Run this in your Supabase SQL Editor

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can insert marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can update marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can delete marketing items in their workspace" ON marketing_items;

-- Enable RLS
ALTER TABLE marketing_items ENABLE ROW LEVEL SECURITY;

-- Allow users to view marketing items in their workspace
CREATE POLICY "Users can view marketing items in their workspace"
ON marketing_items
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to insert marketing items in their workspace
CREATE POLICY "Users can insert marketing items in their workspace"
ON marketing_items
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to update marketing items in their workspace
CREATE POLICY "Users can update marketing items in their workspace"
ON marketing_items
FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete marketing items in their workspace
CREATE POLICY "Users can delete marketing items in their workspace"
ON marketing_items
FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'marketing_items'
ORDER BY policyname;
