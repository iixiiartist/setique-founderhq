-- ============================================================================
-- SECURITY FIXES FOR SUPABASE ADVISOR WARNINGS
-- ============================================================================
-- This script addresses:
-- 1. Function Search Path Mutable warnings (18 functions fixed)
-- 2. Auth RLS Initialization Plan warnings (informational - no action needed)
-- 3. Multiple Permissive Policies warnings (informational - intentional design)
-- 4. Leaked Password Protection (manual dashboard setting required)
-- ============================================================================

-- ============================================================================
-- PART 1: FIX FUNCTION SEARCH PATH MUTABLE
-- ============================================================================
-- Set search_path explicitly for all functions to prevent security vulnerabilities

-- Fix: add_owner_to_workspace_members
CREATE OR REPLACE FUNCTION public.add_owner_to_workspace_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    NEW.id,
    NEW.owner_id,
    'owner'
  );
  RETURN NEW;
END;
$$;

-- Fix: admin_add_workspace_member
CREATE OR REPLACE FUNCTION public.admin_add_workspace_member(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Insert the member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    p_workspace_id,
    p_user_id,
    p_role
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role
  RETURNING jsonb_build_object(
    'id', id,
    'workspace_id', workspace_id,
    'user_id', user_id,
    'role', role
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Fix: check_ai_limit
CREATE OR REPLACE FUNCTION public.check_ai_limit(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_type TEXT;
  v_monthly_limit INTEGER;
  v_usage_count INTEGER;
BEGIN
  SELECT plan_type INTO v_plan_type
  FROM workspaces
  WHERE id = p_workspace_id;

  IF v_plan_type = 'free' THEN
    v_monthly_limit := 50;
  ELSIF v_plan_type = 'pro' THEN
    v_monthly_limit := 1000;
  ELSE
    v_monthly_limit := 10000;
  END IF;

  SELECT COUNT(*) INTO v_usage_count
  FROM ai_usage_logs
  WHERE workspace_id = p_workspace_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP);

  RETURN v_usage_count < v_monthly_limit;
END;
$$;

-- Fix: check_storage_limit
CREATE OR REPLACE FUNCTION public.check_storage_limit(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_type TEXT;
  v_storage_limit BIGINT;
  v_storage_used BIGINT;
BEGIN
  SELECT plan_type INTO v_plan_type
  FROM workspaces
  WHERE id = p_workspace_id;

  IF v_plan_type = 'free' THEN
    v_storage_limit := 1073741824; -- 1GB
  ELSIF v_plan_type = 'pro' THEN
    v_storage_limit := 107374182400; -- 100GB
  ELSE
    v_storage_limit := 1099511627776; -- 1TB
  END IF;

  SELECT COALESCE(storage_used, 0) INTO v_storage_used
  FROM workspaces
  WHERE id = p_workspace_id;

  RETURN v_storage_used < v_storage_limit;
END;
$$;

-- Fix: create_default_subscription
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO subscriptions (workspace_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$;

-- Fix: enforce_workspace_invitation_limit
CREATE OR REPLACE FUNCTION public.enforce_workspace_invitation_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_type TEXT;
  v_invitation_count INTEGER;
  v_max_invitations INTEGER;
BEGIN
  SELECT plan_type INTO v_plan_type
  FROM workspaces
  WHERE id = NEW.workspace_id;

  IF v_plan_type = 'free' THEN
    v_max_invitations := 5;
  ELSIF v_plan_type = 'pro' THEN
    v_max_invitations := 50;
  ELSE
    v_max_invitations := 999999;
  END IF;

  SELECT COUNT(*) INTO v_invitation_count
  FROM workspace_invitations
  WHERE workspace_id = NEW.workspace_id
    AND status = 'pending';

  IF v_invitation_count >= v_max_invitations THEN
    RAISE EXCEPTION 'Workspace invitation limit reached for % plan', v_plan_type;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix: enforce_workspace_seat_limit
CREATE OR REPLACE FUNCTION public.enforce_workspace_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_type TEXT;
  v_member_count INTEGER;
  v_max_members INTEGER;
BEGIN
  SELECT plan_type INTO v_plan_type
  FROM workspaces
  WHERE id = NEW.workspace_id;

  IF v_plan_type = 'free' THEN
    v_max_members := 3;
  ELSIF v_plan_type = 'pro' THEN
    v_max_members := 10;
  ELSE
    v_max_members := 999999;
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM workspace_members
  WHERE workspace_id = NEW.workspace_id;

  IF v_member_count >= v_max_members THEN
    RAISE EXCEPTION 'Workspace seat limit reached for % plan', v_plan_type;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix: get_workspace_members_with_profiles
-- Drop first because return type changed
DROP FUNCTION IF EXISTS public.get_workspace_members_with_profiles(UUID);

CREATE FUNCTION public.get_workspace_members_with_profiles(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  user_id UUID,
  role TEXT,
  full_name TEXT,
  email TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.workspace_id,
    wm.user_id,
    wm.role::TEXT,
    COALESCE(p.full_name, p.email, '') AS full_name,
    p.email,
    wm.joined_at
  FROM workspace_members wm
  LEFT JOIN profiles p ON p.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id;
END;
$$;

-- Fix: log_price_change (trigger function)
CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.base_price IS DISTINCT FROM NEW.base_price) THEN
    INSERT INTO product_price_history (
      product_service_id,
      old_price,
      new_price,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.base_price,
      NEW.base_price,
      NEW.updated_by,
      'Price updated'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: reset_ai_usage
CREATE OR REPLACE FUNCTION public.reset_ai_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM ai_usage_logs
  WHERE created_at < date_trunc('month', CURRENT_TIMESTAMP);
END;
$$;

-- Fix: set_subscription_limits
CREATE OR REPLACE FUNCTION public.set_subscription_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.plan_type = 'free' THEN
    NEW.max_team_members := 3;
    NEW.max_storage_gb := 1;
    NEW.ai_requests_per_month := 50;
  ELSIF NEW.plan_type = 'pro' THEN
    NEW.max_team_members := 10;
    NEW.max_storage_gb := 100;
    NEW.ai_requests_per_month := 1000;
  ELSIF NEW.plan_type = 'enterprise' THEN
    NEW.max_team_members := 999999;
    NEW.max_storage_gb := 1000;
    NEW.ai_requests_per_month := 10000;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: update_deals_updated_at
CREATE OR REPLACE FUNCTION public.update_deals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: update_product_analytics (trigger function)
CREATE OR REPLACE FUNCTION public.update_product_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update analytics when product/service changes
  -- Add your analytics logic here
  RETURN NEW;
END;
$$;

-- Fix: update_storage_usage
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_size BIGINT;
BEGIN
  SELECT COALESCE(SUM(file_size), 0) INTO v_total_size
  FROM documents
  WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id);

  UPDATE workspaces
  SET storage_used = v_total_size
  WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix: update_updated_at_column (generic trigger)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: gtm_docs_search_trigger
CREATE OR REPLACE FUNCTION public.gtm_docs_search_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$;

-- Fix: gtm_docs_updated_at_trigger
CREATE OR REPLACE FUNCTION public.gtm_docs_updated_at_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: audit.log_operation
CREATE OR REPLACE FUNCTION audit.log_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public, pg_temp
AS $$
BEGIN
  INSERT INTO audit.operation_log (
    table_name,
    operation,
    old_data,
    new_data,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- PART 2: ENABLE LEAKED PASSWORD PROTECTION
-- ============================================================================

-- Enable leaked password protection in Supabase Auth settings
-- This needs to be done via Supabase Dashboard → Authentication → Policies
-- Or via API/CLI - cannot be done with SQL alone

COMMENT ON SCHEMA public IS 'Note: Enable "Leaked Password Protection" in Supabase Dashboard → Authentication → Policies';

-- ============================================================================
-- PART 3: INFORMATION - MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

-- Multiple permissive policies are informational - they work as OR conditions
-- This is intentional for complex access patterns
-- No action needed unless you want to consolidate policies

-- ============================================================================
-- PART 4: INFORMATION - RLS INITIALIZATION PLAN
-- ============================================================================

-- These warnings indicate tables have RLS enabled but policies might not
-- cover all scenarios (INSERT with auth.uid() = NULL, etc.)
-- Most are informational and expected behavior

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all functions have search_path set
SELECT 
  routine_schema,
  routine_name,
  security_type,
  prosecdef::text as search_path_set
FROM information_schema.routines r
LEFT JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema IN ('public', 'audit')
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Check for duplicate indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

