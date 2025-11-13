# Deal Flow & Product Management Guide

## 🎯 Overview

Your CRM now includes comprehensive deal flow management for tracking:
- **Investors**: Investment stages, check sizes, funding rounds
- **Customers**: Sales pipeline, deal stages, revenue tracking  
- **Partners**: Partnership types, opportunities, collaboration tracking

## 📊 Deal Flow Fields Added

### All Account Types
- **Website**: Company website URL
- **Industry**: Industry sector (SaaS, Fintech, Healthcare, etc.)
- **Description**: Brief description of the company and relationship

### Investors (Investment Tracking)
- **Check Size**: Investment amount ($)
- **Investment Stage**: 
  - Pre-Seed
  - Seed
  - Series A
  - Series B
  - Series C+
  - Growth

### Customers (Sales Pipeline)
- **Deal Value**: Expected/actual revenue ($)
- **Deal Stage**:
  - Lead (initial contact)
  - Qualified (validated fit)
  - Proposal (sent proposal)
  - Negotiation (discussing terms)
  - Closed Won (deal signed!)
  - Closed Lost (didn't work out)

### Partners (Partnership Management)
- **Opportunity**: Description of partnership opportunity
- **Partner Type**:
  - Technology (integrations, APIs)
  - Marketing (co-marketing, content)
  - Distribution (resellers, channels)
  - Integration (product integrations)
  - Referral (lead sharing)
  - Strategic (strategic alliances)

## 🚀 How to Use

### 1. **Apply the Database Migration** (REQUIRED FIRST)

Before you can use these features, you MUST add the new columns to your database:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Open the file: `APPLY_DEAL_FLOW_MIGRATION.sql`
5. Copy and paste the entire SQL into the SQL Editor
6. Click **Run** to apply the migration

### 2. **Create New Accounts with Deal Flow Info**

Navigate to **CRM** → **Account Management** tab:

**For Investors:**
1. Click "+ Add Investor"
2. Fill in:
   - Company name (required)
   - Website, Industry, Description
   - Check Size (amount they typically invest)
   - Investment Stage (what round they focus on)
   - Priority, Status, Next Action
3. Click "Add Investor"

**For Customers:**
1. Click "+ Add Customer"
2. Fill in:
   - Company name (required)
   - Website, Industry, Description
   - Deal Value (expected/actual revenue)
   - Deal Stage (where they are in your pipeline)
   - Priority, Status, Next Action
3. Click "Add Customer"

**For Partners:**
1. Click "+ Add Partner"
2. Fill in:
   - Company name (required)
   - Website, Industry, Description
   - Opportunity (what the partnership is about)
   - Partner Type (what kind of partnership)
   - Priority, Status, Next Action
3. Click "Add Partner"

### 3. **View Deal Flow Information**

Click the **"View"** button on any account card to see full details:

- **Deal Stage Badge**: Color-coded badge showing current stage
  - 🟢 Green = Investment Stage (investors)
  - 🔵 Blue = Deal Stage (customers)
  - 🟣 Purple = Partner Type (partners)

- **Additional Info Section**:
  - Clickable website link
  - Industry classification
  - Full description

### 4. **Edit and Update Stages**

1. Click **"View"** on an account
2. Click **"Edit"** in the Account Info section
3. Update any fields including:
   - Website, Industry, Description
   - Stage information (investment/deal/partner type)
   - Deal values and sizes
4. Click **"Save Changes"**

### 5. **Filter and Sort by Deal Flow**

Use the **Advanced Filters** panel:
- Filter by industry
- Sort by deal value
- Search by company name or description
- Filter by priority and status

## 💡 Product/Service Management

### How to Track Products/Services

Use **Customers** with Deal Stages to manage product sales:

**Example: Selling SaaS Subscription**
1. Create Customer account: "Acme Corp"
2. Set Deal Value: $50,000 (annual contract)
3. Set Deal Stage: "Proposal"
4. Add Description: "Enterprise plan - 100 seats, premium support"
5. Add Contacts: Decision makers
6. Add Tasks: "Send pricing proposal", "Schedule demo"
7. Move through stages as deal progresses:
   - Lead → Qualified → Proposal → Negotiation → Closed Won

**Example: Tracking Multiple Products**
- Create separate Customer entries for different product lines
- Use Description field to specify product details
- Track each product's revenue separately via Deal Value
- Use Status field to indicate product tier (Basic, Pro, Enterprise)

### Service Packages

**Consulting Services:**
1. Customer name: Client company
2. Deal Value: Project value
3. Description: "Q4 consulting - digital transformation, 3 months"
4. Deal Stage: Track from proposal to delivery
5. Tasks: Link project milestones

**Recurring Services:**
1. Deal Value: Monthly/Annual recurring revenue
2. Status: "Active Subscription" or "Renewal Pending"
3. Next Action: "Renewal call scheduled for..."
4. Notes: Service level details, usage metrics

## 📈 Analytics Dashboard

The **Account Management** tab shows 6 key metrics:

1. **Total Accounts**: All companies tracked
2. **High Priority**: Accounts needing immediate attention
3. **Overdue**: Accounts with past-due next actions
4. **Total Value**: Sum of all deal values (customers) or check sizes (investors)
5. **Accounts with Contacts**: Companies with contact information
6. **Avg Contacts**: Average number of contacts per account

## 🎨 Visual Indicators

**Priority Badges:**
- 🔴 High = Red background
- 🟡 Medium = Yellow background
- 🟢 Low = Green background

**Stage Badges:**
- 🟢 Investment Stage = Green box (investors)
- 🔵 Deal Stage = Blue box (customers)
- 🟣 Partner Type = Purple box (partners)

**Status:**
- Shows current relationship status
- Examples: "Active", "Prospect", "Under Review"

## 🔄 Workflow Examples

### Investment Funnel
1. Add investor as "Lead" priority, Investment Stage: "Seed"
2. Add contacts: Partners, Associates
3. Schedule tasks: "Send pitch deck", "Request intro call"
4. Add notes after each interaction
5. Update stage as discussions progress
6. Mark "Closed Won" when investment secured

### Sales Pipeline
1. New lead comes in → Create Customer, Stage: "Lead"
2. Qualification call → Update to "Qualified"
3. Send proposal → Update to "Proposal", add task "Follow up in 3 days"
4. Contract negotiation → Update to "Negotiation"
5. Deal signed → Update to "Closed Won", update Deal Value
6. Lost deal → Update to "Closed Lost", add notes on why

### Partnership Development
1. Identify potential partner → Create Partner, Type: "Technology"
2. Define opportunity → Set Opportunity field with details
3. Initial outreach → Add contact, schedule introduction
4. Partnership discussion → Add notes and meeting summaries
5. Agreement reached → Update Status to "Active Partnership"
6. Track ongoing collaboration → Regular next actions and updates

## 🛠️ Best Practices

### Data Entry
- ✅ Always fill Website and Industry for better organization
- ✅ Write clear Descriptions explaining the relationship
- ✅ Set realistic Deal Values based on contract size
- ✅ Keep Deal Stage current as situations change
- ✅ Add multiple contacts per account for complete picture

### Pipeline Management
- 📊 Review overdue next actions daily
- 📊 Update deal stages weekly
- 📊 Add notes after every significant interaction
- 📊 Assign accounts to team members for ownership
- 📊 Use priority to focus on high-value opportunities

### Reporting
- Export to CSV for external analysis
- Use filters to create segment reports (e.g., "All Seed stage investors")
- Track Total Value metric to monitor pipeline health
- Sort by Last Contact to identify neglected relationships

## 🚨 Troubleshooting

**Q: I don't see the new fields?**
- A: Make sure you ran the database migration (Step 1 above)
- Check browser console for errors
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**Q: Fields aren't saving?**
- A: Check that the database migration was applied successfully
- Verify you're connected to the correct Supabase project
- Check browser console for error messages

**Q: Can't see deal stage badges?**
- A: Make sure you filled in the stage fields when creating/editing
- Click "View" on an account to see the detail view
- Badges only appear if stage field has a value

**Q: How do I track multiple products to same customer?**
- A: Create one Customer account and use:
  - Description field to list all products
  - Tasks to track individual product deliverables
  - Notes to document product-specific details
  - Multiple contacts for different stakeholders

## 🎓 Next Steps

1. ✅ Apply the database migration
2. ✅ Create a test account with all fields filled
3. ✅ Practice moving deals through stages
4. ✅ Set up your team's workflow
5. ✅ Import existing accounts
6. ✅ Train team members on the system

---

**Need Help?** Check the browser console (F12) for detailed error messages if something isn't working.
