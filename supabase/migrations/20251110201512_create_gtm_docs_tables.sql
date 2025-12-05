-- ============================================================================
-- GTM Docs Base Migration
-- Creates gtm_docs and gtm_doc_links tables with indexes, RLS, and triggers
-- ============================================================================

-- ============================================================================
-- 1. Create gtm_docs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gtm_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Document metadata
    title TEXT NOT NULL DEFAULT 'Untitled Document',
    doc_type TEXT NOT NULL DEFAULT 'brief' 
        CHECK (doc_type IN ('brief', 'campaign', 'meeting_notes', 'battlecard', 'outbound_template', 'icp_sheet', 'persona', 'competitive_snapshot')),
    
    -- Content storage
    content_json JSONB DEFAULT '{}'::jsonb,
    content_plain TEXT DEFAULT '',
    content TEXT, -- Yjs collaboration column (stores binary/base64 Yjs state)
    
    -- Visibility and templates
    visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private', 'team')),
    is_template BOOLEAN NOT NULL DEFAULT false,
    template_category TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    blocks_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Full-text search vector (auto-populated by trigger)
    search_vector tsvector,
    
    -- Soft delete support (optional - can be removed if not needed)
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- 1b. Add missing columns if table already exists (idempotent migration)
-- ============================================================================
DO $$
BEGIN
    -- Add is_deleted if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gtm_docs' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE public.gtm_docs ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add deleted_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gtm_docs' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.gtm_docs ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    
    -- Add content (Yjs) column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gtm_docs' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.gtm_docs ADD COLUMN content TEXT;
    END IF;
    
    -- Add search_vector if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gtm_docs' 
        AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE public.gtm_docs ADD COLUMN search_vector tsvector;
    END IF;
    
    -- Add blocks_metadata if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gtm_docs' 
        AND column_name = 'blocks_metadata'
    ) THEN
        ALTER TABLE public.gtm_docs ADD COLUMN blocks_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add tags if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gtm_docs' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.gtm_docs ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    
    -- Add template_category if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gtm_docs' 
        AND column_name = 'template_category'
    ) THEN
        ALTER TABLE public.gtm_docs ADD COLUMN template_category TEXT;
    END IF;
END $$;

-- ============================================================================
-- 2. Create gtm_doc_links table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gtm_doc_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL REFERENCES public.gtm_docs(id) ON DELETE CASCADE,
    linked_entity_type TEXT NOT NULL CHECK (linked_entity_type IN ('task', 'event', 'crm', 'chat', 'contact')),
    linked_entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Prevent duplicate links
    UNIQUE(doc_id, linked_entity_type, linked_entity_id)
);

-- ============================================================================
-- 3. Create Indexes for Performance
-- ============================================================================

-- Primary lookup indexes for gtm_docs
CREATE INDEX IF NOT EXISTS gtm_docs_workspace_id_idx ON public.gtm_docs(workspace_id);
CREATE INDEX IF NOT EXISTS gtm_docs_owner_id_idx ON public.gtm_docs(owner_id);
CREATE INDEX IF NOT EXISTS gtm_docs_doc_type_idx ON public.gtm_docs(doc_type);
CREATE INDEX IF NOT EXISTS gtm_docs_updated_at_idx ON public.gtm_docs(updated_at DESC);
CREATE INDEX IF NOT EXISTS gtm_docs_is_template_idx ON public.gtm_docs(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS gtm_docs_visibility_idx ON public.gtm_docs(visibility);
CREATE INDEX IF NOT EXISTS gtm_docs_is_deleted_idx ON public.gtm_docs(is_deleted) WHERE is_deleted = false;

-- Composite index for common list queries
CREATE INDEX IF NOT EXISTS gtm_docs_workspace_updated_idx 
    ON public.gtm_docs(workspace_id, updated_at DESC) 
    WHERE is_deleted = false;

-- Full-text search index (GIN on search_vector)
CREATE INDEX IF NOT EXISTS gtm_docs_search_vector_idx 
    ON public.gtm_docs USING GIN(search_vector);

-- Fallback trigram index for ILIKE title searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS gtm_docs_title_trgm_idx 
    ON public.gtm_docs USING GIN(title gin_trgm_ops);

-- Indexes for gtm_doc_links
CREATE INDEX IF NOT EXISTS gtm_doc_links_doc_id_idx ON public.gtm_doc_links(doc_id);
CREATE INDEX IF NOT EXISTS gtm_doc_links_entity_lookup_idx 
    ON public.gtm_doc_links(linked_entity_type, linked_entity_id);

-- ============================================================================
-- 4. Create Trigger Functions
-- ============================================================================

-- Function to update search_vector on insert/update
CREATE OR REPLACE FUNCTION public.gtm_docs_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_plain, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.gtm_docs_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Create Triggers
-- ============================================================================

-- Trigger for search vector update
DROP TRIGGER IF EXISTS gtm_docs_search_update ON public.gtm_docs;
CREATE TRIGGER gtm_docs_search_update
    BEFORE INSERT OR UPDATE OF title, content_plain, tags ON public.gtm_docs
    FOR EACH ROW
    EXECUTE FUNCTION public.gtm_docs_search_trigger();

-- Trigger for updated_at
DROP TRIGGER IF EXISTS gtm_docs_updated_at_update ON public.gtm_docs;
CREATE TRIGGER gtm_docs_updated_at_update
    BEFORE UPDATE ON public.gtm_docs
    FOR EACH ROW
    EXECUTE FUNCTION public.gtm_docs_updated_at_trigger();

-- ============================================================================
-- 6. Enable Row Level Security
-- ============================================================================
ALTER TABLE public.gtm_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_doc_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS Policies for gtm_docs
-- ============================================================================

-- Helper function to check workspace membership (only create if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'is_workspace_member'
    ) THEN
        CREATE FUNCTION public.is_workspace_member(ws_id UUID)
        RETURNS BOOLEAN AS $func$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = ws_id
                AND user_id = auth.uid()
            );
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    END IF;
END $$;

-- SELECT: Users can see team docs in their workspace OR their own private docs
DROP POLICY IF EXISTS "gtm_docs_select_policy" ON public.gtm_docs;
CREATE POLICY "gtm_docs_select_policy" ON public.gtm_docs
    FOR SELECT
    USING (
        is_deleted = false
        AND (
            -- Team visibility: workspace members can see
            (visibility = 'team' AND is_workspace_member(workspace_id))
            OR
            -- Private visibility: only owner can see
            (visibility = 'private' AND owner_id = auth.uid())
        )
    );

-- INSERT: Users can only insert docs into workspaces they're members of
DROP POLICY IF EXISTS "gtm_docs_insert_policy" ON public.gtm_docs;
CREATE POLICY "gtm_docs_insert_policy" ON public.gtm_docs
    FOR INSERT
    WITH CHECK (
        owner_id = auth.uid()
        AND is_workspace_member(workspace_id)
    );

-- UPDATE: Users can only update their own docs in their workspace
DROP POLICY IF EXISTS "gtm_docs_update_policy" ON public.gtm_docs;
CREATE POLICY "gtm_docs_update_policy" ON public.gtm_docs
    FOR UPDATE
    USING (
        owner_id = auth.uid()
        AND is_workspace_member(workspace_id)
    )
    WITH CHECK (
        owner_id = auth.uid()
        AND is_workspace_member(workspace_id)
    );

-- DELETE: Users can only delete their own docs
DROP POLICY IF EXISTS "gtm_docs_delete_policy" ON public.gtm_docs;
CREATE POLICY "gtm_docs_delete_policy" ON public.gtm_docs
    FOR DELETE
    USING (
        owner_id = auth.uid()
        AND is_workspace_member(workspace_id)
    );

-- ============================================================================
-- 8. RLS Policies for gtm_doc_links
-- ============================================================================

-- SELECT: Can view links for docs user can access
DROP POLICY IF EXISTS "gtm_doc_links_select_policy" ON public.gtm_doc_links;
CREATE POLICY "gtm_doc_links_select_policy" ON public.gtm_doc_links
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.gtm_docs d
            WHERE d.id = doc_id
            AND d.is_deleted = false
            AND (
                (d.visibility = 'team' AND is_workspace_member(d.workspace_id))
                OR (d.visibility = 'private' AND d.owner_id = auth.uid())
            )
        )
    );

-- INSERT: Can only create links for docs user owns
DROP POLICY IF EXISTS "gtm_doc_links_insert_policy" ON public.gtm_doc_links;
CREATE POLICY "gtm_doc_links_insert_policy" ON public.gtm_doc_links
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gtm_docs d
            WHERE d.id = doc_id
            AND d.owner_id = auth.uid()
            AND is_workspace_member(d.workspace_id)
        )
    );

-- DELETE: Can only delete links for docs user owns
DROP POLICY IF EXISTS "gtm_doc_links_delete_policy" ON public.gtm_doc_links;
CREATE POLICY "gtm_doc_links_delete_policy" ON public.gtm_doc_links
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.gtm_docs d
            WHERE d.id = doc_id
            AND d.owner_id = auth.uid()
            AND is_workspace_member(d.workspace_id)
        )
    );

-- ============================================================================
-- 9. Constraints for data integrity
-- ============================================================================

-- Ensure blocks_metadata is a valid JSON object
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'gtm_docs_blocks_metadata_object'
    ) THEN
        ALTER TABLE public.gtm_docs
            ADD CONSTRAINT gtm_docs_blocks_metadata_object
            CHECK (blocks_metadata IS NULL OR jsonb_typeof(blocks_metadata) = 'object');
    END IF;
END $$;

-- Content size limit (10MB for content_json to prevent huge payloads)
ALTER TABLE public.gtm_docs
    DROP CONSTRAINT IF EXISTS gtm_docs_content_json_size;
ALTER TABLE public.gtm_docs
    ADD CONSTRAINT gtm_docs_content_json_size
    CHECK (octet_length(content_json::text) < 10485760);

-- ============================================================================
-- 10. Grant permissions
-- ============================================================================
GRANT ALL ON public.gtm_docs TO authenticated;
GRANT ALL ON public.gtm_doc_links TO authenticated;
GRANT SELECT ON public.gtm_docs TO anon;
GRANT SELECT ON public.gtm_doc_links TO anon;

-- ============================================================================
-- 11. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE public.gtm_docs IS 'GTM Documents - Rich text documents for go-to-market workflows';
COMMENT ON TABLE public.gtm_doc_links IS 'Links GTM docs to tasks, events, CRM items, contacts, and chat';
COMMENT ON COLUMN public.gtm_docs.content_json IS 'Tiptap JSON content for rich text editing';
COMMENT ON COLUMN public.gtm_docs.content_plain IS 'Plain text extraction for search and AI context';
COMMENT ON COLUMN public.gtm_docs.content IS 'Yjs collaboration state for real-time sync';
COMMENT ON COLUMN public.gtm_docs.search_vector IS 'Auto-populated tsvector for full-text search';
COMMENT ON COLUMN public.gtm_docs.blocks_metadata IS 'Structured block layouts (textbox, signature, shapes)';
