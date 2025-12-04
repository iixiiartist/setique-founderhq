-- Fix Supabase Security Linter Issues
-- Date: 2024-12-03

-- ============================================
-- 1. FIX: audit_logs_safe SECURITY DEFINER view
-- ============================================
-- The view is defined with SECURITY DEFINER which enforces 
-- the permissions of the view creator rather than the querying user.
-- We need to recreate it with SECURITY INVOKER (default).

-- First, drop the existing view
DROP VIEW IF EXISTS public.audit_logs_safe;

-- Recreate the view with SECURITY INVOKER (explicit)
-- This ensures RLS policies are applied based on the querying user
CREATE VIEW public.audit_logs_safe 
WITH (security_invoker = true) AS
SELECT
    id,
    workspace_id,
    user_id,
    entity_type,
    entity_id,
    action,
    -- Redact sensitive fields from old_values
    CASE 
        WHEN old_values IS NULL THEN NULL
        WHEN old_values ? 'password' THEN old_values - 'password' || '{"password": "[REDACTED]"}'::jsonb
        WHEN old_values ? 'api_key' THEN old_values - 'api_key' || '{"api_key": "[REDACTED]"}'::jsonb
        WHEN old_values ? 'secret' THEN old_values - 'secret' || '{"secret": "[REDACTED]"}'::jsonb
        WHEN old_values ? 'token' THEN old_values - 'token' || '{"token": "[REDACTED]"}'::jsonb
        ELSE old_values
    END as old_values,
    -- Redact sensitive fields from new_values
    CASE 
        WHEN new_values IS NULL THEN NULL
        WHEN new_values ? 'password' THEN new_values - 'password' || '{"password": "[REDACTED]"}'::jsonb
        WHEN new_values ? 'api_key' THEN new_values - 'api_key' || '{"api_key": "[REDACTED]"}'::jsonb
        WHEN new_values ? 'secret' THEN new_values - 'secret' || '{"secret": "[REDACTED]"}'::jsonb
        WHEN new_values ? 'token' THEN new_values - 'token' || '{"token": "[REDACTED]"}'::jsonb
        ELSE new_values
    END as new_values,
    -- Hash IP address for privacy (keep for correlation, not identification)
    CASE 
        WHEN ip_address IS NOT NULL 
        THEN encode(sha256(ip_address::text::bytea), 'hex')
        ELSE NULL
    END as ip_hash,
    created_at
FROM public.audit_logs;

-- Grant appropriate permissions
GRANT SELECT ON public.audit_logs_safe TO authenticated;

-- ============================================
-- 2. FIX: workspace_feature_flags RLS disabled
-- ============================================
-- Enable RLS on the table
ALTER TABLE public.workspace_feature_flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workspace feature flags" ON public.workspace_feature_flags;
DROP POLICY IF EXISTS "Owners can manage workspace feature flags" ON public.workspace_feature_flags;
DROP POLICY IF EXISTS "Admins can manage workspace feature flags" ON public.workspace_feature_flags;

-- Create RLS policies for workspace_feature_flags
-- Policy: Users can view feature flags for their workspace
CREATE POLICY "Users can view workspace feature flags"
ON public.workspace_feature_flags
FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM public.workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Policy: Only workspace owners can update feature flags
CREATE POLICY "Owners can manage workspace feature flags"
ON public.workspace_feature_flags
FOR ALL
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM public.workspace_members 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
    )
)
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id 
        FROM public.workspace_members 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
    )
);

-- ============================================
-- 3. FIX: form_upload_tokens RLS disabled
-- ============================================
-- Enable RLS on the table
ALTER TABLE public.form_upload_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their form upload tokens" ON public.form_upload_tokens;
DROP POLICY IF EXISTS "Users can create form upload tokens" ON public.form_upload_tokens;
DROP POLICY IF EXISTS "Anyone can validate upload tokens" ON public.form_upload_tokens;
DROP POLICY IF EXISTS "Anyone can consume upload tokens" ON public.form_upload_tokens;
DROP POLICY IF EXISTS "Users can delete their form upload tokens" ON public.form_upload_tokens;

-- Create RLS policies for form_upload_tokens
-- These tokens are typically used for anonymous file uploads via public forms

-- Policy: Authenticated users can view tokens for forms they own
CREATE POLICY "Users can view their form upload tokens"
ON public.form_upload_tokens
FOR SELECT
TO authenticated
USING (
    form_id IN (
        SELECT id FROM public.forms f
        WHERE f.workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Authenticated users can create tokens for their forms
CREATE POLICY "Users can create form upload tokens"
ON public.form_upload_tokens
FOR INSERT
TO authenticated
WITH CHECK (
    form_id IN (
        SELECT id FROM public.forms f
        WHERE f.workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Allow anonymous token validation (for public form uploads)
-- This allows the token to be validated during file upload
CREATE POLICY "Anyone can validate upload tokens"
ON public.form_upload_tokens
FOR SELECT
TO anon
USING (
    -- Token must not be expired and not yet used
    expires_at > NOW() 
    AND used_at IS NULL
);

-- Policy: Allow anonymous token consumption (marking as used)
CREATE POLICY "Anyone can consume upload tokens"
ON public.form_upload_tokens
FOR UPDATE
TO anon
USING (
    expires_at > NOW() 
    AND used_at IS NULL
)
WITH CHECK (
    -- Only allow setting used_at
    used_at IS NOT NULL
);

-- Policy: Users can delete tokens for their forms
CREATE POLICY "Users can delete their form upload tokens"
ON public.form_upload_tokens
FOR DELETE
TO authenticated
USING (
    form_id IN (
        SELECT id FROM public.forms f
        WHERE f.workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the fixes:

-- Check view security:
-- SELECT schemaname, viewname, definition 
-- FROM pg_views 
-- WHERE viewname = 'audit_logs_safe';

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('workspace_feature_flags', 'form_upload_tokens');

-- Check policies exist:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('workspace_feature_flags', 'form_upload_tokens');
