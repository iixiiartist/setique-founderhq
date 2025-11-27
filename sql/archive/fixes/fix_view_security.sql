-- Fix Security Definer Views
-- Change views from SECURITY DEFINER to SECURITY INVOKER
-- This ensures views run with the permissions of the querying user, not the creator

-- Drop and recreate revenue_by_customer view with SECURITY INVOKER
DROP VIEW IF EXISTS revenue_by_customer;

CREATE VIEW revenue_by_customer 
WITH (security_invoker = true) AS
SELECT 
    rt.workspace_id,
    rt.crm_item_id,
    ci.company AS customer_name,
    SUM(rt.amount) AS total_revenue,
    COUNT(*) AS transaction_count,
    MIN(rt.transaction_date) AS first_transaction,
    MAX(rt.transaction_date) AS latest_transaction
FROM revenue_transactions rt
LEFT JOIN crm_items ci ON rt.crm_item_id = ci.id
WHERE rt.status = 'paid'
GROUP BY rt.workspace_id, rt.crm_item_id, ci.company;

-- Drop and recreate campaign_performance_summary view with SECURITY INVOKER
DROP VIEW IF EXISTS campaign_performance_summary;

CREATE VIEW campaign_performance_summary
WITH (security_invoker = true) AS
SELECT 
    ma.workspace_id,
    ma.marketing_item_id,
    mi.title AS campaign_name,
    mi.status AS campaign_status,
    mi.campaign_budget,
    mi.actual_spend,
    SUM(ma.impressions) AS total_impressions,
    SUM(ma.clicks) AS total_clicks,
    SUM(ma.conversions) AS total_conversions,
    SUM(ma.revenue_generated) AS total_revenue,
    SUM(ma.ad_spend) AS total_ad_spend,
    CASE 
        WHEN SUM(ma.impressions) > 0 THEN (SUM(ma.clicks)::NUMERIC / SUM(ma.impressions)::NUMERIC)
        ELSE 0
    END AS avg_ctr,
    CASE 
        WHEN SUM(ma.clicks) > 0 THEN (SUM(ma.conversions)::NUMERIC / SUM(ma.clicks)::NUMERIC)
        ELSE 0
    END AS avg_conversion_rate,
    CASE 
        WHEN SUM(ma.ad_spend) > 0 THEN ((SUM(ma.revenue_generated) - SUM(ma.ad_spend)) / SUM(ma.ad_spend))
        ELSE 0
    END AS roi
FROM marketing_analytics ma
LEFT JOIN marketing_items mi ON ma.marketing_item_id = mi.id
GROUP BY ma.workspace_id, ma.marketing_item_id, mi.title, mi.status, mi.campaign_budget, mi.actual_spend;

-- Grant appropriate permissions
GRANT SELECT ON revenue_by_customer TO authenticated;
GRANT SELECT ON campaign_performance_summary TO authenticated;

-- Note: Ensure RLS policies exist on the underlying tables (revenue_transactions, crm_items, marketing_analytics, marketing_items)
-- These views will now respect the RLS policies of the querying user
