-- Fix unique constraint to allow re-inviting after revocation
-- The current constraint prevents re-inviting the same email if there's any pending invitation
-- We should only prevent duplicate PENDING invitations

-- Drop the old constraint
ALTER TABLE workspace_invitations 
DROP CONSTRAINT IF EXISTS workspace_invitations_workspace_id_email_status_key;

-- Add new constraint that only prevents duplicate pending invitations
-- This allows you to have multiple revoked/expired/accepted invitations for the same email
ALTER TABLE workspace_invitations
ADD CONSTRAINT unique_pending_invitation 
EXCLUDE USING btree (workspace_id WITH =, email WITH =) 
WHERE (status = 'pending');

