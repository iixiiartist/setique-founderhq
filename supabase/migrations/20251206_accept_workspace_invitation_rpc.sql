-- ============================================================================
-- Accept Workspace Invitation RPC
-- Securely accepts a workspace invitation with proper validation
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS accept_workspace_invitation(TEXT);
DROP FUNCTION IF EXISTS accept_workspace_invitation(UUID);

CREATE OR REPLACE FUNCTION accept_workspace_invitation(invitation_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_invitation workspace_invitations%ROWTYPE;
    v_workspace_name TEXT;
    v_existing_member_id UUID;
BEGIN
    -- Get the authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You must be logged in to accept an invitation'
        );
    END IF;
    
    -- Get user's email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Could not verify your email address'
        );
    END IF;
    
    -- Look up the invitation
    SELECT * INTO v_invitation
    FROM workspace_invitations
    WHERE token = invitation_token;
    
    IF v_invitation.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid invitation token'
        );
    END IF;
    
    -- Check if invitation is expired
    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This invitation has expired'
        );
    END IF;
    
    -- Check if invitation is already used
    IF v_invitation.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This invitation has already been used'
        );
    END IF;
    
    -- ========== SECURITY: Verify the invitation email matches the authenticated user ==========
    IF LOWER(TRIM(v_invitation.email)) != LOWER(TRIM(v_user_email)) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This invitation was sent to a different email address. Please log in with the email that received the invitation.'
        );
    END IF;
    
    -- Get workspace name for the response
    SELECT name INTO v_workspace_name
    FROM workspaces
    WHERE id = v_invitation.workspace_id;
    
    -- Check if user is already a member
    SELECT id INTO v_existing_member_id
    FROM workspace_members
    WHERE workspace_id = v_invitation.workspace_id
      AND user_id = v_user_id;
    
    IF v_existing_member_id IS NOT NULL THEN
        -- User is already a member, mark invitation as accepted and return success
        UPDATE workspace_invitations
        SET status = 'accepted',
            accepted_at = NOW()
        WHERE id = v_invitation.id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'You are already a member of this workspace',
            'workspace_id', v_invitation.workspace_id,
            'workspace_name', v_workspace_name,
            'already_member', true
        );
    END IF;
    
    -- Add user to workspace members
    INSERT INTO workspace_members (
        workspace_id,
        user_id,
        role,
        invited_by
    ) VALUES (
        v_invitation.workspace_id,
        v_user_id,
        v_invitation.role,
        v_invitation.invited_by
    );
    
    -- Mark invitation as accepted
    UPDATE workspace_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Try to increment used_seats (may not exist on all plans)
    BEGIN
        PERFORM increment_used_seats(v_invitation.workspace_id);
    EXCEPTION WHEN undefined_function THEN
        -- Function doesn't exist, skip
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'You have been added to the workspace',
        'workspace_id', v_invitation.workspace_id,
        'workspace_name', v_workspace_name,
        'role', v_invitation.role
    );
    
EXCEPTION WHEN unique_violation THEN
    -- Handle race condition - user was added while we were processing
    RETURN jsonb_build_object(
        'success', true,
        'message', 'You are already a member of this workspace',
        'already_member', true
    );
WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to accept invitation: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION accept_workspace_invitation(TEXT) IS 
'Accepts a workspace invitation. Validates that:
1. User is authenticated
2. Invitation token is valid and pending
3. Invitation has not expired
4. CRITICAL: The authenticated user''s email matches the invitation email
This prevents stolen tokens from being used by unauthorized accounts.';
