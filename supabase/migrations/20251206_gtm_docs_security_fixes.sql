-- ============================================================================
-- GTM Docs Security & Performance Fixes
-- Addresses: RPC security, RLS policy gaps, Yjs size limit, search backfill
-- ============================================================================

-- ============================================================================
-- 1. Fix search_gtm_docs RPC to enforce workspace membership
-- ============================================================================

-- Drop existing functions to recreate with security fix
DROP FUNCTION IF EXISTS search_gtm_docs(uuid, text);
DROP FUNCTION IF EXISTS search_gtm_docs(uuid, text, integer, integer);

-- Create the search function with proper security checks
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
SET row_security = on
AS $$
DECLARE
  search_tsquery tsquery;
  current_user_id UUID;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Security check: User must be a member of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_id_param
    AND user_id = current_user_id
  ) THEN
    -- Return empty result set for non-members
    RETURN;
  END IF;

  -- Pre-compute the tsquery for reuse
  search_tsquery := plainto_tsquery('english', search_query);
  
  -- Return results using stored search_vector for performance
  -- Only returns docs the user can access (team docs or their own private docs)
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
    -- Apply visibility rules (same as RLS SELECT policy)
    AND (
      (d.visibility = 'team')
      OR (d.visibility = 'private' AND d.owner_id = current_user_id)
    )
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

COMMENT ON FUNCTION search_gtm_docs(UUID, TEXT, INTEGER, INTEGER) IS 
  'Full-text search for GTM documents with pagination. Enforces workspace membership and visibility rules.';

-- ============================================================================
-- 2. Fix RLS INSERT policy to allow owners without explicit membership
-- (Owners are implicitly workspace members via workspace creation)
-- ============================================================================

DROP POLICY IF EXISTS "gtm_docs_insert_policy" ON public.gtm_docs;
CREATE POLICY "gtm_docs_insert_policy" ON public.gtm_docs
    FOR INSERT
    WITH CHECK (
        owner_id = auth.uid()
        AND (
            -- User is workspace member
            is_workspace_member(workspace_id)
            OR
            -- OR user is the workspace owner (handles edge case where owner not in workspace_members)
            EXISTS (
                SELECT 1 FROM public.workspaces w
                WHERE w.id = workspace_id
                AND w.owner_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- 3. Fix gtm_doc_links INSERT policy to allow team members to link team docs
-- ============================================================================

DROP POLICY IF EXISTS "gtm_doc_links_insert_policy" ON public.gtm_doc_links;
CREATE POLICY "gtm_doc_links_insert_policy" ON public.gtm_doc_links
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gtm_docs d
            WHERE d.id = doc_id
            AND d.is_deleted = false
            AND (
                -- Owner can always link their own docs
                d.owner_id = auth.uid()
                OR
                -- Team members can link team-visible docs
                (d.visibility = 'team' AND is_workspace_member(d.workspace_id))
            )
        )
    );

-- Also fix DELETE policy for consistency
DROP POLICY IF EXISTS "gtm_doc_links_delete_policy" ON public.gtm_doc_links;
CREATE POLICY "gtm_doc_links_delete_policy" ON public.gtm_doc_links
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.gtm_docs d
            WHERE d.id = doc_id
            AND d.is_deleted = false
            AND (
                -- Owner can always unlink their own docs
                d.owner_id = auth.uid()
                OR
                -- Team members can unlink from team-visible docs
                (d.visibility = 'team' AND is_workspace_member(d.workspace_id))
            )
        )
    );

-- ============================================================================
-- 4. Add size constraint on Yjs content column to prevent bloat
-- ============================================================================

-- Add constraint to limit Yjs state to 2MB (encoded as base64/text)
ALTER TABLE public.gtm_docs
    DROP CONSTRAINT IF EXISTS gtm_docs_content_size;
ALTER TABLE public.gtm_docs
    ADD CONSTRAINT gtm_docs_content_size
    CHECK (content IS NULL OR octet_length(content) < 2097152); -- 2MB limit

-- ============================================================================
-- 5. Backfill search vectors for existing rows
-- This triggers the search_vector update for any rows that don't have one
-- ============================================================================

-- Update existing rows to populate search_vector via the trigger
-- Using a no-op update that still triggers the BEFORE UPDATE trigger
UPDATE public.gtm_docs 
SET title = title 
WHERE search_vector IS NULL;

-- ============================================================================
-- 6. Add comment documenting the security model
-- ============================================================================

COMMENT ON TABLE public.gtm_docs IS 'GTM Documents with RLS. Private docs visible only to owner. Team docs visible to workspace members. Search RPC enforces same visibility rules.';
COMMENT ON TABLE public.gtm_doc_links IS 'Doc-entity links. Team members can link/unlink team-visible docs. Private doc links restricted to owner.';
