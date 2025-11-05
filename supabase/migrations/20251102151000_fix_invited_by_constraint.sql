-- Fix invited_by foreign key constraint
-- The issue is that invited_by references auth.users which may not be accessible
-- Let's drop the constraint and make it just a UUID field

-- Drop the foreign key constraint on invited_by
ALTER TABLE workspace_invitations 
DROP CONSTRAINT IF EXISTS workspace_invitations_invited_by_fkey;

-- Keep invited_by as a simple UUID field (no foreign key)
-- This avoids issues with auth.users table access

-- Also drop the constraint on accepted_by for consistency
ALTER TABLE workspace_invitations 
DROP CONSTRAINT IF EXISTS workspace_invitations_accepted_by_fkey;

-- Note: We keep the foreign key on workspace_id as that's in our own schema
-- and we need it for CASCADE deletes

