# Marketing Campaign - Quick Usage Guide

## ✅ All Your Questions Answered

### 1. **Where do I add campaign information as it progresses?**

**Answer**: Click "Edit" on any campaign card to update metrics as your campaign runs.

**What You Can Track**:

#### Financial Metrics (Budget & Revenue Section)
- **Budget ($)** - Total campaign budget
- **Actual Spend ($)** - Update this as you spend money on the campaign
- **Revenue Target ($)** - Your revenue goal for the campaign

#### Performance Metrics (Campaign Performance Tracking Section) ⭐ NEW
- **Impressions** - Total views/impressions your campaign received
- **Clicks** - Total clicks on your campaign
- **Engagements** - Likes, shares, comments, interactions
- **Conversions** - Completed actions (form fills, signups, purchases)

**How to Update**:
1. Navigate to **Marketing Tab**
2. Find your campaign in the list
3. Click **"Edit"** button
4. Scroll to **"Campaign Performance Tracking"** section
5. Enter your latest numbers (Impressions, Clicks, Engagements, Conversions)
6. Update **"Actual Spend"** in the Budget section
7. Click **"Save"**

**Metrics Will Display**:
- On the campaign card (shows after you enter them)
- In the **Campaign Analytics** tab (aggregate view)
- Calculated metrics like CTR (Click-Through Rate) and ROI automatically

---

### 2. **Where is the Assignee option for team members?**

**Answer**: It's in the form! ✅

**Location**: 
- When creating/editing a campaign
- **Basic Information** section
- Third field in the row (after Type and Status)
- Dropdown labeled **"Assigned To"**

**Options**:
- "Unassigned" (default)
- All workspace members listed with their name or email

**Note**: If you don't see team members:
- Make sure you've invited team members to your workspace (Settings → Team)
- The dropdown will only show confirmed workspace members

---

### 3. **Where do I link Accounts or Deals/Opportunities?**

**Answer**: Two ways to track attribution:

#### Method 1: Automatic Attribution (Recommended) ✅
**How it Works**:
1. Create your campaign (e.g., "Q4 2025 LinkedIn Campaign")
2. When adding contacts in CRM, set their **"Source"** field to match the exact campaign name
3. When those contacts convert to deals, revenue automatically attributes to the campaign
4. View results in **Attribution** tab

**Why This Method**:
- ✅ No manual linking required
- ✅ Automatic ROI calculation
- ✅ Works immediately
- ✅ Tracks full customer journey

**Example**:
```
Campaign Name: "Q4 2025 LinkedIn Campaign"
Contact Source: "Q4 2025 LinkedIn Campaign" (must match exactly)
Contact converts to deal → Revenue automatically attributed
```

#### Method 2: Manual Account/Deal Linking (In Development) 🚧
**Status**: UI added but functionality coming in next update

**What You'll See**:
- In the campaign form, there's a **"Linked Accounts & Deals"** section
- Shows all your CRM accounts (Investors, Customers, Partners)
- Checkboxes to select accounts
- Currently displays info message: "Manual linking feature coming in next update"

**What Account Types You Can Link**:
- **Investor Accounts** - From Investor CRM tab
- **Customer Accounts** - From Customer CRM tab  
- **Partner Accounts** - From Partnerships tab

**When Available**: Next sprint update

---

## 📊 Understanding the Analytics Display

The metrics you see in **Campaign Analytics** tab come from:

### Data Sources
1. **KPIs You Enter** - Impressions, Clicks, Engagements, Conversions (manual entry)
2. **Budget Data** - Budget allocated, Actual Spend (manual entry)
3. **Revenue Data** - From attributed deals (automatic via contact source)
4. **Contact Data** - Leads generated (contacts with matching source)

### Calculated Metrics
- **CTR (Click-Through Rate)** = (Clicks / Impressions) × 100
- **Conversion Rate** = (Conversions / Leads) × 100  
- **CPL (Cost Per Lead)** = Actual Spend / Leads
- **ROI** = ((Revenue - Actual Spend) / Actual Spend) × 100
- **Budget Utilization** = (Actual Spend / Budget) × 100

### Why Metrics Show $0 or 0%
- **No data entered yet** - Go edit the campaign and add impressions, clicks, etc.
- **No attributed contacts** - Make sure contact "Source" matches campaign name exactly
- **No closed deals** - Revenue only counts from deals marked as "closed_won"

---

## 🎯 Complete Campaign Tracking Workflow

### Step 1: Create Campaign
1. Click **"New Campaign"** in Marketing tab
2. Fill out all sections:
   - Basic Information (Title, Type, Status, **Assigned To**, Launch Date)
   - Campaign Details (Target Audience, Goals, Channels)
   - Budget & Revenue Targets (Budget, Actual Spend, Revenue Goal)
   - Campaign Performance Tracking (Start with 0s, update as you go)
   - Product/Service Linking (if applicable)
   - Tags (for organization)
3. Save campaign

### Step 2: Launch Campaign
1. Run your marketing campaign (ads, content, emails, etc.)
2. Track performance in your ad platforms/tools

### Step 3: Update Metrics Regularly (Weekly Recommended)
1. Edit campaign
2. Update:
   - Impressions (from ad platform)
   - Clicks (from ad platform)
   - Engagements (likes, shares, comments)
   - Conversions (form fills, signups)
   - Actual Spend (total spent so far)
3. Save changes

### Step 4: Track Leads
1. As leads come in, add them to CRM
2. **CRITICAL**: Set "Source" field to exact campaign name
3. System automatically links them to campaign

### Step 5: Close Deals
1. Convert qualified leads to deals
2. Work the deal through your pipeline
3. Mark as "closed_won" when complete
4. Revenue automatically attributes to campaign

### Step 6: View Analytics
1. Switch to **"Campaign Analytics"** view in Marketing tab
2. See all metrics:
   - Total impressions, clicks, conversions
   - Spend vs Revenue
   - ROI percentage
   - Performance by channel
3. Switch to **"Attribution"** view for detailed attribution data

---

## 🔍 Troubleshooting

### "I updated metrics but don't see them on the card"
- **Solution**: The campaign card only shows metrics if they're > 0. Make sure you saved after entering numbers.

### "ROI shows 0% even though I have revenue"
- **Cause**: No closed deals attributed to campaign
- **Solution**: Check that contacts have "Source" field matching campaign name exactly (case-sensitive)

### "I don't see the Assigned To dropdown"
- **Solution**: It's there! Look in Basic Information section, third field after Type and Status

### "Can't link accounts to campaign"
- **Status**: Manual linking UI is visible but not functional yet
- **Workaround**: Use automatic attribution (set contact Source field)
- **ETA**: Next sprint update

### "Campaign doesn't appear after creation"
- **Fixed**: Recent update fixed data transformation issue
- **Solution**: Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

---

## 💡 Pro Tips

### Best Practices
1. **Consistent Naming**: Use exact same campaign name everywhere (form, contact source field)
2. **Regular Updates**: Update metrics weekly for accurate tracking
3. **Use Tags**: Tag campaigns by quarter, channel, or objective for easy filtering
4. **Set Clear Goals**: Enter specific, measurable goals in the Goals field
5. **Budget Tracking**: Update Actual Spend every time you make a payment

### Campaign Name Examples (Good)
- ✅ "Q4 2025 LinkedIn Campaign"
- ✅ "Black Friday Email Promo"
- ✅ "Product Launch Webinar Series"

### Campaign Name Examples (Avoid)
- ❌ "linkedin campaign" (inconsistent case)
- ❌ "Campaign 1" (not descriptive)
- ❌ "Q4 Campaign" (too vague if running multiple)

---

## 📋 Quick Reference

### Where to Find Things

| What You Need | Where to Find It |
|---------------|------------------|
| **Assign team member** | Campaign Form → Basic Information → Assigned To dropdown |
| **Update metrics** | Edit campaign → Campaign Performance Tracking section |
| **Update spend** | Edit campaign → Budget & Revenue Targets → Actual Spend |
| **Link products** | Campaign Form → Promoted Products/Services |
| **Set attribution** | CRM → Add Contact → Set "Source" field to campaign name |
| **View ROI** | Marketing Tab → Campaign Analytics view |
| **See attribution details** | Marketing Tab → Attribution view |
| **Link accounts (manual)** | Coming in next update (UI visible but not functional) |

---

## 🚀 What's Coming Next

### Planned Features
- ✅ **Manual CRM Account/Deal Linking** - Direct selection in campaign form
- ✅ **Multi-touch Attribution** - Track multiple campaign touchpoints
- ✅ **Automated Metric Sync** - Import metrics from ad platforms
- ✅ **Campaign Templates** - Quick-start templates for common campaigns
- ✅ **Budget Alerts** - Notifications when approaching budget limit
- ✅ **Scheduled Reports** - Automated campaign performance emails

---

## Need Help?

1. Check `MARKETING_CAMPAIGN_SYSTEM_GUIDE.md` for technical details
2. Review this guide for usage questions
3. Check browser console for any errors (F12)
4. Verify database migration ran successfully

---

**Last Updated**: November 16, 2025  
**Next Update**: Manual account linking functionality
