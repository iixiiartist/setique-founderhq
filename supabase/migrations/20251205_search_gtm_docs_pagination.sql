-- Migration: Add pagination support to search_gtm_docs RPC function
-- This creates or replaces the full-text search function for GTM docs with pagination

-- Drop the existing function if it exists (to recreate with new signature)
DROP FUNCTION IF EXISTS search_gtm_docs(uuid, text);
DROP FUNCTION IF EXISTS search_gtm_docs(uuid, text, integer, integer);

-- Create the search function with full-text search and pagination
CREATE OR REPLACE FUNCTION search_gtm_docs(
  workspace_id_param UUID,
  search_query TEXT,
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  owner_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  title TEXT,
  doc_type TEXT,
  visibility TEXT,
  is_template BOOLEAN,
  tags TEXT[],
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return results using full-text search with ts_rank for relevance
  RETURN QUERY
  SELECT
    d.id,
    d.workspace_id,
    d.owner_id,
    d.created_at,
    d.updated_at,
    d.title,
    d.doc_type,
    d.visibility,
    d.is_template,
    d.tags,
    ts_rank(
      setweight(to_tsvector('english', COALESCE(d.title, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(d.content_plain, '')), 'B'),
      plainto_tsquery('english', search_query)
    ) AS rank
  FROM gtm_docs d
  WHERE
    d.workspace_id = workspace_id_param
    AND d.is_deleted = false
    AND (
      -- Full-text search on title and content
      to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(d.content_plain, ''))
      @@ plainto_tsquery('english', search_query)
      -- Also match partial title matches for better UX
      OR d.title ILIKE '%' || search_query || '%'
    )
  ORDER BY rank DESC, d.updated_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_gtm_docs(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_gtm_docs(UUID, TEXT, INTEGER, INTEGER) IS 
  'Full-text search for GTM documents with pagination. Uses ts_rank for relevance ranking.';

-- Create index to support full-text search if it doesn't exist
-- Note: This uses IF NOT EXISTS to avoid errors if index already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'gtm_docs_search_idx'
  ) THEN
    CREATE INDEX gtm_docs_search_idx ON gtm_docs 
    USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content_plain, '')));
  END IF;
END
$$;
