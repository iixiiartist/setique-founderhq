-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workspace_invitations table for team member invites
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'owner')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(workspace_id, email, status) -- Prevent duplicate pending invites for same email
);

-- Create indexes for performance
CREATE INDEX idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_status ON workspace_invitations(status);

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for workspace_invitations
-- Workspace owners can view all invitations for their workspace
CREATE POLICY "Owners can view workspace invitations" ON workspace_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_invitations.workspace_id 
            AND owner_id = auth.uid()
        )
    );

-- Workspace owners can create invitations
CREATE POLICY "Owners can create workspace invitations" ON workspace_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_invitations.workspace_id 
            AND owner_id = auth.uid()
        )
        AND invited_by = auth.uid()
    );

-- Workspace owners can revoke invitations
CREATE POLICY "Owners can revoke workspace invitations" ON workspace_invitations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_invitations.workspace_id 
            AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_invitations.workspace_id 
            AND owner_id = auth.uid()
        )
    );

-- Invited users can view their own pending invitations by email
CREATE POLICY "Users can view invitations sent to their email" ON workspace_invitations FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status = 'pending'
    );

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE workspace_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for expired invitations periodically
-- Note: This will run on any insert/update, but in production you'd want a cron job
CREATE TRIGGER trigger_expire_invitations
    AFTER INSERT OR UPDATE ON workspace_invitations
    EXECUTE FUNCTION expire_old_invitations();

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_workspace_invitation(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
    invitation_record workspace_invitations%ROWTYPE;
    user_email TEXT;
    result JSON;
BEGIN
    -- Get current user's email
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    IF user_email IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;
    
    -- Find the invitation
    SELECT * INTO invitation_record
    FROM workspace_invitations
    WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if email matches
    IF invitation_record.email != user_email THEN
        RETURN json_build_object('success', false, 'error', 'This invitation was sent to a different email address');
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = invitation_record.workspace_id 
        AND user_id = auth.uid()
    ) THEN
        -- Mark invitation as accepted anyway
        UPDATE workspace_invitations
        SET status = 'accepted', accepted_at = NOW(), accepted_by = auth.uid()
        WHERE id = invitation_record.id;
        
        RETURN json_build_object('success', true, 'message', 'You are already a member of this workspace', 'workspace_id', invitation_record.workspace_id);
    END IF;
    
    -- Add user to workspace_members
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (invitation_record.workspace_id, auth.uid(), invitation_record.role);
    
    -- Mark invitation as accepted
    UPDATE workspace_invitations
    SET status = 'accepted', accepted_at = NOW(), accepted_by = auth.uid()
    WHERE id = invitation_record.id;
    
    -- Return success with workspace info
    SELECT json_build_object(
        'success', true,
        'workspace_id', w.id,
        'workspace_name', w.name,
        'role', invitation_record.role
    ) INTO result
    FROM workspaces w
    WHERE w.id = invitation_record.workspace_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(TEXT) TO authenticated;

