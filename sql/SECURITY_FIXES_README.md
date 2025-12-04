# Security Linter Fixes - Implementation Guide
Date: December 3, 2024

## Overview
This document describes the fixes for Supabase Security Linter issues identified in the database.

## Issues Fixed

### 1. Function Search Path Mutable (56 functions)
**File:** `sql/fix_function_search_path.sql`

**Problem:** Functions without an explicit `search_path` setting are vulnerable to search path injection attacks. An attacker could create malicious objects in a schema that appears earlier in the search path.

**Solution:** Set `search_path = ''` on all affected functions. This forces explicit schema qualification for all object references within the function.

**Functions Fixed:**
- `update_agent_reports_updated_at`
- `update_marketing_campaigns_updated_at`
- `get_crm_items_paginated`
- `update_calendar_events_updated_at`
- `update_updated_at_column`
- `update_notification_preferences_timestamp`
- `log_document_activity`
- `export_crm_items_csv`
- `generate_form_slug`
- `log_task_activity`
- `check_product_workspace_integrity`
- `validate_product_workspace_alignment`
- `log_contact_activity`
- `log_crm_audit`
- `get_automation_stats`
- `get_form_analytics_summary`
- `check_storage_limit`
- `update_storage_usage`
- `cleanup_old_webhook_events`
- `update_automation_rules_updated_at`
- `update_automation_preferences_updated_at`
- `increment_rule_execution_count`
- `admin_add_workspace_member`
- `update_product_analytics`
- `cleanup_old_audit_logs`
- `log_price_change`
- `log_deal_activity`
- `get_paginated_notifications`
- `validate_api_key`
- `check_rate_limit`
- `increment_monthly_requests`
- `log_api_request`
- `cleanup_rate_limits`
- `cleanup_api_request_logs`
- `check_api_balance`
- `mark_notification_delivered`
- `mark_notification_seen`
- `mark_notification_acknowledged`
- `should_notify_user` (2 overloads)
- `deduct_api_balance`
- `add_api_balance`
- `user_has_workspace_access`
- `log_notification_event`
- `validate_subscription_plan`
- `track_query_performance`
- `increment_form_submissions`
- `get_api_balance_summary`
- `get_or_create_notification_preferences`
- `get_activity_feed`
- `set_huddle_member_workspace`
- `set_huddle_message_workspace`
- `update_room_last_message`
- `update_thread_reply_count`

---

### 2. Extension in Public Schema (pg_net)
**File:** `sql/fix_extension_schema.sql`

**Problem:** Extensions installed in the `public` schema can be exploited because users may have permissions to create objects there.

**Solution:** Move the `pg_net` extension to a dedicated `extensions` schema.

**Note:** After moving pg_net, any code that calls pg_net functions may need to be updated to use the `extensions.` schema prefix (e.g., `extensions.http_post()`).

---

### 3. Leaked Password Protection Disabled
**This requires configuration changes in Supabase Dashboard, not SQL.**

**Steps to Enable:**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Enable **"Leaked password protection"**
4. Save changes

This feature checks passwords against HaveIBeenPwned.org to prevent users from using compromised passwords.

---

### 4. Previously Fixed Issues (from fix_security_linter_issues.sql)
- `audit_logs_safe` view - Changed from SECURITY DEFINER to SECURITY INVOKER
- `workspace_feature_flags` table - RLS enabled with appropriate policies
- `form_upload_tokens` table - RLS enabled with appropriate policies

---

## Execution Order

Run the SQL files in this order:

1. `sql/fix_security_linter_issues.sql` (already created)
2. `sql/fix_function_search_path.sql` (new)
3. `sql/fix_extension_schema.sql` (new)

Then configure leaked password protection in the Supabase Dashboard.

---

## Verification Queries

After running the fixes, verify with these queries:

### Check Function Search Paths
```sql
SELECT 
    p.proname AS function_name,
    CASE 
        WHEN p.proconfig IS NULL THEN 'NOT SET'
        WHEN 'search_path=' = ANY(p.proconfig) THEN 'EMPTY (SECURE)'
        ELSE array_to_string(p.proconfig, ', ')
    END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
ORDER BY p.proname;
```

### Check Extension Schemas
```sql
SELECT 
    e.extname AS extension_name,
    n.nspname AS schema_name,
    CASE 
        WHEN n.nspname = 'public' THEN 'MOVE TO extensions'
        ELSE 'OK'
    END AS status
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY e.extname;
```

### Check RLS Status
```sql
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Rollback Instructions

If you need to revert the search_path changes:

```sql
-- Example: Remove search_path setting from a function
ALTER FUNCTION public.function_name() RESET search_path;
```

If you need to move pg_net back to public:

```sql
ALTER EXTENSION pg_net SET SCHEMA public;
```
