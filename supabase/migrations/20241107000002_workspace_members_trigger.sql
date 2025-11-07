-- Migration: Setup workspace members trigger
-- Created: 2024-11-07
-- Description: Ensures all workspace owners are automatically added to workspace_members table.
--              This is critical for RLS policies to work correctly.

-- Step 1: Backfill existing workspaces - add owners to workspace_members
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
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
);

-- Step 2: Create function to automatically add owner to workspace_members
CREATE OR REPLACE FUNCTION add_owner_to_workspace_members()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
  VALUES (gen_random_uuid(), NEW.id, NEW.owner_id, 'owner', NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop existing trigger if present
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

-- Step 4: Create trigger to run after workspace insertion
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_workspace_members();

-- Verification query (optional - run separately to check)
-- SELECT 
--   w.id as workspace_id,
--   w.name as workspace_name,
--   w.owner_id,
--   wm.user_id as member_user_id,
--   wm.role
-- FROM workspaces w
-- LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND w.owner_id = wm.user_id
-- ORDER BY w.created_at DESC;
