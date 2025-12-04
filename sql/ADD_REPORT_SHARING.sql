-- ============================================
-- ADD REPORT SHARING FUNCTIONALITY
-- ============================================
-- Adds public/private link sharing for agent reports and market briefs
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Add sharing columns to agent_reports
-- ============================================
ALTER TABLE agent_reports 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS share_password TEXT, -- Optional password protection
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS share_view_count INTEGER DEFAULT 0;

-- Index for fast public link lookups
CREATE INDEX IF NOT EXISTS idx_agent_reports_share_token ON agent_reports(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_reports_is_public ON agent_reports(is_public) WHERE is_public = TRUE;

-- ============================================
-- STEP 2: Create shared_reports table for detailed tracking
-- ============================================
CREATE TABLE IF NOT EXISTS shared_report_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES agent_reports(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Link settings
  token TEXT NOT NULL UNIQUE,
  link_type TEXT NOT NULL CHECK (link_type IN ('public', 'private', 'password')),
  password_hash TEXT, -- bcrypt hash if password protected
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  title_override TEXT, -- Optional custom title for shared version
  hide_sources BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_report_links_token ON shared_report_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_report_links_report_id ON shared_report_links(report_id);
CREATE INDEX IF NOT EXISTS idx_shared_report_links_workspace_id ON shared_report_links(workspace_id);

-- Enable RLS
ALTER TABLE shared_report_links ENABLE ROW LEVEL SECURITY;

-- Policy: Workspace members can manage share links
CREATE POLICY "Workspace members can view share links"
  ON shared_report_links FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create share links"
  ON shared_report_links FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Workspace members can update share links"
  ON shared_report_links FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete share links"
  ON shared_report_links FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 3: Create market_briefs table for product research
-- ============================================
CREATE TABLE IF NOT EXISTS market_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products_services(id) ON DELETE SET NULL,
  
  -- Brief content
  query TEXT NOT NULL,
  raw_report TEXT NOT NULL,
  key_facts JSONB DEFAULT '[]'::jsonb,
  pricing_highlights JSONB DEFAULT '[]'::jsonb,
  insight_sections JSONB DEFAULT '[]'::jsonb,
  hero_line TEXT,
  
  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  share_password TEXT,
  share_expires_at TIMESTAMP WITH TIME ZONE,
  share_view_count INTEGER DEFAULT 0,
  
  -- Metadata
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_briefs_workspace_id ON market_briefs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_market_briefs_product_id ON market_briefs(product_id);
CREATE INDEX IF NOT EXISTS idx_market_briefs_share_token ON market_briefs(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_market_briefs_created_at ON market_briefs(created_at DESC);

-- Enable RLS
ALTER TABLE market_briefs ENABLE ROW LEVEL SECURITY;

-- Policies for market_briefs
CREATE POLICY "Users can view workspace market briefs"
  ON market_briefs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create market briefs"
  ON market_briefs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their market briefs"
  ON market_briefs FOR UPDATE
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Users can delete their market briefs"
  ON market_briefs FOR DELETE
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- STEP 4: Function to generate share tokens
-- ============================================
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate a 12-character token (URL-safe, no ambiguous chars)
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================
-- STEP 5: RPC to create a share link for a report
-- ============================================
CREATE OR REPLACE FUNCTION create_report_share_link(
  p_report_id UUID,
  p_link_type TEXT DEFAULT 'public',
  p_expires_in_days INTEGER DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_hide_sources BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_link_id UUID;
BEGIN
  -- Get workspace ID and verify access
  SELECT ar.workspace_id INTO v_workspace_id
  FROM agent_reports ar
  JOIN workspace_members wm ON wm.workspace_id = ar.workspace_id
  WHERE ar.id = p_report_id AND wm.user_id = auth.uid();
  
  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found or access denied');
  END IF;
  
  -- Generate unique token
  LOOP
    v_token := generate_share_token();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM shared_report_links WHERE token = v_token);
  END LOOP;
  
  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;
  
  -- Create the share link
  INSERT INTO shared_report_links (
    report_id,
    workspace_id,
    created_by,
    token,
    link_type,
    password_hash,
    expires_at,
    hide_sources
  ) VALUES (
    p_report_id,
    v_workspace_id,
    auth.uid(),
    v_token,
    p_link_type,
    CASE WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf')) ELSE NULL END,
    v_expires_at,
    p_hide_sources
  )
  RETURNING id INTO v_link_id;
  
  -- Update report with share token
  UPDATE agent_reports
  SET 
    is_public = (p_link_type = 'public'),
    share_token = v_token,
    share_expires_at = v_expires_at
  WHERE id = p_report_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'link_id', v_link_id,
    'token', v_token,
    'expires_at', v_expires_at,
    'link_type', p_link_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_report_share_link TO authenticated;

-- ============================================
-- STEP 6: RPC to get a shared report (public access)
-- ============================================
CREATE OR REPLACE FUNCTION get_shared_report(
  p_token TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link shared_report_links%ROWTYPE;
  v_report agent_reports%ROWTYPE;
  v_workspace_name TEXT;
BEGIN
  -- Find the share link
  SELECT * INTO v_link
  FROM shared_report_links
  WHERE token = p_token AND is_active = TRUE;
  
  IF v_link IS NULL THEN
    -- Try direct token on agent_reports
    SELECT * INTO v_report
    FROM agent_reports
    WHERE share_token = p_token;
    
    IF v_report IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Link not found or expired');
    END IF;
    
    -- Check expiration
    IF v_report.share_expires_at IS NOT NULL AND v_report.share_expires_at < NOW() THEN
      RETURN jsonb_build_object('success', false, 'error', 'This link has expired');
    END IF;
    
    -- Increment view count
    UPDATE agent_reports SET share_view_count = share_view_count + 1 WHERE id = v_report.id;
    
    -- Get workspace name
    SELECT name INTO v_workspace_name FROM workspaces WHERE id = v_report.workspace_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'report', jsonb_build_object(
        'id', v_report.id,
        'target', v_report.target,
        'goal', v_report.goal,
        'output', v_report.output,
        'sources', v_report.sources,
        'created_at', v_report.created_at,
        'workspace_name', v_workspace_name
      )
    );
  END IF;
  
  -- Check expiration
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link has expired');
  END IF;
  
  -- Check password if required
  IF v_link.link_type = 'password' AND v_link.password_hash IS NOT NULL THEN
    IF p_password IS NULL OR v_link.password_hash != crypt(p_password, v_link.password_hash) THEN
      RETURN jsonb_build_object('success', false, 'error', 'password_required');
    END IF;
  END IF;
  
  -- Get the report
  SELECT * INTO v_report FROM agent_reports WHERE id = v_link.report_id;
  
  IF v_report IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found');
  END IF;
  
  -- Update view counts
  UPDATE shared_report_links 
  SET view_count = view_count + 1, last_viewed_at = NOW()
  WHERE id = v_link.id;
  
  UPDATE agent_reports 
  SET share_view_count = share_view_count + 1 
  WHERE id = v_report.id;
  
  -- Get workspace name
  SELECT name INTO v_workspace_name FROM workspaces WHERE id = v_report.workspace_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'report', jsonb_build_object(
      'id', v_report.id,
      'target', v_report.target,
      'goal', v_report.goal,
      'output', v_report.output,
      'sources', CASE WHEN v_link.hide_sources THEN '[]'::jsonb ELSE v_report.sources END,
      'created_at', v_report.created_at,
      'workspace_name', v_workspace_name,
      'title_override', v_link.title_override
    )
  );
END;
$$;

-- Allow anonymous access to view shared reports
GRANT EXECUTE ON FUNCTION get_shared_report TO anon;
GRANT EXECUTE ON FUNCTION get_shared_report TO authenticated;

-- ============================================
-- STEP 7: RPC to revoke a share link
-- ============================================
CREATE OR REPLACE FUNCTION revoke_share_link(
  p_report_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM agent_reports ar
    JOIN workspace_members wm ON wm.workspace_id = ar.workspace_id
    WHERE ar.id = p_report_id AND wm.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Deactivate all share links
  UPDATE shared_report_links SET is_active = FALSE WHERE report_id = p_report_id;
  
  -- Clear share token from report
  UPDATE agent_reports 
  SET is_public = FALSE, share_token = NULL, share_expires_at = NULL
  WHERE id = p_report_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_share_link TO authenticated;

-- ============================================
-- STEP 8: Similar functions for market_briefs
-- ============================================
CREATE OR REPLACE FUNCTION create_market_brief_share_link(
  p_brief_id UUID,
  p_link_type TEXT DEFAULT 'public',
  p_expires_in_days INTEGER DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get workspace ID and verify access
  SELECT mb.workspace_id INTO v_workspace_id
  FROM market_briefs mb
  JOIN workspace_members wm ON wm.workspace_id = mb.workspace_id
  WHERE mb.id = p_brief_id AND wm.user_id = auth.uid();
  
  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Brief not found or access denied');
  END IF;
  
  -- Generate unique token
  LOOP
    v_token := generate_share_token();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM market_briefs WHERE share_token = v_token);
  END LOOP;
  
  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;
  
  -- Update brief with share info
  UPDATE market_briefs
  SET 
    is_public = (p_link_type = 'public'),
    share_token = v_token,
    share_password = CASE WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf')) ELSE NULL END,
    share_expires_at = v_expires_at
  WHERE id = p_brief_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires_at,
    'link_type', p_link_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_market_brief_share_link TO authenticated;

-- ============================================
-- STEP 9: Get shared market brief (public access)
-- ============================================
CREATE OR REPLACE FUNCTION get_shared_market_brief(
  p_token TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_brief market_briefs%ROWTYPE;
  v_workspace_name TEXT;
BEGIN
  -- Find the brief
  SELECT * INTO v_brief
  FROM market_briefs
  WHERE share_token = p_token;
  
  IF v_brief IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Brief not found');
  END IF;
  
  -- Check expiration
  IF v_brief.share_expires_at IS NOT NULL AND v_brief.share_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link has expired');
  END IF;
  
  -- Check password if set
  IF v_brief.share_password IS NOT NULL THEN
    IF p_password IS NULL OR v_brief.share_password != crypt(p_password, v_brief.share_password) THEN
      RETURN jsonb_build_object('success', false, 'error', 'password_required');
    END IF;
  END IF;
  
  -- Increment view count
  UPDATE market_briefs SET share_view_count = share_view_count + 1 WHERE id = v_brief.id;
  
  -- Get workspace name
  SELECT name INTO v_workspace_name FROM workspaces WHERE id = v_brief.workspace_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'brief', jsonb_build_object(
      'id', v_brief.id,
      'query', v_brief.query,
      'raw_report', v_brief.raw_report,
      'key_facts', v_brief.key_facts,
      'pricing_highlights', v_brief.pricing_highlights,
      'insight_sections', v_brief.insight_sections,
      'hero_line', v_brief.hero_line,
      'sources', v_brief.sources,
      'created_at', v_brief.created_at,
      'workspace_name', v_workspace_name
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_market_brief TO anon;
GRANT EXECUTE ON FUNCTION get_shared_market_brief TO authenticated;

-- ============================================
-- Grant permissions
-- ============================================
GRANT ALL ON shared_report_links TO authenticated;
GRANT ALL ON market_briefs TO authenticated;

-- Success message
SELECT 'Report sharing tables and functions created successfully!' as status;
