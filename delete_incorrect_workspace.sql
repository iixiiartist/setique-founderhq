-- Delete II XII's incorrectly created workspace
-- This workspace ID is from the console logs: bbdde463-1683-465a-8fee-63fd05b80d0b

DELETE FROM workspaces WHERE id = 'bbdde463-1683-465a-8fee-63fd05b80d0b';

-- Verify II XII is still a member of Joe's workspace
SELECT 
    wm.workspace_id,
    w.name as workspace_name,
    w.owner_id,
    wm.role
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id = '59c7e41b-bb5f-42a1-8938-e96a5d42d947';

-- Verify the workspace is deleted
SELECT id, name, owner_id FROM workspaces WHERE owner_id = '59c7e41b-bb5f-42a1-8938-e96a5d42d947';
