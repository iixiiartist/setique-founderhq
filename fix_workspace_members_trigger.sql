-- Fix workspace members for all users (existing and new)
-- Run this in your Supabase SQL Editor

-- Step 1: Add missing workspace members for all existing workspaces
INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
SELECT 
  gen_random_uuid(),
  w.id,
  w.owner_id,
  'owner',
  w.created_at
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm 
  WHERE wm.workspace_id = w.id 
  AND wm.user_id = w.owner_id
);

-- Step 2: Create a function to automatically add owner to workspace_members
CREATE OR REPLACE FUNCTION add_owner_to_workspace_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the workspace owner into workspace_members
  INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.owner_id,
    'owner',
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

-- Step 4: Create the trigger to run after workspace creation
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_workspace_members();

-- Step 5: Verify existing workspaces now have members
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.owner_id,
  COUNT(wm.id) as member_count
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
GROUP BY w.id, w.name, w.owner_id
ORDER BY w.created_at DESC;

-- Step 6: Test that the trigger works (this will show the function exists)
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'workspaces'
AND trigger_name = 'on_workspace_created';
