# Marketing Campaign System - Complete Guide

**Last Updated**: November 16, 2025  
**Status**: ✅ Fully Functional

---

## Overview

The marketing campaign system tracks campaign performance, attributes revenue to marketing sources, and provides comprehensive analytics for measuring ROI across all marketing efforts.

---

## How Marketing Analytics Work

### 1. **Campaign Attribution Model**

The system uses **automatic attribution** based on contact sources:

```
Campaign Created → Contact Added with Source → Deal Created → Revenue Attributed
```

**Flow**:
1. Create a marketing campaign (e.g., "Q1 LinkedIn Campaign")
2. When adding new contacts to CRM, set their **Source** field to match the campaign name
3. When those contacts convert to deals, revenue is automatically attributed to the campaign
4. ROI is calculated: `(Total Revenue - Budget Spent) / Budget Spent * 100`

**Example**:
```
Campaign: "Q1 LinkedIn Campaign"
Budget: $5,000
Actual Spend: $4,200

Contacts created with source="Q1 LinkedIn Campaign": 15
Deals closed from those contacts: 3 deals @ $50,000 total
ROI: ($50,000 - $4,200) / $4,200 = 990.5%
```

### 2. **Channel Performance Tracking**

Tracks performance across marketing channels:
- **Email** - Email campaigns, newsletters
- **Social** - LinkedIn, Twitter, Facebook, Instagram
- **Paid Ads** - Google Ads, Facebook Ads, LinkedIn Ads
- **Content** - Blog posts, whitepapers, webinars
- **Events** - Trade shows, conferences, meetups

**Metrics Per Channel**:
- Total leads generated
- Conversion rate (leads → deals)
- Revenue generated
- Average deal size
- Cost per acquisition (if budget tracked)

### 3. **Conversion Funnel Analytics**

Tracks prospects through the funnel:
```
Leads (All Contacts) 
  ↓ 
Qualified (Contacts with Deals)
  ↓
Negotiating (Deals in proposal/negotiation)
  ↓
Won (Closed Won Deals)
```

**Metrics**:
- Stage-by-stage conversion rates
- Overall funnel conversion rate
- Average time in each stage
- Drop-off analysis

---

## Campaign Form Fields Explained

### Basic Information
- **Campaign Title** (required) - Name of your campaign
- **Type** - Blog Post, Newsletter, Social Campaign, Webinar, Product Launch, Event, Other
- **Status** - Planned, In Progress, Completed, Published, Cancelled
- **Assigned To** - Team member responsible
- **Launch Date/Time** - When campaign goes live

### Campaign Details
- **Target Audience** - Description of who you're targeting (e.g., "B2B SaaS companies, 10-50 employees")
- **Goals & KPIs** - What you want to achieve (e.g., "Generate 50 qualified leads, 10% conversion rate")
- **Channels** - Select all channels this campaign will use (multi-select checkboxes)

### Budget & Revenue
- **Budget ($)** - Total budget allocated to this campaign
- **Actual Spend ($)** - Amount spent so far (update as you go)
- **Revenue Target ($)** - Expected revenue this campaign will generate
- **Budget Utilization** - Visual bar showing % of budget spent (auto-calculated)

### Product/Service Linking
- Select which products or services this campaign promotes
- Useful for product launch campaigns or focused promotions
- Shows product name, category, type, and price

### Tags
- Add custom tags for organization (e.g., "Q1 2025", "Lead Gen", "Brand Awareness")
- Filter and search campaigns by tags

---

## How to Use the System

### Creating a Campaign

1. **Navigate to Marketing Tab**
2. **Click "New Campaign" button**
3. **Fill out campaign details**:
   - Enter campaign name (e.g., "Q1 2025 LinkedIn Outreach")
   - Set type, status, and assign team member
   - Define target audience and goals
   - Select marketing channels
   - Set budget and revenue target
   - Link products if applicable
   - Add tags for organization
4. **Click "Create Campaign"**

### Tracking Campaign Performance

1. **Add Contacts with Source Attribution**:
   ```
   When adding a new contact in CRM:
   - Set "Source" field to match your campaign name exactly
   - Example: Source = "Q1 2025 LinkedIn Outreach"
   ```

2. **Update Campaign Spend**:
   - Open campaign for editing
   - Update "Actual Spend" field as you incur costs
   - Budget utilization bar updates automatically

3. **Track Deals**:
   - Create deals for attributed contacts
   - Mark deals as won when closed
   - Revenue automatically attributes to campaign

4. **View Analytics**:
   - **Campaign Analytics Tab** - See ROI, spend, revenue, conversions per campaign
   - **Attribution Tab** - View detailed attribution data across all campaigns
   - **Financials Tab** - See marketing attribution dashboard with ROI calculations

### Viewing Analytics

#### Campaign Analytics View
Shows all campaigns with:
- Campaign name and status
- Budget allocated vs actual spend
- Leads generated
- Conversions (deals won)
- Total revenue attributed
- ROI percentage
- Visual charts (spend vs revenue, ROI by campaign)

#### Attribution View
Detailed attribution data:
- Attribution by type (first-touch, last-touch, multi-touch)
- Revenue per campaign
- Conversion dates
- Source tracking (UTM parameters if available)

#### Financials Tab
Marketing Attribution Dashboard shows:
- Campaign ROI for all active campaigns
- Channel performance breakdown
- Conversion funnel metrics
- Overall marketing effectiveness

---

## Database Schema

### Tables

#### `marketing_items` (Campaigns)
```sql
id UUID PRIMARY KEY
workspace_id UUID -- Workspace isolation
user_id UUID -- Creator
title TEXT -- Campaign name
type TEXT -- Campaign type
status TEXT -- Current status
due_date DATE -- Launch date
due_time TIME -- Launch time
assigned_to UUID -- Assigned team member

-- Campaign Details
campaign_budget NUMERIC(15,2) -- Total budget
actual_spend NUMERIC(15,2) -- Spent so far
target_audience TEXT -- Audience description
channels TEXT[] -- Marketing channels
goals TEXT -- Campaign goals
kpis JSONB -- Structured KPI data
target_revenue NUMERIC(15,2) -- Revenue goal

-- Links
product_service_ids UUID[] -- Linked products
document_ids UUID[] -- Linked documents
calendar_event_ids UUID[] -- Linked calendar events
tags TEXT[] -- Organization tags
parent_campaign_id UUID -- For sub-campaigns

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `marketing_campaigns` (New Attribution Table)
```sql
id UUID PRIMARY KEY
workspace_id UUID
name TEXT -- Campaign name for attribution matching
channel TEXT -- Marketing channel
status TEXT -- active, paused, completed
budget_allocated NUMERIC(12,2)
budget_spent NUMERIC(12,2)
start_date DATE
end_date DATE
target_audience TEXT
campaign_goals TEXT
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `campaign_attribution` (Links Campaigns to Deals)
```sql
id UUID PRIMARY KEY
workspace_id UUID
marketing_item_id UUID -- Links to marketing_items
crm_item_id UUID -- Links to CRM deal/account
contact_id UUID -- Links to contact

attribution_type TEXT -- first_touch, last_touch, multi_touch
attribution_weight NUMERIC -- For weighted attribution
interaction_date TIMESTAMPTZ -- When interaction happened
conversion_date TIMESTAMPTZ -- When converted to deal
revenue_attributed NUMERIC -- Revenue from this attribution

-- UTM Tracking
utm_source TEXT
utm_medium TEXT
utm_campaign TEXT
utm_content TEXT

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `contacts` (Source Field)
```sql
source TEXT -- Marketing source/campaign name for attribution
```

---

## Attribution Methods

### Automatic Attribution (Current)
**Based on Contact Source Field**:
1. Set contact `source` field to match campaign name
2. System automatically links deals from that contact to the campaign
3. Revenue calculates automatically

**Pros**:
- Simple and automatic
- No manual linking required
- Works immediately

**Cons**:
- Requires consistent naming
- Single-touch attribution only (last-touch)

### Manual Attribution (Available via API)
**Using `campaign_attribution` table**:
```typescript
await actions.createCampaignAttribution({
  workspaceId: workspace.id,
  marketingItemId: campaign.id, // Campaign UUID
  crmItemId: deal.id, // Deal UUID
  contactId: contact.id,
  attributionType: 'first_touch', // or 'last_touch', 'multi_touch'
  revenueAttributed: 50000,
  interactionDate: new Date('2025-01-15'),
  conversionDate: new Date('2025-03-01')
});
```

**Pros**:
- Multi-touch attribution support
- Custom attribution weights
- UTM parameter tracking
- Precise revenue attribution

---

## Analytics Calculations

### Campaign ROI
```typescript
ROI = ((Total Revenue - Total Spend) / Total Spend) * 100

Example:
Revenue: $100,000
Spend: $10,000
ROI = ($100,000 - $10,000) / $10,000 * 100 = 900%
```

### Conversion Rate
```typescript
Conversion Rate = (Deals Won / Total Leads) * 100

Example:
Leads: 100 contacts
Deals Won: 5
Conversion Rate = (5 / 100) * 100 = 5%
```

### Average Deal Size
```typescript
Average Deal Size = Total Revenue / Number of Deals

Example:
Total Revenue: $100,000
Deals Won: 5
Average Deal Size = $100,000 / 5 = $20,000
```

### Budget Utilization
```typescript
Budget Utilization = (Actual Spend / Budget Allocated) * 100

Visual Indicator:
- Green: 0-80% (on track)
- Yellow: 80-100% (approaching limit)  
- Red: >100% (over budget)
```

---

## Best Practices

### 1. Consistent Naming
Use consistent campaign names across all touchpoints:
```
✅ Good: "Q1 2025 LinkedIn Outreach"
❌ Bad: "LinkedIn", "linkedin campaign", "Q1 LinkedIn"
```

### 2. Regular Updates
Update campaign spend weekly or bi-weekly to track budget accurately.

### 3. Clear Goals
Set specific, measurable goals in the Goals field:
```
✅ Good: "Generate 50 SQLs, 10% conversion, $100K pipeline"
❌ Bad: "Get more leads"
```

### 4. Tag Organization
Use consistent tag hierarchies:
- Time: "Q1 2025", "January 2025"
- Focus: "Lead Gen", "Brand Awareness", "Product Launch"
- Channel: "LinkedIn", "Google Ads", "Content"

### 5. Track Multiple Channels
If using multiple channels, select all in campaign form for accurate tracking.

### 6. Link Products
Always link promoted products - helps with product-specific ROI analysis.

---

## Troubleshooting

### "Campaign ROI shows 0%"
**Cause**: No deals attributed to campaign  
**Fix**: Ensure contacts have `source` field set to exact campaign name

### "Budget/Spend/Revenue not saving"
**Cause**: Fixed in latest update (z.preprocess number validation)  
**Fix**: Form now handles empty fields correctly - just re-save campaign

### "Contacts not attributing"
**Cause**: Source field doesn't match campaign name exactly  
**Fix**: Check for typos, extra spaces, or case sensitivity issues

### "Attribution data not showing in Analytics tab"
**Cause**: No closed deals yet  
**Fix**: Attribution only shows for deals marked as "closed_won"

---

## API Reference

### Create Campaign Attribution
```typescript
await DataPersistenceAdapter.createCampaignAttribution(
  workspaceId: string,
  userId: string,
  {
    marketingItemId: string,
    crmItemId: string,
    contactId?: string,
    attributionType: 'first_touch' | 'last_touch' | 'multi_touch',
    attributionWeight?: number,
    revenueAttributed: number,
    interactionDate?: Date,
    conversionDate?: Date,
    utmSource?: string,
    utmMedium?: string,
    utmCampaign?: string,
    utmContent?: string
  }
)
```

### Calculate Campaign ROI
```typescript
const roi = await calculateCampaignROI(workspaceId: string)
// Returns: CampaignAttribution[]
```

### Analyze Channel Performance
```typescript
const channels = await analyzeChannelPerformance(workspaceId: string)
// Returns: ChannelPerformance[]
```

### Get Conversion Funnel
```typescript
const funnel = await getConversionFunnel(workspaceId: string)
// Returns: { stages: FunnelStage[], overallConversionRate: number }
```

---

## Recent Fixes (Nov 16, 2025)

### ✅ Fixed: Number Fields Validation
**Issue**: Budget, Actual Spend, and Revenue Target fields showed "expected number, received string" validation errors  
**Fix**: Updated Zod schema to use `z.preprocess` for proper string-to-number conversion
```typescript
// Before
campaignBudget: z.coerce.number().min(0).optional()

// After  
campaignBudget: z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().min(0).optional()
)
```

### ✅ Enhanced: Account/Deal Linking UI
**Added**: Informational section explaining how attribution works via contact source field  
**Future**: Manual account/deal linking interface (coming in next update)

### ✅ Improved: Form Data Flow
- Verified field transformers correctly map camelCase to snake_case
- Confirmed database columns exist and are queried
- Validated data saves and loads correctly

---

## Future Enhancements

### Planned Features
- [ ] Manual CRM deal/account linking UI in campaign form
- [ ] Multi-touch attribution UI
- [ ] UTM parameter tracking and management
- [ ] A/B testing framework for campaigns
- [ ] Campaign templates
- [ ] Automated campaign reporting emails
- [ ] Integration with external marketing platforms (HubSpot, Mailchimp)
- [ ] Campaign calendar view
- [ ] Budget alerts when approaching limit
- [ ] Predictive ROI estimates based on historical data

---

## Support

For issues or questions:
1. Check this guide first
2. Review console errors in browser DevTools
3. Check database logs in Supabase
4. Verify RLS policies are active for your user/workspace

---

## Summary

The marketing campaign system is **fully functional** with:
✅ Campaign creation and management  
✅ Automatic attribution via contact source  
✅ ROI and performance analytics  
✅ Budget tracking and utilization  
✅ Multi-channel campaign support  
✅ Product/service linking  
✅ Comprehensive reporting

**Key Insight**: Attribution is automatic when you set the contact's `source` field to match the campaign name. This simple pattern enables powerful ROI tracking without complex manual linking.
