-- Content Studio Tables Migration
-- Creates tables for document persistence and version history

-- ============================================================================
-- Documents Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_studio_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES profiles(id),
    updated_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_studio_documents_workspace 
    ON content_studio_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_studio_documents_updated 
    ON content_studio_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_studio_documents_title 
    ON content_studio_documents USING gin(title gin_trgm_ops);

-- ============================================================================
-- Version History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_studio_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES content_studio_documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    data JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, version)
);

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_content_studio_versions_document 
    ON content_studio_versions(document_id, version DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS
ALTER TABLE content_studio_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_studio_versions ENABLE ROW LEVEL SECURITY;

-- Documents RLS Policies
CREATE POLICY "Users can view documents in their workspace"
    ON content_studio_documents FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create documents in their workspace"
    ON content_studio_documents FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update documents in their workspace"
    ON content_studio_documents FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete documents they created or are admins"
    ON content_studio_documents FOR DELETE
    USING (
        created_by = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Versions RLS Policies
CREATE POLICY "Users can view versions for documents they can access"
    ON content_studio_versions FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM content_studio_documents
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create versions for documents they can update"
    ON content_studio_versions FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM content_studio_documents
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- System can delete old versions (via service role)
CREATE POLICY "Service role can manage versions"
    ON content_studio_versions FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_content_studio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_studio_documents_updated_at
    BEFORE UPDATE ON content_studio_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_content_studio_updated_at();

-- ============================================================================
-- Size Constraint Check
-- ============================================================================

-- Add check to prevent oversized documents (5MB limit for JSONB data)
ALTER TABLE content_studio_documents
    ADD CONSTRAINT content_studio_documents_size_check
    CHECK (pg_column_size(data) < 5242880);

ALTER TABLE content_studio_versions
    ADD CONSTRAINT content_studio_versions_size_check
    CHECK (pg_column_size(data) < 5242880);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE content_studio_documents IS 'Stores Content Studio document data with version tracking';
COMMENT ON TABLE content_studio_versions IS 'Stores historical versions of Content Studio documents';
COMMENT ON COLUMN content_studio_documents.data IS 'Full JSON document including pages, objects, and settings';
COMMENT ON COLUMN content_studio_documents.version IS 'Incrementing version number for conflict detection';
