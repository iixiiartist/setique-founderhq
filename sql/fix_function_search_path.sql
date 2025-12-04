-- Fix Supabase Security Linter Issues - Function Search Path
-- Date: 2024-12-03
-- Issue: Functions with mutable search_path can be exploited by attackers
-- Fix: Set search_path = '' to prevent search path injection attacks

-- ============================================
-- IMPORTANT: This script alters existing functions to add
-- SET search_path = '' which prevents search path manipulation attacks.
-- 
-- Uses dynamic SQL to handle functions with multiple overloads
-- by automatically detecting the correct function signatures.
-- ============================================

DO $$
DECLARE
    func_record RECORD;
    alter_sql TEXT;
BEGIN
    -- Loop through all user-defined functions in public schema
    FOR func_record IN
        SELECT 
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS args,
            p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- Only functions (not aggregates/procedures)
        AND p.proname IN (
            'update_agent_reports_updated_at',
            'update_marketing_campaigns_updated_at',
            'get_crm_items_paginated',
            'update_calendar_events_updated_at',
            'update_updated_at_column',
            'update_notification_preferences_timestamp',
            'log_document_activity',
            'export_crm_items_csv',
            'generate_form_slug',
            'log_task_activity',
            'check_product_workspace_integrity',
            'validate_product_workspace_alignment',
            'log_contact_activity',
            'log_crm_audit',
            'get_automation_stats',
            'get_form_analytics_summary',
            'check_storage_limit',
            'update_storage_usage',
            'cleanup_old_webhook_events',
            'update_automation_rules_updated_at',
            'update_automation_preferences_updated_at',
            'increment_rule_execution_count',
            'admin_add_workspace_member',
            'update_product_analytics',
            'cleanup_old_audit_logs',
            'log_price_change',
            'log_deal_activity',
            'get_paginated_notifications',
            'validate_api_key',
            'check_rate_limit',
            'increment_monthly_requests',
            'log_api_request',
            'cleanup_rate_limits',
            'cleanup_api_request_logs',
            'check_api_balance',
            'mark_notification_delivered',
            'mark_notification_seen',
            'mark_notification_acknowledged',
            'should_notify_user',
            'deduct_api_balance',
            'add_api_balance',
            'user_has_workspace_access',
            'log_notification_event',
            'validate_subscription_plan',
            'track_query_performance',
            'increment_form_submissions',
            'get_api_balance_summary',
            'get_or_create_notification_preferences',
            'get_activity_feed',
            'set_huddle_member_workspace',
            'set_huddle_message_workspace',
            'update_room_last_message',
            'update_thread_reply_count'
        )
    LOOP
        -- Build ALTER FUNCTION statement with proper signature
        alter_sql := format(
            'ALTER FUNCTION public.%I(%s) SET search_path = '''';',
            func_record.function_name,
            func_record.args
        );
        
        -- Execute the ALTER statement
        BEGIN
            EXECUTE alter_sql;
            RAISE NOTICE 'Fixed: %', func_record.function_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to fix %: %', func_record.function_name, SQLERRM;
        END;
    END LOOP;
END $$;


-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify all functions now have search_path set:
/*
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS args,
    CASE 
        WHEN p.proconfig IS NULL THEN 'NOT SET (VULNERABLE)'
        WHEN 'search_path=' = ANY(p.proconfig) THEN 'SET TO EMPTY (SECURE)'
        ELSE array_to_string(p.proconfig, ', ')
    END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
ORDER BY p.proname;
*/
