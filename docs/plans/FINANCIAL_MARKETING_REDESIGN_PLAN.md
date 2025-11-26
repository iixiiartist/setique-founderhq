# Financial & Marketing Tab Redesign - Implementation Plan

## Executive Summary

This document outlines a comprehensive redesign of the Financial and Marketing tabs to create founder-focused, data-linked, and actionable UX that leverages existing CRM accounts, deal flow data, calendar events, and document content.

**Key Goals:**
- Transform Financial tab into a comprehensive business intelligence dashboard
- Link revenue/expenses to CRM accounts and deals for full attribution tracking
- Integrate Marketing campaigns with calendar events and document content
- Create sophisticated campaign tracking with ROI analysis
- Establish bidirectional data relationships across modules

---

## Current State Analysis

### Financial Tab (Current)
**Strengths:**
- ✅ Basic financial logging (MRR, GMV, signups)
- ✅ Expense tracking with categories
- ✅ Visual charts (Revenue trends, expense pie chart)
- ✅ KPI cards with trend indicators
- ✅ Month-over-month comparison

**Limitations:**
- ❌ No link between revenue and CRM accounts/deals
- ❌ No expense attribution to campaigns or accounts
- ❌ No cash flow projections
- ❌ No burn rate calculation
- ❌ No runway tracking
- ❌ Limited business intelligence
- ❌ No invoice/payment tracking
- ❌ No revenue forecasting based on deal pipeline

### Marketing Tab (Current)
**Strengths:**
- ✅ Campaign creation with types (Blog Post, Newsletter, Social Campaign, Webinar)
- ✅ Status tracking (Planned → In Progress → Completed → Published)
- ✅ Due dates for campaigns
- ✅ Notes on campaigns
- ✅ Task management integration

**Limitations:**
- ❌ No calendar integration for content planning
- ❌ No document linking for campaign assets
- ❌ No ROI tracking (cost vs. results)
- ❌ No attribution to leads/customers
- ❌ No analytics or performance metrics
- ❌ No campaign templates or workflows
- ❌ No multi-channel tracking
- ❌ Content calendar not linked to actual calendar events

### Database Schema (Current)

**Financial Tables:**
```sql
-- financial_logs table
CREATE TABLE financial_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    date DATE NOT NULL,
    mrr NUMERIC DEFAULT 0,
    gmv NUMERIC DEFAULT 0,
    signups INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    date DATE NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    vendor TEXT,
    payment_method TEXT,
    receipt_document_id UUID,
    notes JSONB DEFAULT '[]',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Marketing Tables:**
```sql
-- marketing_items table
CREATE TABLE marketing_items (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other'
    status TEXT DEFAULT 'Planned',
    due_date DATE,
    due_time TIME,
    notes JSONB DEFAULT '[]',
    assigned_to UUID,
    assigned_to_name TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**CRM Tables (Already Exist):**
```sql
-- crm_items table
CREATE TABLE crm_items (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id),
    company TEXT NOT NULL,
    type TEXT NOT NULL, -- 'investor', 'customer', 'partner'
    priority TEXT DEFAULT 'Medium',
    status TEXT NOT NULL,
    next_action TEXT,
    next_action_date DATE,
    check_size NUMERIC, -- For investors
    deal_value NUMERIC, -- For customers
    opportunity TEXT, -- For partners
    notes JSONB DEFAULT '[]',
    assigned_to UUID,
    assigned_to_name TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY,
    crm_item_id UUID REFERENCES crm_items(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    title TEXT,
    linkedin TEXT,
    notes JSONB DEFAULT '[]',
    meetings JSONB DEFAULT '[]',
    assigned_to UUID,
    assigned_to_name TEXT,
    tags TEXT[],
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Redesign Architecture

### 1. Financial Tab - Enhanced Schema

#### New Tables

**1.1 Revenue Transactions**
```sql
CREATE TABLE revenue_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    
    -- Transaction Details
    transaction_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    transaction_type TEXT NOT NULL, -- 'invoice', 'payment', 'refund', 'recurring'
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    
    -- Attribution & Linking
    crm_item_id UUID REFERENCES crm_items(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    deal_stage TEXT, -- Capture deal stage at time of transaction
    
    -- Invoice/Payment Details
    invoice_number TEXT,
    payment_method TEXT,
    payment_date DATE,
    due_date DATE,
    
    -- Categorization
    revenue_category TEXT, -- 'product_sale', 'service_fee', 'subscription', 'consulting', 'partnership'
    product_line TEXT,
    
    -- Metadata
    description TEXT,
    notes JSONB DEFAULT '[]',
    document_ids UUID[], -- Link to invoices, contracts, etc.
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_revenue_transactions_workspace ON revenue_transactions(workspace_id);
CREATE INDEX idx_revenue_transactions_crm ON revenue_transactions(crm_item_id);
CREATE INDEX idx_revenue_transactions_date ON revenue_transactions(transaction_date);
```

**1.2 Enhanced Expenses**
```sql
-- Add these columns to existing expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS crm_item_id UUID REFERENCES crm_items(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS marketing_item_id UUID REFERENCES marketing_items(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type TEXT DEFAULT 'operating'; -- 'operating', 'marketing', 'sales', 'rd'
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_period TEXT; -- 'monthly', 'quarterly', 'annual'
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX idx_expenses_workspace ON expenses(workspace_id);
CREATE INDEX idx_expenses_crm ON expenses(crm_item_id);
CREATE INDEX idx_expenses_marketing ON expenses(marketing_item_id);
CREATE INDEX idx_expenses_date ON expenses(date);
```

**1.3 Financial Forecasts**
```sql
CREATE TABLE financial_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    
    -- Forecast Period
    forecast_month DATE NOT NULL, -- First day of month
    forecast_type TEXT NOT NULL, -- 'revenue', 'expense', 'runway'
    
    -- Forecast Values
    forecasted_amount NUMERIC NOT NULL,
    confidence_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    
    -- Attribution
    based_on_deals UUID[], -- Array of crm_item_id
    assumptions TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(workspace_id, forecast_month, forecast_type)
);

CREATE INDEX idx_financial_forecasts_workspace ON financial_forecasts(workspace_id);
```

**1.4 Budget Plans**
```sql
CREATE TABLE budget_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    
    -- Budget Details
    budget_name TEXT NOT NULL,
    budget_period_start DATE NOT NULL,
    budget_period_end DATE NOT NULL,
    
    -- Budget Categories
    category TEXT NOT NULL, -- Matches expense categories
    allocated_amount NUMERIC NOT NULL,
    
    -- Tracking
    spent_amount NUMERIC DEFAULT 0,
    remaining_amount NUMERIC GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
    
    -- Alerts
    alert_threshold NUMERIC DEFAULT 0.8, -- Alert at 80% spent
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_budget_plans_workspace ON budget_plans(workspace_id);
CREATE INDEX idx_budget_plans_period ON budget_plans(budget_period_start, budget_period_end);
```

#### Enhanced Financial Tab TypeScript Interfaces

```typescript
// New types for revenue_transactions
export interface RevenueTransaction {
    id: string;
    workspaceId: string;
    userId: string;
    transactionDate: string; // YYYY-MM-DD
    amount: number;
    currency: string;
    transactionType: 'invoice' | 'payment' | 'refund' | 'recurring';
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    
    // Attribution
    crmItemId?: string;
    contactId?: string;
    dealStage?: string;
    companyName?: string; // Denormalized for display
    
    // Invoice details
    invoiceNumber?: string;
    paymentMethod?: string;
    paymentDate?: string;
    dueDate?: string;
    
    // Categorization
    revenueCategory?: 'product_sale' | 'service_fee' | 'subscription' | 'consulting' | 'partnership';
    productLine?: string;
    
    description?: string;
    notes: Note[];
    documentIds?: string[];
    
    createdAt: number;
    updatedAt: number;
}

// Enhanced Expense interface
export interface Expense {
    id: string;
    workspaceId: string;
    date: string; // YYYY-MM-DD
    category: ExpenseCategory;
    amount: number;
    description: string;
    vendor?: string;
    paymentMethod?: PaymentMethod;
    receiptDocumentId?: string;
    notes: Note[];
    
    // NEW: Attribution fields
    crmItemId?: string;
    marketingItemId?: string;
    expenseType?: 'operating' | 'marketing' | 'sales' | 'rd';
    isRecurring?: boolean;
    recurrencePeriod?: 'monthly' | 'quarterly' | 'annual';
    tags?: string[];
    
    // Denormalized for display
    companyName?: string;
    campaignTitle?: string;
}

export interface FinancialForecast {
    id: string;
    workspaceId: string;
    userId: string;
    forecastMonth: string; // YYYY-MM-DD (first day of month)
    forecastType: 'revenue' | 'expense' | 'runway';
    forecastedAmount: number;
    confidenceLevel: 'low' | 'medium' | 'high';
    basedOnDeals?: string[]; // Array of CRM item IDs
    assumptions?: string;
    createdAt: number;
    updatedAt: number;
}

export interface BudgetPlan {
    id: string;
    workspaceId: string;
    userId: string;
    budgetName: string;
    budgetPeriodStart: string; // YYYY-MM-DD
    budgetPeriodEnd: string; // YYYY-MM-DD
    category: ExpenseCategory;
    allocatedAmount: number;
    spentAmount: number;
    remainingAmount: number; // Calculated
    alertThreshold: number; // 0-1 (e.g., 0.8 for 80%)
    notes?: string;
    createdAt: number;
    updatedAt: number;
}

// Enhanced Financial Dashboard Data
export interface FinancialDashboardData {
    // Existing
    financialLogs: FinancialLog[];
    expenses: Expense[];
    
    // New
    revenueTransactions: RevenueTransaction[];
    forecasts: FinancialForecast[];
    budgets: BudgetPlan[];
    
    // Calculated Metrics
    metrics: {
        currentMonthRevenue: number;
        currentMonthExpenses: number;
        burnRate: number; // Monthly burn
        runway: number; // Months of runway
        cashOnHand: number;
        
        // Revenue breakdown
        revenueByCategory: { category: string; amount: number }[];
        revenueByCustomer: { customerId: string; customerName: string; amount: number }[];
        
        // Expense breakdown
        expensesByType: { type: string; amount: number }[];
        expensesByCategory: { category: string; amount: number }[];
        
        // Pipeline metrics
        pipelineValue: number; // Total deal_value from customers
        weightedPipelineValue: number; // Based on deal stage probabilities
        averageDealSize: number;
        averageSalesCycle: number; // Days
        
        // Growth metrics
        mrrGrowthRate: number; // Month-over-month %
        customerAcquisitionCost: number; // Marketing/Sales expenses / new customers
        customerLifetimeValue: number; // Calculated from MRR
        
        // Forecasts
        next3MonthsRevenueForecast: number[];
        next3MonthsExpenseForecast: number[];
    };
}
```

### 2. Marketing Tab - Enhanced Schema

#### Enhanced Marketing Schema

**2.1 Enhanced Marketing Items**
```sql
-- Add columns to existing marketing_items table
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS campaign_budget NUMERIC DEFAULT 0;
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS actual_spend NUMERIC DEFAULT 0;
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS channels TEXT[]; -- ['email', 'social', 'paid_ads', 'content', 'events']
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS goals TEXT; -- Campaign objectives
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS kpis JSONB DEFAULT '{}'; -- {impressions: 0, clicks: 0, conversions: 0, revenue: 0}
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS document_ids UUID[]; -- Link to campaign documents
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS calendar_event_ids UUID[]; -- Link to calendar events
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS parent_campaign_id UUID REFERENCES marketing_items(id) ON DELETE SET NULL;

CREATE INDEX idx_marketing_items_workspace ON marketing_items(workspace_id);
CREATE INDEX idx_marketing_items_status ON marketing_items(status);
CREATE INDEX idx_marketing_items_date ON marketing_items(due_date);
```

**2.2 Campaign Attribution**
```sql
CREATE TABLE campaign_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Campaign & Lead
    marketing_item_id UUID REFERENCES marketing_items(id) ON DELETE CASCADE,
    crm_item_id UUID REFERENCES crm_items(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    -- Attribution Details
    attribution_type TEXT NOT NULL, -- 'first_touch', 'last_touch', 'multi_touch'
    attribution_weight NUMERIC DEFAULT 1.0, -- For multi-touch attribution
    
    -- Tracking
    interaction_date TIMESTAMP DEFAULT NOW(),
    conversion_date TIMESTAMP,
    revenue_attributed NUMERIC DEFAULT 0,
    
    -- Source tracking
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaign_attribution_campaign ON campaign_attribution(marketing_item_id);
CREATE INDEX idx_campaign_attribution_crm ON campaign_attribution(crm_item_id);
CREATE INDEX idx_campaign_attribution_workspace ON campaign_attribution(workspace_id);
```

**2.3 Content Calendar Events**
```sql
-- Link marketing items to calendar events
-- This is a junction table between marketing_items and calendar/tasks

CREATE TABLE marketing_calendar_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    marketing_item_id UUID REFERENCES marketing_items(id) ON DELETE CASCADE,
    
    -- Linked entity (can be task or calendar event)
    linked_type TEXT NOT NULL, -- 'task', 'calendar_event', 'milestone'
    linked_id UUID NOT NULL, -- ID of task or event
    
    -- Relationship
    relationship_type TEXT DEFAULT 'related', -- 'related', 'deliverable', 'milestone', 'deadline'
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_marketing_calendar_links_campaign ON marketing_calendar_links(marketing_item_id);
CREATE INDEX idx_marketing_calendar_links_workspace ON marketing_calendar_links(workspace_id);
```

**2.4 Marketing Analytics**
```sql
CREATE TABLE marketing_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    marketing_item_id UUID REFERENCES marketing_items(id) ON DELETE CASCADE,
    
    -- Date
    analytics_date DATE NOT NULL,
    
    -- Metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    revenue_generated NUMERIC DEFAULT 0,
    
    -- Costs
    ad_spend NUMERIC DEFAULT 0,
    
    -- Calculated
    ctr NUMERIC GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 THEN (clicks::NUMERIC / impressions::NUMERIC) ELSE 0 END
    ) STORED,
    conversion_rate NUMERIC GENERATED ALWAYS AS (
        CASE WHEN clicks > 0 THEN (conversions::NUMERIC / clicks::NUMERIC) ELSE 0 END
    ) STORED,
    roi NUMERIC GENERATED ALWAYS AS (
        CASE WHEN ad_spend > 0 THEN ((revenue_generated - ad_spend) / ad_spend) ELSE 0 END
    ) STORED,
    
    -- Channel
    channel TEXT, -- 'email', 'social', 'paid_ads', 'content', 'events'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(marketing_item_id, analytics_date, channel)
);

CREATE INDEX idx_marketing_analytics_campaign ON marketing_analytics(marketing_item_id);
CREATE INDEX idx_marketing_analytics_date ON marketing_analytics(analytics_date);
CREATE INDEX idx_marketing_analytics_workspace ON marketing_analytics(workspace_id);
```

#### Enhanced Marketing Tab TypeScript Interfaces

```typescript
// Enhanced MarketingItem
export interface MarketingItem {
    id: string;
    workspaceId: string;
    title: string;
    type: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Product Launch' | 'Event' | 'Other';
    status: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled';
    createdAt: number;
    notes: Note[];
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM
    assignedTo?: string;
    assignedToName?: string;
    
    // NEW: Campaign details
    campaignBudget?: number;
    actualSpend?: number;
    targetAudience?: string;
    channels?: ('email' | 'social' | 'paid_ads' | 'content' | 'events')[];
    goals?: string;
    kpis?: {
        impressions?: number;
        clicks?: number;
        engagements?: number;
        conversions?: number;
        revenue?: number;
    };
    
    // Links
    documentIds?: string[]; // Linked campaign documents
    calendarEventIds?: string[]; // Linked calendar events
    tags?: string[];
    parentCampaignId?: string; // For sub-campaigns
}

export interface CampaignAttribution {
    id: string;
    workspaceId: string;
    marketingItemId: string;
    crmItemId: string;
    contactId?: string;
    attributionType: 'first_touch' | 'last_touch' | 'multi_touch';
    attributionWeight: number;
    interactionDate: number;
    conversionDate?: number;
    revenueAttributed: number;
    
    // UTM parameters
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    
    // Denormalized for display
    campaignTitle?: string;
    companyName?: string;
}

export interface MarketingAnalytics {
    id: string;
    workspaceId: string;
    marketingItemId: string;
    analyticsDate: string; // YYYY-MM-DD
    
    // Metrics
    impressions: number;
    clicks: number;
    engagements: number;
    conversions: number;
    leadsGenerated: number;
    revenueGenerated: number;
    
    // Costs
    adSpend: number;
    
    // Calculated
    ctr: number; // Click-through rate
    conversionRate: number;
    roi: number; // Return on investment
    
    channel?: 'email' | 'social' | 'paid_ads' | 'content' | 'events';
    
    createdAt: number;
    updatedAt: number;
}

// Marketing Dashboard Data
export interface MarketingDashboardData {
    campaigns: MarketingItem[];
    attributions: CampaignAttribution[];
    analytics: MarketingAnalytics[];
    
    // Calculated Metrics
    metrics: {
        activeCampaigns: number;
        totalBudget: number;
        totalSpend: number;
        budgetRemaining: number;
        
        // Performance
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
        totalRevenue: number;
        overallROI: number;
        averageCTR: number;
        averageConversionRate: number;
        
        // Attribution
        leadsGenerated: number;
        dealsInfluenced: number;
        attributedRevenue: number;
        
        // Channel performance
        performanceByChannel: {
            channel: string;
            impressions: number;
            clicks: number;
            conversions: number;
            revenue: number;
            spend: number;
            roi: number;
        }[];
        
        // Campaign performance
        topPerformingCampaigns: {
            campaignId: string;
            campaignTitle: string;
            roi: number;
            revenue: number;
            conversions: number;
        }[];
    };
}
```

---

## Component Architecture

### 1. Financial Tab Component Structure

```
FinancialsTab/
├── index.tsx (Main container)
├── components/
│   ├── FinancialOverview.tsx (KPIs, charts, summary)
│   ├── RevenueModule.tsx
│   │   ├── RevenueList.tsx
│   │   ├── RevenueForm.tsx
│   │   ├── RevenueChart.tsx
│   │   └── RevenueByCustomer.tsx (Links to CRM)
│   ├── ExpenseModule.tsx
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseForm.tsx (with CRM/Campaign linking)
│   │   ├── ExpenseChart.tsx
│   │   └── BudgetTracker.tsx
│   ├── CashFlowModule.tsx
│   │   ├── CashFlowChart.tsx
│   │   ├── BurnRateCard.tsx
│   │   └── RunwayProjection.tsx
│   ├── PipelineModule.tsx
│   │   ├── DealPipelineValue.tsx (from CRM)
│   │   ├── ForecastedRevenue.tsx
│   │   └── DealStageBreakdown.tsx
│   ├── BudgetModule.tsx
│   │   ├── BudgetList.tsx
│   │   ├── BudgetForm.tsx
│   │   └── BudgetVsActual.tsx
│   └── MetricsModule.tsx
│       ├── GrowthMetrics.tsx
│       ├── UnitEconomics.tsx (CAC, LTV)
│       └── EfficiencyMetrics.tsx
└── utils/
    ├── financialCalculations.ts
    ├── forecastingLogic.ts
    └── chartHelpers.ts
```

### 2. Marketing Tab Component Structure

```
MarketingTab/
├── index.tsx (Main container)
├── components/
│   ├── MarketingOverview.tsx (KPIs, campaign stats)
│   ├── CampaignModule.tsx
│   │   ├── CampaignList.tsx (Grid/List view)
│   │   ├── CampaignForm.tsx (Enhanced with budget, channels)
│   │   ├── CampaignDetail.tsx (Full campaign view)
│   │   └── CampaignTemplates.tsx
│   ├── ContentCalendar.tsx
│   │   ├── CalendarView.tsx (Month/Week view with events)
│   │   ├── ContentScheduler.tsx
│   │   └── CalendarEventLink.tsx (Link to calendar events)
│   ├── AnalyticsModule.tsx
│   │   ├── CampaignPerformance.tsx
│   │   ├── ChannelAnalytics.tsx
│   │   ├── ROICalculator.tsx
│   │   └── AttributionReport.tsx
│   ├── AttributionModule.tsx
│   │   ├── LeadAttribution.tsx (Links to CRM)
│   │   ├── RevenueAttribution.tsx
│   │   └── TouchpointTimeline.tsx
│   ├── ContentLibrary.tsx
│   │   ├── DocumentPicker.tsx (Link documents to campaigns)
│   │   ├── AssetManager.tsx
│   │   └── TemplateGallery.tsx
│   └── BudgetTracker.tsx
│       ├── SpendByChannel.tsx
│       ├── BudgetAlerts.tsx
│       └── ROIOverview.tsx
└── utils/
    ├── marketingCalculations.ts
    ├── attributionLogic.ts
    └── analyticsHelpers.ts
```

---

## UI/UX Design Specifications

### Financial Tab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Financial Dashboard                                    [Filter] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │ Cash Flow│ │ Burn Rate│ │ Runway   │ │ Pipeline │          │
│ │ $45,320  │ │ $18,500/ │ │ 14.2 mo  │ │ $185K    │          │
│ │ ▲ +12.5% │ │ month    │ │ ▼ -2.1mo │ │ ▲ +22K   │          │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Revenue & Expenses (12 months)          [Line Chart]        ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌────────────────────┐ ┌───────────────────────────────────────┐
│ │ Revenue Breakdown  │ │ Recent Transactions                  ││
│ │ ┌──────────────┐  │ │ ┌─────────────────────────────────┐ ││
│ │ │ By Customer  │  │ │ │ □ Acme Corp - $15K              │ ││
│ │ │ [Bar Chart]  │  │ │ │   Invoice #INV-001 · Customer   │ ││
│ │ │              │  │ │ │   Due: Dec 15 · [View Deal]    │ ││
│ │ └──────────────┘  │ │ ├─────────────────────────────────┤ ││
│ │                    │ │ │ □ Tech Solutions - $8K          │ ││
│ │ By Category        │ │ │   Subscription · Recurring      │ ││
│ │ [Pie Chart]        │ │ │   [View Customer]               │ ││
│ │                    │ │ └─────────────────────────────────┘ ││
│ └────────────────────┘ └───────────────────────────────────────┘
│                                                                  │
│ ┌────────────────────┐ ┌───────────────────────────────────────┐
│ │ Expense Tracking   │ │ Budget vs Actual                     ││
│ │ ┌──────────────┐  │ │ ┌─────────────────────────────────┐ ││
│ │ │ This Month   │  │ │ │ Marketing: $8K / $12K (67%)     │ ││
│ │ │ $24,580      │  │ │ │ [████████░░░░]                  │ ││
│ │ │              │  │ │ ├─────────────────────────────────┤ ││
│ │ │ By Category  │  │ │ │ Software: $5K / $6K (83%)       │ ││
│ │ │ [Bar Chart]  │  │ │ │ [██████████░░] ⚠️ Alert        │ ││
│ │ │              │  │ │ └─────────────────────────────────┘ ││
│ │ │ Linked to:   │  │ │                                      ││
│ │ │ • Campaigns  │  │ │ [+ Create Budget] [View All]        ││
│ │ │ • Deals      │  │ │                                      ││
│ │ └──────────────┘  │ └───────────────────────────────────────┘
│ └────────────────────┘                                         │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Pipeline-Based Forecast                                     ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Next 3 Months Revenue Forecast                          │││
│ │ │ Based on 12 deals in pipeline                           │││
│ │ │ [Area Chart showing ranges: Low/Medium/High confidence] │││
│ │ └─────────────────────────────────────────────────────────┘││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌────────────────────┐ ┌───────────────────────────────────────┐
│ │ Unit Economics     │ │ Growth Metrics                       ││
│ │                    │ │                                       ││
│ │ CAC: $2,450       │ │ MRR Growth: +18.5%                   ││
│ │ LTV: $18,500      │ │ Customer Growth: +12 this month      ││
│ │ LTV:CAC = 7.6x ✅ │ │ Churn Rate: 2.1%                     ││
│ │                    │ │ Net Revenue Retention: 108%          ││
│ └────────────────────┘ └───────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Marketing Tab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Marketing Dashboard                       [View: Grid|Calendar] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │ Active   │ │ Budget   │ │ ROI      │ │ Leads    │          │
│ │ Campaigns│ │ Used     │ │ 3.2x     │ │ Generated│          │
│ │ 8        │ │ $18K/$25K│ │ ▲ +0.8x  │ │ 45       │          │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Campaign Performance Overview                                ││
│ │ [Multi-line chart: Impressions, Clicks, Conversions]        ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌────────────────────┐ ┌───────────────────────────────────────┐
│ │ Active Campaigns   │ │ Content Calendar                     ││
│ │                    │ │ ┌─────────────────────────────────┐ ││
│ │ ┌──────────────┐  │ │ │ [Calendar Month View]            │ ││
│ │ │ Q4 Product    │  │ │ │                                  │ ││
│ │ │ Launch        │  │ │ │ Mon  Tue  Wed  Thu  Fri         │ ││
│ │ │ ──────────────│  │ │ │  1    2    3    4    5          │ ││
│ │ │ Status: Active│  │ │ │      📧        📱               │ ││
│ │ │ Budget: $12K  │  │ │ │                                  │ ││
│ │ │ Spent: $8.5K  │  │ │ │  8    9   10   11   12          │ ││
│ │ │ ROI: 4.2x     │  │ │ │ 📝   📊        📢               │ ││
│ │ │               │  │ │ │                                  │ ││
│ │ │ 📄 3 Docs     │  │ │ │ [+ Add Event] [View Full]      │ ││
│ │ │ 📅 4 Events   │  │ │ └─────────────────────────────────┘ ││
│ │ │ 👥 5 Leads    │  │ │                                      ││
│ │ │               │  │ │ Upcoming Deadlines:                  ││
│ │ │ [View] [Edit] │  │ │ • Blog post draft - Dec 3           ││
│ │ └──────────────┘  │ │ • Newsletter send - Dec 5           ││
│ │                    │ │ • Webinar prep - Dec 8              ││
│ └────────────────────┘ └───────────────────────────────────────┘
│                                                                  │
│ ┌────────────────────┐ ┌───────────────────────────────────────┐
│ │ Channel Analytics  │ │ Campaign Attribution                 ││
│ │ ┌──────────────┐  │ │ ┌─────────────────────────────────┐ ││
│ │ │ Email        │  │ │ │ Campaign → Lead → Deal           │ ││
│ │ │ ROI: 5.8x    │  │ │ │                                  │ ││
│ │ │ Clicks: 1.2K │  │ │ │ Q4 Launch → Acme Corp           │ ││
│ │ │ Conv: 8.5%   │  │ │ │ First Touch · Dec 1, 2024       │ ││
│ │ ├──────────────│  │ │ │ Deal Value: $15K                │ ││
│ │ │ Social       │  │ │ │ [View Deal] [View Campaign]     │ ││
│ │ │ ROI: 2.1x    │  │ │ │                                  │ ││
│ │ │ Clicks: 850  │  │ │ │ Newsletter → Tech Solutions     │ ││
│ │ │ Conv: 3.2%   │  │ │ │ Multi-touch · Nov 28, 2024      │ ││
│ │ └──────────────┘  │ │ │ Deal Value: $8K                 │ ││
│ │                    │ │ │ [View Deal] [View Campaign]     │ ││
│ │ [View All]         │ │ └─────────────────────────────────┘ ││
│ └────────────────────┘ └───────────────────────────────────────┘
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Campaign Documents & Assets                                 ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Q4 Product Launch Materials:                            │││
│ │ │ • Campaign Brief.doc        [Open] [Edit]               │││
│ │ │ • Email Template v3.html    [Open] [Edit]               │││
│ │ │ • Landing Page Copy.doc     [Open] [Edit]               │││
│ │ │                                                          │││
│ │ │ [+ Link Document] [Upload New]                          │││
│ │ └─────────────────────────────────────────────────────────┘││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Schema Updates (Week 1)
**Priority: HIGH**

**Tasks:**
1. Create migration scripts for new tables:
   - `revenue_transactions`
   - `financial_forecasts`
   - `budget_plans`
   - `campaign_attribution`
   - `marketing_calendar_links`
   - `marketing_analytics`

2. Alter existing tables:
   - Add columns to `expenses`
   - Add columns to `marketing_items`

3. Create indexes for performance

4. Update RLS policies for new tables

5. Test migrations in development

**Deliverables:**
- Migration SQL files
- Rollback scripts
- Documentation

### Phase 2: TypeScript Types & Interfaces (Week 1-2)
**Priority: HIGH**

**Tasks:**
1. Update `types.ts` with new interfaces
2. Update `database.ts` types
3. Create calculation/utility types
4. Add validation schemas

**Deliverables:**
- Updated type definitions
- Type validation utilities

### Phase 3: Financial Tab - Core Modules (Week 2-3)
**Priority: HIGH**

**Tasks:**
1. **Revenue Module:**
   - Create RevenueTransaction form
   - Add CRM account linking dropdown
   - Build revenue list with filters
   - Create revenue charts (by customer, by category)

2. **Enhanced Expense Module:**
   - Add CRM/Campaign linking to expense form
   - Create expense attribution view
   - Build budget tracking component

3. **Cash Flow & Burn Rate:**
   - Build cash flow calculator
   - Create burn rate card
   - Build runway projection chart

**Deliverables:**
- Revenue management components
- Enhanced expense tracking
- Cash flow visualization

### Phase 4: Financial Tab - Advanced Features (Week 3-4)
**Priority: MEDIUM**

**Tasks:**
1. **Pipeline Forecasting:**
   - Calculate weighted pipeline value from CRM
   - Build forecast chart
   - Create confidence interval display

2. **Budget Management:**
   - Budget creation form
   - Budget vs actual tracking
   - Alert system for over-budget

3. **Unit Economics:**
   - CAC calculator (marketing spend / new customers)
   - LTV calculator (from MRR data)
   - Display ratios and recommendations

**Deliverables:**
- Forecasting system
- Budget management
- Unit economics dashboard

### Phase 5: Marketing Tab - Core Enhancements (Week 4-5)
**Priority: HIGH**

**Tasks:**
1. **Enhanced Campaign Form:**
   - Add budget fields
   - Add channel multi-select
   - Add goals and KPI tracking
   - Add document linking

2. **Content Calendar Integration:**
   - Build calendar view component
   - Link campaigns to calendar events
   - Create event scheduling UI

3. **Campaign Analytics:**
   - Analytics data entry form
   - Performance dashboard
   - ROI calculator

**Deliverables:**
- Enhanced campaign creation
- Calendar integration
- Analytics tracking

### Phase 6: Marketing Tab - Attribution & Advanced (Week 5-6)
**Priority: MEDIUM**

**Tasks:**
1. **Campaign Attribution:**
   - Build attribution tracking UI
   - Link campaigns to CRM leads
   - Create attribution report

2. **Channel Analytics:**
   - Per-channel performance dashboard
   - Channel comparison charts
   - Spend allocation recommendations

3. **Document Library Integration:**
   - Document picker component
   - Asset management for campaigns
   - Template library

**Deliverables:**
- Attribution system
- Channel analytics
- Document integration

### Phase 7: Data Service Layer (Ongoing)
**Priority: HIGH**

**Tasks:**
1. Create database service methods:
   - Revenue transactions CRUD
   - Financial forecasts CRUD
   - Budget plans CRUD
   - Campaign attribution CRUD
   - Marketing analytics CRUD

2. Create calculation services:
   - Financial metrics calculator
   - Marketing metrics calculator
   - Attribution logic

3. Add data validation and error handling

**Deliverables:**
- Database service layer
- Calculation utilities
- Validation logic

### Phase 8: Testing & Optimization (Week 6-7)
**Priority: HIGH**

**Tasks:**
1. Unit tests for calculations
2. Integration tests for data flow
3. E2E tests for user workflows
4. Performance optimization
5. Mobile responsiveness

**Deliverables:**
- Test suites
- Performance improvements
- Bug fixes

### Phase 9: Documentation & Training (Week 7-8)
**Priority: MEDIUM**

**Tasks:**
1. User documentation
2. Developer documentation
3. Video tutorials
4. Migration guide for existing users

**Deliverables:**
- Complete documentation
- Training materials

---

## Database Service Methods

### Financial Services

```typescript
class FinancialService {
  // Revenue Transactions
  async createRevenueTransaction(data: Omit<RevenueTransaction, 'id'>): Promise<RevenueTransaction>;
  async updateRevenueTransaction(id: string, updates: Partial<RevenueTransaction>): Promise<RevenueTransaction>;
  async deleteRevenueTransaction(id: string): Promise<void>;
  async getRevenueTransactions(workspaceId: string, filters?: RevenueFilters): Promise<RevenueTransaction[]>;
  
  // Financial Forecasts
  async createForecast(data: Omit<FinancialForecast, 'id'>): Promise<FinancialForecast>;
  async updateForecast(id: string, updates: Partial<FinancialForecast>): Promise<FinancialForecast>;
  async deleteForecast(id: string): Promise<void>;
  async getForecasts(workspaceId: string, type?: string): Promise<FinancialForecast[]>;
  
  // Budget Plans
  async createBudget(data: Omit<BudgetPlan, 'id'>): Promise<BudgetPlan>;
  async updateBudget(id: string, updates: Partial<BudgetPlan>): Promise<BudgetPlan>;
  async deleteBudget(id: string): Promise<void>;
  async getBudgets(workspaceId: string): Promise<BudgetPlan[]>;
  
  // Enhanced Expenses
  async createExpenseWithAttribution(data: Omit<Expense, 'id'>): Promise<Expense>;
  async updateExpenseAttribution(id: string, attribution: {crmItemId?: string; marketingItemId?: string}): Promise<Expense>;
  
  // Calculations
  async calculateFinancialMetrics(workspaceId: string): Promise<FinancialDashboardData['metrics']>;
  async calculateBurnRate(workspaceId: string): Promise<number>;
  async calculateRunway(workspaceId: string): Promise<number>;
  async calculatePipelineValue(workspaceId: string): Promise<{total: number; weighted: number}>;
  async calculateUnitEconomics(workspaceId: string): Promise<{cac: number; ltv: number; ratio: number}>;
}
```

### Marketing Services

```typescript
class MarketingService {
  // Enhanced Campaigns
  async createCampaignWithDetails(data: Omit<MarketingItem, 'id'>): Promise<MarketingItem>;
  async updateCampaignDetails(id: string, updates: Partial<MarketingItem>): Promise<MarketingItem>;
  async linkDocumentsToCampaign(campaignId: string, documentIds: string[]): Promise<void>;
  async linkCalendarEventsToCampaign(campaignId: string, eventIds: string[]): Promise<void>;
  
  // Campaign Attribution
  async createAttribution(data: Omit<CampaignAttribution, 'id'>): Promise<CampaignAttribution>;
  async updateAttribution(id: string, updates: Partial<CampaignAttribution>): Promise<CampaignAttribution>;
  async getAttributions(campaignId?: string, crmItemId?: string): Promise<CampaignAttribution[]>;
  
  // Marketing Analytics
  async createAnalyticsEntry(data: Omit<MarketingAnalytics, 'id'>): Promise<MarketingAnalytics>;
  async updateAnalyticsEntry(id: string, updates: Partial<MarketingAnalytics>): Promise<MarketingAnalytics>;
  async getAnalytics(campaignId: string, dateRange?: {start: string; end: string}): Promise<MarketingAnalytics[]>;
  
  // Calendar Links
  async linkToCalendar(campaignId: string, linkedType: string, linkedId: string, relationship: string): Promise<void>;
  async getCalendarLinks(campaignId: string): Promise<any[]>;
  
  // Calculations
  async calculateMarketingMetrics(workspaceId: string): Promise<MarketingDashboardData['metrics']>;
  async calculateCampaignROI(campaignId: string): Promise<number>;
  async calculateChannelPerformance(workspaceId: string): Promise<any[]>;
  async calculateAttributedRevenue(campaignId: string): Promise<number>;
}
```

---

## Best Practices

### 1. Data Linking Strategy

**Revenue → CRM Accounts:**
- When creating revenue transaction, dropdown to select customer account
- Auto-populate company name, contact from CRM
- Track deal stage at time of transaction
- Enable filtering revenue by customer

**Expenses → CRM/Campaigns:**
- Multi-select attribution: can link to CRM account AND/OR marketing campaign
- Example: Ad spend expense linked to "Q4 Launch" campaign
- Example: Travel expense linked to "Acme Corp" customer account
- Calculate true ROI by subtracting attributed expenses

**Marketing → Calendar:**
- Campaigns can have multiple linked calendar events
- Calendar events show campaign context
- Deadlines automatically appear in calendar
- Task due dates sync bidirectionally

**Marketing → Documents:**
- Link campaign briefs, copy, assets to campaigns
- Document library filtered by campaign
- Version control for campaign materials
- Template reuse across campaigns

### 2. Calculation Best Practices

**Financial Metrics:**
- Always calculate from raw transactions, not cached values
- Use database views for complex aggregations
- Cache calculations with TTL for performance
- Recalculate on data changes via triggers

**Marketing ROI:**
```typescript
// Proper ROI calculation
const calculateROI = (revenue: number, spend: number): number => {
  if (spend === 0) return 0;
  return ((revenue - spend) / spend) * 100;
};

// Multi-touch attribution
const attributeRevenue = (dealValue: number, touchpoints: CampaignAttribution[]): void => {
  const totalWeight = touchpoints.reduce((sum, tp) => sum + tp.attributionWeight, 0);
  touchpoints.forEach(tp => {
    tp.revenueAttributed = (dealValue * tp.attributionWeight) / totalWeight;
  });
};
```

### 3. UX Best Practices

**Progressive Disclosure:**
- Show summary metrics first
- Expandable sections for details
- Drill-down capability (metric → transactions)
- Contextual help tooltips

**Founder-Focused:**
- Use business language, not accounting jargon
- Show actionable insights (not just numbers)
- Highlight problems (over-budget, declining metrics)
- Provide recommendations

**Mobile Responsiveness:**
- Stack modules vertically on mobile
- Simplified charts on small screens
- Touch-friendly controls
- Swipe gestures for navigation

**Performance:**
- Lazy load charts and heavy components
- Paginate transaction lists
- Use virtual scrolling for large lists
- Cache calculated metrics

### 4. Data Validation

**Revenue Transactions:**
- Amount must be > 0
- Date cannot be in future (unless forecast)
- CRM account must exist if linked
- Invoice number must be unique

**Expenses:**
- Amount must be > 0
- If recurring, require recurrence period
- Date required
- Category required

**Marketing Analytics:**
- Impressions >= Clicks >= Conversions (funnel logic)
- Revenue cannot exceed total revenue
- Spend must be >= 0
- Channel must be valid enum value

### 5. Security & Permissions

**Row-Level Security:**
- All financial data scoped to workspace
- Revenue transactions visible based on role
- Budget plans only visible to owners/admins
- Marketing analytics visible to campaign assignees

**Sensitive Data:**
- Financial snapshots restricted to owners (already implemented)
- Revenue details visible to admins+ only
- Expense details visible to all (configurable)

---

## Migration Strategy

### For Existing Users

**Phase 1: Data Preservation**
- All existing financial_logs remain intact
- All existing expenses remain intact
- All existing marketing_items remain intact

**Phase 2: Optional Migration**
- Tool to convert financial_logs to revenue_transactions
- Option to link existing expenses to CRM/campaigns
- Batch attribution assignment tool

**Phase 3: Gradual Adoption**
- Both old and new systems work simultaneously
- User can choose to adopt new features
- No forced migration

**Phase 4: Deprecation (6+ months)**
- Announce deprecation of old financial_logs table
- Provide export tools
- Finally migrate all users

---

## Success Metrics

### User Adoption
- % of users creating revenue transactions (vs old financial logs)
- % of expenses with attribution links
- % of campaigns with budget tracking
- % of campaigns with analytics data

### User Engagement
- Time spent in Financial tab (should increase)
- Time spent in Marketing tab (should increase)
- Number of linked data points (expenses to campaigns, etc.)
- Number of forecasts created

### Business Impact
- Better financial decision making (survey)
- Improved marketing ROI visibility
- Faster campaign planning
- Reduced manual tracking (time saved)

### Technical Performance
- Page load time < 2s
- Chart render time < 500ms
- Query performance < 100ms (p95)
- Zero data loss incidents

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Review and approve this implementation plan
2. Create detailed user stories for Phase 1
3. Design database migration scripts
4. Create wireframes for key UI components
5. Set up project tracking (Jira/Linear/GitHub Projects)

### Week 1-2
1. Implement database migrations (Phase 1)
2. Update TypeScript types (Phase 2)
3. Begin Revenue Module development (Phase 3)

### Week 3-4
1. Complete Revenue Module
2. Enhance Expense Module
3. Build Cash Flow visualizations

### Week 5-6
1. Implement Marketing enhancements
2. Build Calendar integration
3. Create Attribution system

### Week 7-8
1. Testing and optimization
2. Documentation
3. Beta release to select users

---

## Appendix A: Example User Workflows

### Workflow 1: Tracking Revenue from Customer Deal

1. Sales team closes deal in CRM (Customer tab)
2. Deal moves to "Won" status with deal_value $15,000
3. Finance team goes to Financial tab
4. Creates Revenue Transaction:
   - Amount: $15,000
   - Type: Invoice
   - Status: Pending
   - Linked Account: Acme Corp (from CRM dropdown)
   - Due Date: Dec 15, 2024
5. System shows:
   - Revenue forecast updated (+$15K expected Dec)
   - Customer appears in "Revenue by Customer" chart
   - Deal visible in "Recent Transactions" with link to CRM
6. When payment received:
   - Update transaction status to "Paid"
   - Payment date recorded
   - Cash flow chart updated
   - MRR updated if recurring

### Workflow 2: Tracking Marketing Campaign ROI

1. Marketing creates campaign: "Q4 Product Launch"
2. Sets budget: $12,000
3. Links documents:
   - Campaign brief
   - Email templates
   - Landing page copy
4. Creates calendar events:
   - Dec 1: Email blast
   - Dec 5: Social media push
   - Dec 10: Webinar
5. Tracks spend:
   - Creates expense: Facebook Ads - $3,500 → linked to campaign
   - Creates expense: Email platform - $500 → linked to campaign
6. Logs analytics daily:
   - Impressions: 50,000
   - Clicks: 2,500
   - Conversions: 45
7. Links leads to campaign:
   - 5 new leads in CRM attributed to campaign
   - 2 deals created, total value $23,000
8. System shows:
   - Campaign ROI: 3.8x
   - Cost per lead: $89
   - Revenue attributed: $23,000
   - Best performing channel: Email (5.2x ROI)

### Workflow 3: Budget Tracking

1. Finance creates annual budget:
   - Marketing: $144K/year ($12K/month)
   - Software: $72K/year ($6K/month)
   - Operations: $60K/year ($5K/month)
2. Throughout month, expenses logged:
   - Marketing expenses auto-tracked via campaign attribution
   - Software expenses from recurring subscriptions
   - Operations expenses from office, travel, etc.
3. Budget dashboard shows:
   - Marketing: 68% used ($8.2K / $12K) - Green
   - Software: 85% used ($5.1K / $6K) - Yellow warning
   - Operations: 45% used ($2.3K / $5K) - Green
4. Alert triggers:
   - Email sent: "Software budget at 85%, review spending"
5. Finance can drill down:
   - See all software expenses
   - Identify high-cost items
   - Plan for next month

---

## Appendix B: Technical Stack

### Frontend
- React 18+ with TypeScript
- Recharts for data visualization
- TailwindCSS for styling (neo-brutalist theme)
- React Hook Form for forms
- Date-fns for date manipulation

### Backend
- Supabase PostgreSQL
- Row-Level Security (RLS) for data access
- Database triggers for auto-calculations
- Real-time subscriptions for live updates

### State Management
- React Context for global state
- Local state for component-level
- Optimistic updates for UX

### Performance
- React.memo for expensive components
- useMemo for calculated values
- Code splitting for lazy loading
- Virtualized lists for large datasets

---

## Conclusion

This implementation plan provides a comprehensive roadmap for transforming the Financial and Marketing tabs into sophisticated, data-linked business intelligence tools. By connecting revenue to customers, expenses to campaigns, and campaigns to calendar events and documents, we create a cohesive system that gives founders true visibility into their business performance.

**Key Success Factors:**
1. Incremental rollout (no breaking changes)
2. User-friendly UX with progressive disclosure
3. Robust data validation and error handling
4. Performance optimization from day one
5. Comprehensive documentation and training

**Timeline:** 8 weeks for full implementation
**Effort:** ~320 hours (40 hours/week × 8 weeks)
**Risk:** Low (backward compatible, well-defined scope)

---

**Document Status:** ✅ Complete - Ready for Review and Approval
**Last Updated:** November 14, 2024
**Version:** 1.0
**Author:** GitHub Copilot (Claude Sonnet 4.5)
