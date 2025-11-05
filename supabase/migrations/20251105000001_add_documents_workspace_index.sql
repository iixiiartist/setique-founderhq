-- Add index on workspace_id for documents table to fix timeout issues
-- This is critical for query performance when filtering by workspace

CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);

-- Add comment for documentation
COMMENT ON INDEX idx_documents_workspace_id IS 'Improves query performance when filtering documents by workspace';
