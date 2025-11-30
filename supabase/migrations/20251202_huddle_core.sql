-- ============================================================================
-- HUDDLE CORE - Slack-style Team Chat with AI Integration
-- ============================================================================
-- Features:
-- - Channels (public/private) and DMs
-- - Threaded conversations
-- - AI integration (Groq + You.com) via explicit invocation
-- - File attachments with links to File Library/Forms/Docs
-- - Reactions, read receipts, unread tracking
-- - AI-generated thread summaries
-- ============================================================================

-- ============================================================================
-- PART 1: CORE TABLES
-- ============================================================================

-- Rooms (channels and DMs)
CREATE TABLE IF NOT EXISTS huddle_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('channel', 'dm')),
  name TEXT, -- NULL for DMs (auto-generated from members)
  slug TEXT, -- URL-friendly identifier for channels
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  settings JSONB NOT NULL DEFAULT jsonb_build_object(
    'ai_allowed', true,
    'auto_summarize', false,
    'ai_can_write', false,  -- Can AI create tasks/notes, or read-only?
    'retention_days', null   -- null = forever
  ),
  last_message_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique slug per workspace (only for channels with slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_huddle_rooms_workspace_slug 
  ON huddle_rooms(workspace_id, slug) 
  WHERE slug IS NOT NULL;

-- Index for listing rooms
CREATE INDEX IF NOT EXISTS idx_huddle_rooms_workspace_type 
  ON huddle_rooms(workspace_id, type, archived_at);

-- Members (required for private channels and DMs)
CREATE TABLE IF NOT EXISTS huddle_members (
  room_id UUID NOT NULL REFERENCES huddle_rooms(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  notifications TEXT NOT NULL DEFAULT 'all' CHECK (notifications IN ('all', 'mentions', 'none')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_huddle_members_user 
  ON huddle_members(user_id, workspace_id);

-- Messages
CREATE TABLE IF NOT EXISTS huddle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES huddle_rooms(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL for AI/system posts
  
  -- Content
  body TEXT NOT NULL,
  body_format TEXT NOT NULL DEFAULT 'markdown' CHECK (body_format IN ('markdown', 'plain')),
  
  -- Threading
  thread_root_id UUID REFERENCES huddle_messages(id) ON DELETE CASCADE,
  reply_count INTEGER NOT NULL DEFAULT 0,
  
  -- Rich metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  -- Structure: {
  --   ai_request_id: uuid,
  --   tool_calls: [{name, arguments, result}],
  --   web_sources: [{title, url, snippet}],
  --   linked_entities: {
  --     tasks: [uuid],
  --     contacts: [uuid],
  --     deals: [uuid],
  --     documents: [uuid],
  --     forms: [uuid],
  --     files: [uuid]
  --   },
  --   mentions: [user_id],
  --   moderation: {flagged, reason}
  -- }
  
  -- Attachments (inline file references)
  attachments JSONB DEFAULT '[]'::JSONB,
  -- Structure: [{
  --   id: uuid,
  --   type: 'upload' | 'file_library' | 'document' | 'form',
  --   name: string,
  --   mime: string,
  --   size: number,
  --   url: string,
  --   source_id: uuid (reference to original)
  -- }]
  
  -- System flags
  is_system BOOLEAN NOT NULL DEFAULT false, -- System messages (joined, left, etc.)
  is_ai BOOLEAN NOT NULL DEFAULT false, -- AI-generated message
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ -- Soft delete for edit history
);

-- Primary query index
CREATE INDEX IF NOT EXISTS idx_huddle_messages_room_created 
  ON huddle_messages(room_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Thread replies
CREATE INDEX IF NOT EXISTS idx_huddle_messages_thread 
  ON huddle_messages(thread_root_id, created_at)
  WHERE thread_root_id IS NOT NULL AND deleted_at IS NULL;

-- Search index
CREATE INDEX IF NOT EXISTS idx_huddle_messages_search 
  ON huddle_messages USING gin(to_tsvector('english', body));

-- AI message lookup
CREATE INDEX IF NOT EXISTS idx_huddle_messages_ai 
  ON huddle_messages(room_id, created_at DESC)
  WHERE is_ai = true;

-- ============================================================================
-- PART 2: SUPPORTING TABLES
-- ============================================================================

-- AI-generated thread/room summaries (pinnable)
CREATE TABLE IF NOT EXISTS huddle_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES huddle_rooms(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  thread_root_id UUID REFERENCES huddle_messages(id) ON DELETE CASCADE, -- NULL = room summary
  
  summary TEXT NOT NULL,
  key_points JSONB DEFAULT '[]'::JSONB, -- Array of bullet points
  action_items JSONB DEFAULT '[]'::JSONB, -- Suggested tasks
  decisions JSONB DEFAULT '[]'::JSONB, -- Key decisions made
  
  message_range JSONB, -- {from_id, to_id, count}
  
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  generated_by UUID REFERENCES profiles(id), -- NULL if auto-generated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_huddle_summaries_room 
  ON huddle_summaries(room_id, created_at DESC);

-- File attachments (detailed tracking)
CREATE TABLE IF NOT EXISTS huddle_message_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES huddle_messages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT,
  size BIGINT,
  
  -- Link to existing resources
  source_type TEXT CHECK (source_type IN ('upload', 'file_library', 'document', 'form')),
  source_id UUID, -- Reference to documents.id, forms.id, etc.
  
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_huddle_files_message 
  ON huddle_message_files(message_id);

-- Reactions
CREATE TABLE IF NOT EXISTS huddle_message_reactions (
  message_id UUID NOT NULL REFERENCES huddle_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_huddle_reactions_message 
  ON huddle_message_reactions(message_id);

-- Read receipts (per user per room)
CREATE TABLE IF NOT EXISTS huddle_reads (
  room_id UUID NOT NULL REFERENCES huddle_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_message_id UUID REFERENCES huddle_messages(id),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_huddle_reads_user 
  ON huddle_reads(user_id);

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE huddle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_message_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS huddle_rooms_select ON huddle_rooms;
DROP POLICY IF EXISTS huddle_rooms_insert ON huddle_rooms;
DROP POLICY IF EXISTS huddle_rooms_update ON huddle_rooms;
DROP POLICY IF EXISTS huddle_members_select ON huddle_members;
DROP POLICY IF EXISTS huddle_members_insert ON huddle_members;
DROP POLICY IF EXISTS huddle_members_delete ON huddle_members;
DROP POLICY IF EXISTS huddle_messages_select ON huddle_messages;
DROP POLICY IF EXISTS huddle_messages_insert ON huddle_messages;
DROP POLICY IF EXISTS huddle_messages_update ON huddle_messages;
DROP POLICY IF EXISTS huddle_messages_service_insert ON huddle_messages;
DROP POLICY IF EXISTS huddle_summaries_select ON huddle_summaries;
DROP POLICY IF EXISTS huddle_summaries_insert ON huddle_summaries;
DROP POLICY IF EXISTS huddle_summaries_service ON huddle_summaries;
DROP POLICY IF EXISTS huddle_files_select ON huddle_message_files;
DROP POLICY IF EXISTS huddle_files_insert ON huddle_message_files;
DROP POLICY IF EXISTS huddle_reactions_select ON huddle_message_reactions;
DROP POLICY IF EXISTS huddle_reactions_insert ON huddle_message_reactions;
DROP POLICY IF EXISTS huddle_reactions_delete ON huddle_message_reactions;
DROP POLICY IF EXISTS huddle_reads_select ON huddle_reads;
DROP POLICY IF EXISTS huddle_reads_upsert ON huddle_reads;
DROP POLICY IF EXISTS huddle_reads_update ON huddle_reads;

-- Helper function: check if user can access a room
CREATE OR REPLACE FUNCTION can_access_huddle_room(p_room_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room RECORD;
BEGIN
  SELECT workspace_id, is_private, type
  INTO v_room
  FROM huddle_rooms
  WHERE id = p_room_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Must be workspace member
  IF NOT is_workspace_member(v_room.workspace_id) THEN
    RETURN false;
  END IF;
  
  -- Public channels: any workspace member
  IF NOT v_room.is_private THEN
    RETURN true;
  END IF;
  
  -- Private channels/DMs: must be a member
  RETURN EXISTS (
    SELECT 1 FROM huddle_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
END;
$$;

-- ROOMS: workspace members can see all non-private, members see private
CREATE POLICY huddle_rooms_select ON huddle_rooms
  FOR SELECT USING (
    is_workspace_member(workspace_id)
    AND (
      NOT is_private
      OR EXISTS (SELECT 1 FROM huddle_members m WHERE m.room_id = id AND m.user_id = auth.uid())
    )
  );

CREATE POLICY huddle_rooms_insert ON huddle_rooms
  FOR INSERT WITH CHECK (
    is_workspace_member(workspace_id)
    AND created_by = auth.uid()
  );

CREATE POLICY huddle_rooms_update ON huddle_rooms
  FOR UPDATE USING (
    is_workspace_member(workspace_id)
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM huddle_members m WHERE m.room_id = id AND m.user_id = auth.uid() AND m.role = 'admin')
    )
  );

-- MEMBERS: workspace members can manage membership for rooms they can access
CREATE POLICY huddle_members_select ON huddle_members
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY huddle_members_insert ON huddle_members
  FOR INSERT WITH CHECK (
    is_workspace_member(workspace_id)
    AND can_access_huddle_room(room_id)
  );

CREATE POLICY huddle_members_delete ON huddle_members
  FOR DELETE USING (
    is_workspace_member(workspace_id)
    AND (
      user_id = auth.uid() -- Can leave
      OR EXISTS (SELECT 1 FROM huddle_members m WHERE m.room_id = room_id AND m.user_id = auth.uid() AND m.role = 'admin')
    )
  );

-- MESSAGES: must be able to access the room
CREATE POLICY huddle_messages_select ON huddle_messages
  FOR SELECT USING (can_access_huddle_room(room_id));

CREATE POLICY huddle_messages_insert ON huddle_messages
  FOR INSERT WITH CHECK (
    can_access_huddle_room(room_id)
    AND (user_id = auth.uid() OR user_id IS NULL) -- Users post as themselves, AI posts as NULL
  );

CREATE POLICY huddle_messages_update ON huddle_messages
  FOR UPDATE USING (
    can_access_huddle_room(room_id)
    AND user_id = auth.uid() -- Only edit own messages
  );

-- Service role can insert AI messages (user_id = NULL)
CREATE POLICY huddle_messages_service_insert ON huddle_messages
  FOR INSERT TO service_role
  WITH CHECK (true);

-- SUMMARIES: same as messages
CREATE POLICY huddle_summaries_select ON huddle_summaries
  FOR SELECT USING (can_access_huddle_room(room_id));

CREATE POLICY huddle_summaries_insert ON huddle_summaries
  FOR INSERT WITH CHECK (can_access_huddle_room(room_id));

CREATE POLICY huddle_summaries_service ON huddle_summaries
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- FILES: follow message access
CREATE POLICY huddle_files_select ON huddle_message_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM huddle_messages m 
      WHERE m.id = message_id AND can_access_huddle_room(m.room_id)
    )
  );

CREATE POLICY huddle_files_insert ON huddle_message_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM huddle_messages m 
      WHERE m.id = message_id AND can_access_huddle_room(m.room_id)
    )
  );

-- REACTIONS: same room access check
CREATE POLICY huddle_reactions_select ON huddle_message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM huddle_messages m 
      WHERE m.id = message_id AND can_access_huddle_room(m.room_id)
    )
  );

CREATE POLICY huddle_reactions_insert ON huddle_message_reactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM huddle_messages m 
      WHERE m.id = message_id AND can_access_huddle_room(m.room_id)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY huddle_reactions_delete ON huddle_message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- READS: users can only manage their own read receipts
CREATE POLICY huddle_reads_select ON huddle_reads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY huddle_reads_upsert ON huddle_reads
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    AND can_access_huddle_room(room_id)
  );

CREATE POLICY huddle_reads_update ON huddle_reads
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- PART 4: TRIGGERS
-- ============================================================================

-- Update room's last_message_at when new message is posted
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE huddle_rooms
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_huddle_message_update_room
  AFTER INSERT ON huddle_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_room_last_message();

-- Increment reply_count on thread root when reply is added
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.thread_root_id IS NOT NULL THEN
    UPDATE huddle_messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.thread_root_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_huddle_message_reply_count
  AFTER INSERT ON huddle_messages
  FOR EACH ROW
  WHEN (NEW.thread_root_id IS NOT NULL)
  EXECUTE FUNCTION update_thread_reply_count();

-- Auto-populate workspace_id from room on member insert
CREATE OR REPLACE FUNCTION set_huddle_member_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT workspace_id INTO NEW.workspace_id
    FROM huddle_rooms WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_huddle_member_workspace
  BEFORE INSERT ON huddle_members
  FOR EACH ROW
  EXECUTE FUNCTION set_huddle_member_workspace();

-- Auto-populate workspace_id from room on message insert
CREATE OR REPLACE FUNCTION set_huddle_message_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT workspace_id INTO NEW.workspace_id
    FROM huddle_rooms WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_huddle_message_workspace
  BEFORE INSERT ON huddle_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_huddle_message_workspace();

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Get or create a DM room between users
CREATE OR REPLACE FUNCTION get_or_create_dm_room(
  p_workspace_id UUID,
  p_user_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_user_id UUID;
  v_sorted_ids UUID[];
BEGIN
  -- Sort user IDs for consistent lookup
  SELECT array_agg(uid ORDER BY uid) INTO v_sorted_ids
  FROM unnest(p_user_ids) AS uid;
  
  -- Find existing DM room with exact same members
  SELECT r.id INTO v_room_id
  FROM huddle_rooms r
  WHERE r.workspace_id = p_workspace_id
    AND r.type = 'dm'
    AND (
      SELECT array_agg(m.user_id ORDER BY m.user_id)
      FROM huddle_members m
      WHERE m.room_id = r.id
    ) = v_sorted_ids;
  
  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;
  
  -- Create new DM room
  INSERT INTO huddle_rooms (workspace_id, type, is_private, created_by)
  VALUES (p_workspace_id, 'dm', true, auth.uid())
  RETURNING id INTO v_room_id;
  
  -- Add all members
  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    INSERT INTO huddle_members (room_id, workspace_id, user_id, role)
    VALUES (v_room_id, p_workspace_id, v_user_id, 'member')
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN v_room_id;
END;
$$;

-- Get unread count for a user across all rooms
CREATE OR REPLACE FUNCTION get_huddle_unread_counts(p_workspace_id UUID)
RETURNS TABLE (
  room_id UUID,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS room_id,
    COUNT(m.id)::BIGINT AS unread_count
  FROM huddle_rooms r
  LEFT JOIN huddle_reads rd ON rd.room_id = r.id AND rd.user_id = auth.uid()
  LEFT JOIN huddle_messages m ON m.room_id = r.id 
    AND m.deleted_at IS NULL
    AND (rd.last_read_at IS NULL OR m.created_at > rd.last_read_at)
  WHERE r.workspace_id = p_workspace_id
    AND r.archived_at IS NULL
    AND can_access_huddle_room(r.id)
  GROUP BY r.id;
END;
$$;

-- Mark room as read
CREATE OR REPLACE FUNCTION mark_huddle_room_read(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_message_id UUID;
BEGIN
  -- Get the latest message ID
  SELECT id INTO v_last_message_id
  FROM huddle_messages
  WHERE room_id = p_room_id AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Upsert read receipt
  INSERT INTO huddle_reads (room_id, user_id, last_read_at, last_read_message_id)
  VALUES (p_room_id, auth.uid(), now(), v_last_message_id)
  ON CONFLICT (room_id, user_id) 
  DO UPDATE SET 
    last_read_at = now(),
    last_read_message_id = v_last_message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_access_huddle_room TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_dm_room TO authenticated;
GRANT EXECUTE ON FUNCTION get_huddle_unread_counts TO authenticated;
GRANT EXECUTE ON FUNCTION mark_huddle_room_read TO authenticated;

-- ============================================================================
-- PART 6: REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for messages and reads
ALTER PUBLICATION supabase_realtime ADD TABLE huddle_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE huddle_reads;

-- Note: Typing indicators use Supabase Realtime Presence (ephemeral, not stored)
-- Client-side: supabase.channel('huddle:room_id').track({typing: true, user_id})

COMMENT ON TABLE huddle_rooms IS 'Chat rooms - channels (public/private) and DMs';
COMMENT ON TABLE huddle_members IS 'Room membership for private channels and DMs';
COMMENT ON TABLE huddle_messages IS 'Chat messages with threading, AI integration, and rich attachments';
COMMENT ON TABLE huddle_summaries IS 'AI-generated thread/room summaries, pinnable';
COMMENT ON TABLE huddle_message_files IS 'File attachments linked to messages';
COMMENT ON TABLE huddle_message_reactions IS 'Emoji reactions on messages';
COMMENT ON TABLE huddle_reads IS 'Read receipts for unread tracking';
