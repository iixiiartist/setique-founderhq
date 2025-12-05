-- Migration: Add pagination support to search_gtm_docs RPC function
-- This creates or replaces the full-text search function for GTM docs with pagination
-- Uses the stored search_vector column for performance (populated by trigger)

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
DECLARE
  search_tsquery tsquery;
BEGIN
  -- Pre-compute the tsquery for reuse
  search_tsquery := plainto_tsquery('english', search_query);
  
  -- Return results using stored search_vector for performance
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
    ts_rank(d.search_vector, search_tsquery) AS rank
  FROM gtm_docs d
  WHERE
    d.workspace_id = workspace_id_param
    AND d.is_deleted = false
    AND (
      -- Full-text search using stored search_vector (indexed)
      d.search_vector @@ search_tsquery
      -- Also match partial title matches for better UX (uses trigram index)
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
  'Full-text search for GTM documents with pagination. Uses stored search_vector and ts_rank for relevance ranking. The search_vector is auto-populated by trigger on insert/update.';
