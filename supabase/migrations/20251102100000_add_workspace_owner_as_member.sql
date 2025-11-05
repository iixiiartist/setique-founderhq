-- Add workspace owner as member for existing workspace
-- This ensures the owner shows up in the team members list

INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT 
    id as workspace_id,
    owner_id as user_id,
    'owner' as role,
    created_at as joined_at
FROM workspaces
WHERE id = '81a0cb25-8191-4f11-add8-6be68daf2994'
ON CONFLICT (workspace_id, user_id) DO NOTHING;

