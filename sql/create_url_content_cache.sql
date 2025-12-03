-- URL Content Cache Table
-- Used for caching fetched website content to reduce API calls to You.com

-- Create the cache table
CREATE TABLE IF NOT EXISTS url_content_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    content_markdown TEXT,
    content_html TEXT,
    title TEXT,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint on url + workspace
    CONSTRAINT url_content_cache_url_workspace_unique UNIQUE(url, workspace_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_url_content_cache_url ON url_content_cache(url);
CREATE INDEX IF NOT EXISTS idx_url_content_cache_workspace ON url_content_cache(workspace_id);
CREATE INDEX IF NOT EXISTS idx_url_content_cache_fetched ON url_content_cache(fetched_at);

-- Enable RLS
ALTER TABLE url_content_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view cached content for their workspace
CREATE POLICY "Users can view workspace cached content" ON url_content_cache
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert cached content for their workspace
CREATE POLICY "Users can insert workspace cached content" ON url_content_cache
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update cached content for their workspace
CREATE POLICY "Users can update workspace cached content" ON url_content_cache
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete cached content for their workspace
CREATE POLICY "Users can delete workspace cached content" ON url_content_cache
    FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Comment on table
COMMENT ON TABLE url_content_cache IS 'Cache for website content fetched via You.com Content API for company enrichment';
COMMENT ON COLUMN url_content_cache.url IS 'The URL that was fetched';
COMMENT ON COLUMN url_content_cache.content_markdown IS 'Fetched content in Markdown format';
COMMENT ON COLUMN url_content_cache.content_html IS 'Fetched content in HTML format (optional)';
COMMENT ON COLUMN url_content_cache.fetched_at IS 'When the content was last fetched (for cache invalidation)';
