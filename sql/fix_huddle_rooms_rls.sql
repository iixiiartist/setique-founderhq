-- Fix RLS policy for huddle_rooms to allow DM creation
-- Run this in Supabase SQL Editor

-- First, let's check if the user is in the workspace
-- (Run this to debug - replace with your user ID)
-- SELECT is_workspace_member('06ce0397-0587-4f25-abbd-7aefd4072bb3');

-- Drop and recreate the insert policy with better permissions
DROP POLICY IF EXISTS huddle_rooms_insert ON huddle_rooms;

-- Create a more permissive insert policy
-- Users can create rooms if they are a workspace member
CREATE POLICY huddle_rooms_insert ON huddle_rooms
  FOR INSERT WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- User must be the creator
    AND created_by = auth.uid()
    -- User must be a member of the workspace (check both owner and member)
    AND (
      EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id AND owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = huddle_rooms.workspace_id AND user_id = auth.uid()
      )
    )
  );

-- Also ensure the huddle_members insert policy works for self-DMs
DROP POLICY IF EXISTS huddle_members_insert ON huddle_members;

-- Recreate huddle_members insert policy
-- Users can add members to rooms they created or are admin of
CREATE POLICY huddle_members_insert ON huddle_members
  FOR INSERT WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- User must be a workspace member
    AND (
      EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id AND owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = huddle_members.workspace_id AND wm.user_id = auth.uid()
      )
    )
    -- User must have created the room OR be an admin of it OR it's a new room they're creating
    AND (
      EXISTS (
        SELECT 1 FROM huddle_rooms hr
        WHERE hr.id = room_id AND hr.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM huddle_members hm
        WHERE hm.room_id = huddle_members.room_id AND hm.user_id = auth.uid() AND hm.role = 'admin'
      )
    )
  );

-- Grant execute on is_workspace_member function if not already
GRANT EXECUTE ON FUNCTION is_workspace_member TO authenticated;
