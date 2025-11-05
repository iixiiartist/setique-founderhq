-- Update Joe's workspace name to "Setique"
UPDATE workspaces 
SET name = 'Setique',
    updated_at = NOW()
WHERE id = '81a0cb25-8191-4f11-add8-6be68daf2994';

-- Verify the update
SELECT id, name, owner_id, updated_at FROM workspaces WHERE id = '81a0cb25-8191-4f11-add8-6be68daf2994';
