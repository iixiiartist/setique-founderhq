-- Verification Script: Check all CRM scalability migrations
-- Run this in Supabase SQL Editor to verify deployment

-- 1. Check Pagination RPC Function (Week 1)
SELECT 
    'Week 1: Pagination RPC' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_crm_items_paginated') 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- 2. Check Audit Logs Table (Week 2)
SELECT 
    'Week 2: Audit Logs Table' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- 3. Check CSV Export RPC Function (Week 3)
SELECT 
    'Week 3: CSV Export RPC' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'export_crm_items_csv') 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- 4. Check Performance Indexes (Week 4)
SELECT 
    'Week 4: Performance Indexes' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'crm_items' 
            AND indexname IN ('idx_crm_items_workspace_priority_status', 'idx_crm_items_next_action_date_lookup')
        )
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- 5. List all CRM-related indexes
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('crm_items', 'contacts', 'audit_logs')
ORDER BY indexname;

-- 6. Check audit trigger
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'crm_items'
AND trigger_name LIKE '%audit%';
