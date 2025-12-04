-- Fix webhook_events RLS - Add policies
-- Date: 2024-12-03
-- Issue: RLS is enabled but no policies exist
-- Fix: Add appropriate RLS policies for webhook_events table

-- ============================================
-- WEBHOOK_EVENTS TABLE RLS POLICIES
-- ============================================
-- This table is used for Stripe webhook idempotency tracking.
-- It has NO workspace_id - it's purely for internal use by edge functions.
-- Only service_role should access this table.
--
-- Since service_role bypasses RLS anyway, we just need a minimal
-- policy to satisfy the linter. Regular users should NOT access this table.

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Service role full access" ON public.webhook_events;

-- Policy: Service role has full access (this is mainly for documentation)
-- Note: service_role bypasses RLS, but having a policy satisfies the linter
CREATE POLICY "Service role full access"
ON public.webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================
/*
-- Check policies exist:
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'webhook_events';

-- Check RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'webhook_events';
*/
