-- Fix RLS policies for workspace_invitations to avoid auth.users access

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON workspace_invitations;

-- Create new policy that uses profiles table instead
CREATE POLICY "Users can view invitations sent to their email" ON workspace_invitations FOR SELECT
    USING (
        email = (SELECT email FROM profiles WHERE id = auth.uid())
        AND status = 'pending'
    );

