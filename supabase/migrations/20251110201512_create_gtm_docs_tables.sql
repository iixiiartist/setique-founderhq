-- Migration: Create GTM Docs System
-- Purpose: Add rich-text document authoring with GTM templates
-- Date: 2025-11-10
-- Author: FounderHQ Team

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

-- Main GTM documents table for authored content
CREATE TABLE IF NOT EXISTS gtm_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Document content
    title TEXT NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN (
        'brief',
        'campaign',
        'meeting_notes',
        'battlecard',
        'outbound_template',
        'icp_sheet',
        'persona',
        'competitive_snapshot'
    )),
    
    -- Rich text storage
    content_json JSONB,                     -- Tiptap/Slate editor format
    content_plain TEXT,                     -- Plain text for search + AI
    
    -- Sharing and organization
    visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private', 'team')),
    is_template BOOLEAN DEFAULT false,
    template_category TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Full-text search
    search_vector tsvector
);

-- Document linking table for flexible associations
CREATE TABLE IF NOT EXISTS gtm_doc_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doc_id UUID NOT NULL REFERENCES gtm_docs(id) ON DELETE CASCADE,
    linked_entity_type TEXT NOT NULL CHECK (linked_entity_type IN ('task', 'event', 'crm', 'chat', 'contact')),
    linked_entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doc_id, linked_entity_type, linked_entity_id)
);

-- ============================================================================
-- PART 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_gtm_docs_workspace_id ON gtm_docs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_gtm_docs_owner_id ON gtm_docs(owner_id);
CREATE INDEX IF NOT EXISTS idx_gtm_docs_doc_type ON gtm_docs(doc_type);
CREATE INDEX IF NOT EXISTS idx_gtm_docs_visibility ON gtm_docs(visibility);
CREATE INDEX IF NOT EXISTS idx_gtm_docs_is_template ON gtm_docs(is_template);
CREATE INDEX IF NOT EXISTS idx_gtm_docs_created_at ON gtm_docs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gtm_docs_search ON gtm_docs USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_gtm_doc_links_doc_id ON gtm_doc_links(doc_id);
CREATE INDEX IF NOT EXISTS idx_gtm_doc_links_entity ON gtm_doc_links(linked_entity_type, linked_entity_id);

-- ============================================================================
-- PART 3: CREATE TRIGGERS
-- ============================================================================

-- Trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION gtm_docs_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content_plain, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gtm_docs_search_update 
BEFORE INSERT OR UPDATE ON gtm_docs 
FOR EACH ROW EXECUTE FUNCTION gtm_docs_search_trigger();

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION gtm_docs_updated_at_trigger() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gtm_docs_updated_at_update
BEFORE UPDATE ON gtm_docs 
FOR EACH ROW EXECUTE FUNCTION gtm_docs_updated_at_trigger();

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE gtm_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_doc_links ENABLE ROW LEVEL SECURITY;

-- GTM Docs Policies
-- Users can view team docs in their workspace OR their own private docs
CREATE POLICY "Users can view accessible docs" ON gtm_docs
    FOR SELECT USING (
        -- Team docs in user's workspace
        (visibility = 'team' AND workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        ))
        OR
        -- User's own docs (private or team)
        owner_id = auth.uid()
    );

-- Users can only insert docs in their own workspace
CREATE POLICY "Users can create docs in their workspace" ON gtm_docs
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
        AND owner_id = auth.uid()
    );

-- Users can only update their own docs
CREATE POLICY "Users can update own docs" ON gtm_docs
    FOR UPDATE USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Users can only delete their own docs
CREATE POLICY "Users can delete own docs" ON gtm_docs
    FOR DELETE USING (owner_id = auth.uid());

-- GTM Doc Links Policies
-- Users can view links for docs they can access
CREATE POLICY "Users can view links for accessible docs" ON gtm_doc_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM gtm_docs 
            WHERE gtm_docs.id = gtm_doc_links.doc_id 
            AND (
                (gtm_docs.visibility = 'team' AND gtm_docs.workspace_id IN (
                    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
                ))
                OR gtm_docs.owner_id = auth.uid()
            )
        )
    );

-- Users can create links for their own docs
CREATE POLICY "Users can create links for own docs" ON gtm_doc_links
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM gtm_docs 
            WHERE gtm_docs.id = gtm_doc_links.doc_id 
            AND gtm_docs.owner_id = auth.uid()
        )
    );

-- Users can delete links for their own docs
CREATE POLICY "Users can delete links for own docs" ON gtm_doc_links
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM gtm_docs 
            WHERE gtm_docs.id = gtm_doc_links.doc_id 
            AND gtm_docs.owner_id = auth.uid()
        )
    );

-- ============================================================================
-- PART 5: COMMENTS
-- ============================================================================

COMMENT ON TABLE gtm_docs IS 'GTM-focused documents with rich text editing (separate from binary file uploads)';
COMMENT ON COLUMN gtm_docs.content_json IS 'Tiptap editor JSON format for rich text';
COMMENT ON COLUMN gtm_docs.content_plain IS 'Plain text version for full-text search and AI context';
COMMENT ON COLUMN gtm_docs.visibility IS 'private = only owner can see, team = all workspace members can see';
COMMENT ON COLUMN gtm_docs.is_template IS 'True for seeded GTM templates that users can clone';
COMMENT ON COLUMN gtm_docs.search_vector IS 'Auto-generated tsvector for full-text search';

COMMENT ON TABLE gtm_doc_links IS 'Flexible linking between GTM docs and other entities (tasks, events, CRM, etc.)';
COMMENT ON COLUMN gtm_doc_links.linked_entity_type IS 'Type of entity: task, event, crm, chat, contact';
COMMENT ON COLUMN gtm_doc_links.linked_entity_id IS 'UUID of the linked entity';
