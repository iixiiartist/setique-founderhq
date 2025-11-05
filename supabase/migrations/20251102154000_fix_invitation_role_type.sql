-- Fix the accept_workspace_invitation function to properly cast role type
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
    
    -- Add user to workspace_members with explicit type cast
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (invitation_record.workspace_id, auth.uid(), invitation_record.role::workspace_role);
    
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

