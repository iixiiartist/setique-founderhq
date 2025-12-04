-- ============================================================================
-- Atomic DM Room Creation RPC
-- Prevents race conditions when multiple users try to create the same DM room
-- ============================================================================

-- Drop any existing versions of the function to avoid signature conflicts
DROP FUNCTION IF EXISTS get_or_create_dm_room(UUID, UUID[]);
DROP FUNCTION IF EXISTS get_or_create_dm_room(UUID, UUID[], UUID);

-- Add a computed column for sorted member IDs (for indexing DM lookups)
-- This avoids client-side sorting and enables indexed lookups
ALTER TABLE huddle_rooms 
ADD COLUMN IF NOT EXISTS dm_member_ids UUID[] DEFAULT NULL;

-- Create unique index on workspace + sorted member IDs for DMs
-- This prevents duplicate DM rooms and enables fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_huddle_rooms_dm_members 
ON huddle_rooms (workspace_id, dm_member_ids) 
WHERE type = 'dm' AND archived_at IS NULL AND dm_member_ids IS NOT NULL;

-- Create index for faster member-based room lookups
CREATE INDEX IF NOT EXISTS idx_huddle_rooms_workspace_type_active
ON huddle_rooms (workspace_id, type, last_message_at DESC NULLS LAST)
WHERE archived_at IS NULL;

-- RPC function to atomically get or create a DM room
CREATE OR REPLACE FUNCTION get_or_create_dm_room(
  p_workspace_id UUID,
  p_user_ids UUID[],
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_sorted_ids UUID[];
BEGIN
  -- Sort user IDs for consistent lookup
  SELECT array_agg(x ORDER BY x) INTO v_sorted_ids FROM unnest(p_user_ids) x;
  
  -- Try to find existing DM room with these exact members
  SELECT id INTO v_room_id
  FROM huddle_rooms
  WHERE workspace_id = p_workspace_id
    AND type = 'dm'
    AND dm_member_ids = v_sorted_ids
    AND archived_at IS NULL
  LIMIT 1;
  
  -- If found, return it
  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;
  
  -- Create new DM room with unique constraint protection
  INSERT INTO huddle_rooms (
    workspace_id,
    type,
    is_private,
    created_by,
    dm_member_ids,
    settings
  )
  VALUES (
    p_workspace_id,
    'dm',
    true,
    p_created_by,
    v_sorted_ids,
    jsonb_build_object(
      'ai_allowed', true,
      'auto_summarize', false,
      'ai_can_write', false
    )
  )
  ON CONFLICT (workspace_id, dm_member_ids) 
  WHERE type = 'dm' AND archived_at IS NULL AND dm_member_ids IS NOT NULL
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_room_id;
  
  -- Add members to the room
  INSERT INTO huddle_members (room_id, workspace_id, user_id, role)
  SELECT v_room_id, p_workspace_id, unnest(p_user_ids), 
         CASE WHEN unnest(p_user_ids) = p_created_by THEN 'admin' ELSE 'member' END
  ON CONFLICT (room_id, user_id) DO NOTHING;
  
  RETURN v_room_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_dm_room(UUID, UUID[], UUID) TO authenticated;

-- Backfill dm_member_ids for existing DM rooms
DO $$
DECLARE
  r RECORD;
  sorted_ids UUID[];
BEGIN
  FOR r IN 
    SELECT 
      hr.id as room_id,
      array_agg(hm.user_id ORDER BY hm.user_id) as member_ids
    FROM huddle_rooms hr
    JOIN huddle_members hm ON hm.room_id = hr.id
    WHERE hr.type = 'dm' AND hr.dm_member_ids IS NULL
    GROUP BY hr.id
  LOOP
    UPDATE huddle_rooms 
    SET dm_member_ids = r.member_ids
    WHERE id = r.room_id;
  END LOOP;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_or_create_dm_room IS 'Atomically finds or creates a DM room for the given users. Uses unique constraint to prevent race conditions.';
