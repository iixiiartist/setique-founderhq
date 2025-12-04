-- ============================================================================
-- PERFORMANCE INDEXES V2 - Comprehensive Indexing for Scale
-- ============================================================================
-- Date: 2025-12-03
-- Purpose: Add btree indexes on all frequently filtered/sorted columns
-- Impact: Faster queries, reduced DB load, supports high-volume workloads
-- ============================================================================

-- ============================================================================
-- CORE TABLE INDEXES
-- ============================================================================

-- WORKSPACES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_owner_id 
    ON workspaces(owner_id);

-- WORKSPACE_MEMBERS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_user_workspace 
    ON workspace_members(user_id, workspace_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_workspace_role 
    ON workspace_members(workspace_id, role);

-- PROFILES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_lower 
    ON profiles(lower(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_updated_at 
    ON profiles(updated_at DESC);

-- ============================================================================
-- CRM INDEXES (extends existing)
-- ============================================================================

-- CRM_ITEMS: Common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_items_workspace_type_created 
    ON crm_items(workspace_id, type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_items_workspace_stage 
    ON crm_items(workspace_id, stage) WHERE stage IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_items_workspace_priority 
    ON crm_items(workspace_id, priority) WHERE priority IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_items_user_id 
    ON crm_items(user_id);

-- CONTACTS: Common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_workspace_created 
    ON contacts(workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_assigned_to 
    ON contacts(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_email_lower 
    ON contacts(lower(email)) WHERE email IS NOT NULL;

-- MEETINGS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_contact_timestamp 
    ON meetings(contact_id, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_workspace_timestamp 
    ON meetings(workspace_id, timestamp DESC);

-- ============================================================================
-- TASKS INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_workspace_status_created 
    ON tasks(workspace_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_workspace_category 
    ON tasks(workspace_id, category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_workspace_due_date 
    ON tasks(workspace_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_to_status 
    ON tasks(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_crm_item 
    ON tasks(crm_item_id) WHERE crm_item_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_contact 
    ON tasks(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_id 
    ON tasks(user_id);

-- ============================================================================
-- MARKETING INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_items_workspace_type_status 
    ON marketing_items(workspace_id, type, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_items_workspace_due_date 
    ON marketing_items(workspace_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_items_campaign 
    ON marketing_items(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_items_user_id 
    ON marketing_items(user_id);

-- MARKETING_CAMPAIGNS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_campaigns_workspace_status 
    ON marketing_campaigns(workspace_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_campaigns_workspace_dates 
    ON marketing_campaigns(workspace_id, start_date, end_date);

-- ============================================================================
-- FINANCIALS INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_logs_workspace_date 
    ON financial_logs(workspace_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_workspace_date_category 
    ON expenses(workspace_id, date DESC, category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_id 
    ON expenses(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revenue_entries_workspace_date 
    ON revenue_entries(workspace_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revenue_entries_product 
    ON revenue_entries(product_id) WHERE product_id IS NOT NULL;

-- ============================================================================
-- DOCUMENTS INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_workspace_module_created 
    ON documents(workspace_id, module, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_workspace_updated 
    ON documents(workspace_id, updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_created_by 
    ON documents(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_crm_item 
    ON documents(crm_item_id) WHERE crm_item_id IS NOT NULL;

-- DOCUMENT_ACTIVITY
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_activity_doc_created 
    ON document_activity(document_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_activity_workspace_created 
    ON document_activity(workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_activity_user_created 
    ON document_activity(user_id, created_at DESC);

-- ============================================================================
-- HUDDLE INDEXES (extends core)
-- ============================================================================

-- HUDDLE_ROOMS: Additional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_huddle_rooms_created_by 
    ON huddle_rooms(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_huddle_rooms_workspace_last_msg 
    ON huddle_rooms(workspace_id, last_message_at DESC NULLS LAST) 
    WHERE archived_at IS NULL;

-- HUDDLE_MEMBERS: User lookup optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_huddle_members_room_user 
    ON huddle_members(room_id, user_id);

-- HUDDLE_MESSAGES: Cursor pagination support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_huddle_messages_room_id_created 
    ON huddle_messages(room_id, id, created_at DESC) 
    WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_huddle_messages_user_created 
    ON huddle_messages(user_id, created_at DESC) 
    WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_huddle_messages_workspace_created 
    ON huddle_messages(workspace_id, created_at DESC) 
    WHERE deleted_at IS NULL;

-- HUDDLE_READS: Fast unread calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_huddle_reads_user_room 
    ON huddle_reads(user_id, room_id);

-- ============================================================================
-- DM MEMBER SIGNATURE INDEX (supports atomic DM lookup RPC)
-- ============================================================================

-- Create a function to generate a deterministic signature for DM members
CREATE OR REPLACE FUNCTION dm_member_signature(p_room_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT string_agg(user_id::text, ',' ORDER BY user_id)
        FROM huddle_members
        WHERE room_id = p_room_id
    );
END;
$$;

-- Functional index for fast DM member lookups (PostgreSQL expression index)
-- This enables O(1) lookup for existing DM rooms by member combination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_huddle_rooms_dm_signature 
    ON huddle_rooms(workspace_id, (
        SELECT string_agg(hm.user_id::text, ',' ORDER BY hm.user_id)
        FROM huddle_members hm
        WHERE hm.room_id = huddle_rooms.id
    )) 
    WHERE type = 'dm' AND archived_at IS NULL;

-- ============================================================================
-- NOTIFICATIONS INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created 
    ON notifications(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
    ON notifications(user_id, read_at) 
    WHERE read_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_workspace_type 
    ON notifications(workspace_id, type);

-- ============================================================================
-- FORMS INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_workspace_created 
    ON forms(workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_created_by 
    ON forms(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_submissions_form_created 
    ON form_submissions(form_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_submissions_workspace_created 
    ON form_submissions(workspace_id, created_at DESC);

-- ============================================================================
-- CALENDAR EVENTS INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_workspace_start 
    ON calendar_events(workspace_id, start_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_user_start 
    ON calendar_events(user_id, start_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_workspace_range 
    ON calendar_events(workspace_id, start_date, end_date);

-- ============================================================================
-- AUDIT & LOGS INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_workspace_created 
    ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_created 
    ON audit_logs(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_type 
    ON audit_logs(entity_type, entity_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_workspace_created 
    ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_created 
    ON activity_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_workspace_timestamp 
    ON ai_usage_logs(workspace_id, timestamp DESC);

-- ============================================================================
-- PRODUCTS & SERVICES INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_workspace_type 
    ON products(workspace_id, type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_workspace_active 
    ON products(workspace_id, is_active) WHERE is_active = true;

-- ============================================================================
-- WEBHOOK & INTEGRATION INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_workspace_created 
    ON webhook_events(workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_status 
    ON webhook_events(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_workspace_active 
    ON api_keys(workspace_id) WHERE revoked_at IS NULL;

-- ============================================================================
-- FILE LIBRARY INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_library_workspace_created 
    ON file_library(workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_library_folder 
    ON file_library(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_library_uploaded_by 
    ON file_library(uploaded_by);

-- ============================================================================
-- SUBSCRIPTIONS INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_workspace_status 
    ON subscriptions(workspace_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_customer 
    ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Analyze all affected tables to update statistics
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'workspaces', 'workspace_members', 'profiles',
        'crm_items', 'contacts', 'meetings',
        'tasks', 'marketing_items', 'marketing_campaigns',
        'financial_logs', 'expenses', 'revenue_entries',
        'documents', 'document_activity',
        'huddle_rooms', 'huddle_members', 'huddle_messages', 'huddle_reads',
        'notifications', 'forms', 'form_submissions',
        'calendar_events', 'audit_logs', 'activity_logs',
        'products', 'webhook_events', 'api_keys',
        'file_library', 'subscriptions'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        BEGIN
            EXECUTE 'ANALYZE ' || t;
        EXCEPTION WHEN undefined_table THEN
            -- Table doesn't exist, skip
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_huddle_messages_room_id_created IS 
'Supports cursor-based pagination for messages with (room_id, id, created_at)';

COMMENT ON INDEX idx_tasks_workspace_status_created IS 
'Primary index for task list queries filtered by status';

COMMENT ON INDEX idx_crm_items_workspace_type_created IS 
'Primary index for CRM list queries by type with sorting';
