-- Financial & Marketing Tab Enhancement Migration
-- Version: 1.0
-- Date: 2024-11-14
-- Description: Adds revenue transactions, forecasts, budgets, campaign attribution, and analytics tables

-- ============================================================================
-- PART 1: FINANCIAL ENHANCEMENTS
-- ============================================================================

-- Create revenue_transactions table
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_date DATE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'refund', 'recurring')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    
    -- Attribution & Linking
    crm_item_id UUID REFERENCES crm_items(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    deal_stage TEXT,
    
    -- Invoice/Payment Details
    invoice_number TEXT,
    payment_method TEXT,
    payment_date DATE,
    due_date DATE,
    
    -- Categorization
    revenue_category TEXT CHECK (revenue_category IN ('product_sale', 'service_fee', 'subscription', 'consulting', 'partnership', 'other')),
    product_line TEXT,
    
    -- Metadata
    description TEXT,
    notes JSONB DEFAULT '[]',
    document_ids UUID[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for revenue_transactions
CREATE INDEX idx_revenue_transactions_workspace ON revenue_transactions(workspace_id);
CREATE INDEX idx_revenue_transactions_crm ON revenue_transactions(crm_item_id);
CREATE INDEX idx_revenue_transactions_date ON revenue_transactions(transaction_date);
CREATE INDEX idx_revenue_transactions_status ON revenue_transactions(status);
CREATE INDEX idx_revenue_transactions_type ON revenue_transactions(transaction_type);

-- Create financial_forecasts table
CREATE TABLE IF NOT EXISTS financial_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Forecast Period
    forecast_month DATE NOT NULL, -- First day of month
    forecast_type TEXT NOT NULL CHECK (forecast_type IN ('revenue', 'expense', 'runway')),
    
    -- Forecast Values
    forecasted_amount NUMERIC NOT NULL,
    confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    
    -- Attribution
    based_on_deals UUID[], -- Array of crm_item_id
    assumptions TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(workspace_id, forecast_month, forecast_type)
);

-- Create indexes for financial_forecasts
CREATE INDEX idx_financial_forecasts_workspace ON financial_forecasts(workspace_id);
CREATE INDEX idx_financial_forecasts_month ON financial_forecasts(forecast_month);
CREATE INDEX idx_financial_forecasts_type ON financial_forecasts(forecast_type);

-- Create budget_plans table
CREATE TABLE IF NOT EXISTS budget_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Budget Details
    budget_name TEXT NOT NULL,
    budget_period_start DATE NOT NULL,
    budget_period_end DATE NOT NULL,
    
    -- Budget Categories
    category TEXT NOT NULL,
    allocated_amount NUMERIC NOT NULL CHECK (allocated_amount >= 0),
    
    -- Tracking (spent_amount will be calculated via trigger or updated manually)
    spent_amount NUMERIC DEFAULT 0 CHECK (spent_amount >= 0),
    
    -- Alerts
    alert_threshold NUMERIC DEFAULT 0.8 CHECK (alert_threshold >= 0 AND alert_threshold <= 1),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (budget_period_end >= budget_period_start)
);

-- Create indexes for budget_plans
CREATE INDEX idx_budget_plans_workspace ON budget_plans(workspace_id);
CREATE INDEX idx_budget_plans_period ON budget_plans(budget_period_start, budget_period_end);
CREATE INDEX idx_budget_plans_category ON budget_plans(category);

-- Enhance expenses table with new columns
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS crm_item_id UUID REFERENCES crm_items(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS marketing_item_id UUID REFERENCES marketing_items(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type TEXT DEFAULT 'operating' CHECK (expense_type IN ('operating', 'marketing', 'sales', 'rd'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_period TEXT CHECK (recurrence_period IN ('monthly', 'quarterly', 'annual'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create indexes for enhanced expenses
CREATE INDEX IF NOT EXISTS idx_expenses_workspace ON expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expenses_crm ON expenses(crm_item_id);
CREATE INDEX IF NOT EXISTS idx_expenses_marketing ON expenses(marketing_item_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);

-- Update existing expenses to have workspace_id from user_id
UPDATE expenses e
SET workspace_id = wm.workspace_id
FROM workspace_members wm
WHERE e.user_id = wm.user_id AND e.workspace_id IS NULL;

-- ============================================================================
-- PART 2: MARKETING ENHANCEMENTS
-- ============================================================================

-- Enhance marketing_items table with new columns
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS campaign_budget NUMERIC DEFAULT 0 CHECK (campaign_budget >= 0);
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS actual_spend NUMERIC DEFAULT 0 CHECK (actual_spend >= 0);
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS channels TEXT[];
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS kpis JSONB DEFAULT '{}';
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS document_ids UUID[];
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS calendar_event_ids UUID[];
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS parent_campaign_id UUID REFERENCES marketing_items(id) ON DELETE SET NULL;

-- Create indexes for enhanced marketing_items
CREATE INDEX IF NOT EXISTS idx_marketing_items_workspace ON marketing_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_marketing_items_status ON marketing_items(status);
CREATE INDEX IF NOT EXISTS idx_marketing_items_date ON marketing_items(due_date);
CREATE INDEX IF NOT EXISTS idx_marketing_items_parent ON marketing_items(parent_campaign_id);

-- Update existing marketing_items to have workspace_id from user_id
UPDATE marketing_items mi
SET workspace_id = wm.workspace_id
FROM workspace_members wm
WHERE mi.user_id = wm.user_id AND mi.workspace_id IS NULL;

-- Create campaign_attribution table
CREATE TABLE IF NOT EXISTS campaign_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Campaign & Lead
    marketing_item_id UUID NOT NULL REFERENCES marketing_items(id) ON DELETE CASCADE,
    crm_item_id UUID NOT NULL REFERENCES crm_items(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    -- Attribution Details
    attribution_type TEXT NOT NULL CHECK (attribution_type IN ('first_touch', 'last_touch', 'multi_touch')),
    attribution_weight NUMERIC DEFAULT 1.0 CHECK (attribution_weight >= 0),
    
    -- Tracking
    interaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conversion_date TIMESTAMP WITH TIME ZONE,
    revenue_attributed NUMERIC DEFAULT 0 CHECK (revenue_attributed >= 0),
    
    -- Source tracking (UTM parameters)
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for campaign_attribution
CREATE INDEX idx_campaign_attribution_campaign ON campaign_attribution(marketing_item_id);
CREATE INDEX idx_campaign_attribution_crm ON campaign_attribution(crm_item_id);
CREATE INDEX idx_campaign_attribution_workspace ON campaign_attribution(workspace_id);
CREATE INDEX idx_campaign_attribution_interaction_date ON campaign_attribution(interaction_date);

-- Create marketing_calendar_links table
CREATE TABLE IF NOT EXISTS marketing_calendar_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    marketing_item_id UUID NOT NULL REFERENCES marketing_items(id) ON DELETE CASCADE,
    
    -- Linked entity (can be task or calendar event)
    linked_type TEXT NOT NULL CHECK (linked_type IN ('task', 'calendar_event', 'milestone')),
    linked_id UUID NOT NULL,
    
    -- Relationship
    relationship_type TEXT DEFAULT 'related' CHECK (relationship_type IN ('related', 'deliverable', 'milestone', 'deadline')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for marketing_calendar_links
CREATE INDEX idx_marketing_calendar_links_campaign ON marketing_calendar_links(marketing_item_id);
CREATE INDEX idx_marketing_calendar_links_workspace ON marketing_calendar_links(workspace_id);
CREATE INDEX idx_marketing_calendar_links_linked ON marketing_calendar_links(linked_id);

-- Create marketing_analytics table
CREATE TABLE IF NOT EXISTS marketing_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    marketing_item_id UUID NOT NULL REFERENCES marketing_items(id) ON DELETE CASCADE,
    
    -- Date
    analytics_date DATE NOT NULL,
    
    -- Metrics
    impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),
    clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
    engagements INTEGER DEFAULT 0 CHECK (engagements >= 0),
    conversions INTEGER DEFAULT 0 CHECK (conversions >= 0),
    leads_generated INTEGER DEFAULT 0 CHECK (leads_generated >= 0),
    revenue_generated NUMERIC DEFAULT 0 CHECK (revenue_generated >= 0),
    
    -- Costs
    ad_spend NUMERIC DEFAULT 0 CHECK (ad_spend >= 0),
    
    -- Channel
    channel TEXT CHECK (channel IN ('email', 'social', 'paid_ads', 'content', 'events', 'other')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(marketing_item_id, analytics_date, channel)
);

-- Create indexes for marketing_analytics
CREATE INDEX idx_marketing_analytics_campaign ON marketing_analytics(marketing_item_id);
CREATE INDEX idx_marketing_analytics_date ON marketing_analytics(analytics_date);
CREATE INDEX idx_marketing_analytics_workspace ON marketing_analytics(workspace_id);
CREATE INDEX idx_marketing_analytics_channel ON marketing_analytics(channel);

-- ============================================================================
-- PART 3: ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_calendar_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_analytics ENABLE ROW LEVEL SECURITY;

-- Revenue Transactions Policies
CREATE POLICY "Users can view revenue transactions in their workspace"
ON revenue_transactions FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert revenue transactions in their workspace"
ON revenue_transactions FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update revenue transactions in their workspace"
ON revenue_transactions FOR UPDATE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete revenue transactions in their workspace"
ON revenue_transactions FOR DELETE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Financial Forecasts Policies
CREATE POLICY "Users can view forecasts in their workspace"
ON financial_forecasts FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert forecasts in their workspace"
ON financial_forecasts FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update forecasts in their workspace"
ON financial_forecasts FOR UPDATE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete forecasts in their workspace"
ON financial_forecasts FOR DELETE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Budget Plans Policies
CREATE POLICY "Users can view budgets in their workspace"
ON budget_plans FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert budgets in their workspace"
ON budget_plans FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update budgets in their workspace"
ON budget_plans FOR UPDATE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete budgets in their workspace"
ON budget_plans FOR DELETE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Campaign Attribution Policies
CREATE POLICY "Users can view campaign attribution in their workspace"
ON campaign_attribution FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert campaign attribution in their workspace"
ON campaign_attribution FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update campaign attribution in their workspace"
ON campaign_attribution FOR UPDATE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete campaign attribution in their workspace"
ON campaign_attribution FOR DELETE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Marketing Calendar Links Policies
CREATE POLICY "Users can view marketing calendar links in their workspace"
ON marketing_calendar_links FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert marketing calendar links in their workspace"
ON marketing_calendar_links FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update marketing calendar links in their workspace"
ON marketing_calendar_links FOR UPDATE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete marketing calendar links in their workspace"
ON marketing_calendar_links FOR DELETE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Marketing Analytics Policies
CREATE POLICY "Users can view marketing analytics in their workspace"
ON marketing_analytics FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert marketing analytics in their workspace"
ON marketing_analytics FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update marketing analytics in their workspace"
ON marketing_analytics FOR UPDATE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete marketing analytics in their workspace"
ON marketing_analytics FOR DELETE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- ============================================================================
-- PART 4: TRIGGERS FOR AUTO-UPDATED TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_revenue_transactions_updated_at BEFORE UPDATE ON revenue_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_forecasts_updated_at BEFORE UPDATE ON financial_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_plans_updated_at BEFORE UPDATE ON budget_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_attribution_updated_at BEFORE UPDATE ON campaign_attribution
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_analytics_updated_at BEFORE UPDATE ON marketing_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 5: HELPFUL VIEWS (OPTIONAL)
-- ============================================================================

-- View for revenue by customer
CREATE OR REPLACE VIEW revenue_by_customer AS
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

-- View for campaign performance summary
CREATE OR REPLACE VIEW campaign_performance_summary AS
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

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comments for documentation
COMMENT ON TABLE revenue_transactions IS 'Tracks all revenue transactions with CRM attribution';
COMMENT ON TABLE financial_forecasts IS 'Stores revenue and expense forecasts based on pipeline';
COMMENT ON TABLE budget_plans IS 'Budget planning and tracking by category';
COMMENT ON TABLE campaign_attribution IS 'Links marketing campaigns to CRM leads and deals';
COMMENT ON TABLE marketing_calendar_links IS 'Junction table linking campaigns to calendar events';
COMMENT ON TABLE marketing_analytics IS 'Daily marketing performance metrics by channel';
