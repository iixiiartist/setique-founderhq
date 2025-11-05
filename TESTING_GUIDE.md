# Testing Guide: Financial Privacy & Marketing Collaboration

This guide walks through testing the new collaboration features: financial data privacy and marketing campaign assignments.

## Prerequisites

✅ **Before Testing:**
1. Apply marketing_items database migration (see DATABASE_MIGRATION_INSTRUCTIONS.md)
2. Ensure you have at least 2 workspace members:
   - Owner (e.g., Joe Allen)
   - Member (e.g., II XII)
3. Dev server running: `npm run dev`

## Test Suite 1: Financial Data Privacy

### Objective
Verify that owners see all financial data while members only see their own.

### Test 1.1: Member Creates Financial Data

**As Member (II XII):**

1. Log in as workspace member
2. Navigate to **Financials** tab
3. **Log Financial Entry:**
   - Date: Today
   - MRR: $5,000
   - GMV: $25,000
   - Signups: 50
   - Click **Log Financials**
4. **Create Expense:**
   - Date: Today
   - Category: Marketing
   - Amount: $200
   - Description: "Marketing Tools Subscription"
   - Click **Add Expense**

**Expected Results:**
- ✅ Both items appear in the list
- ✅ Chart updates with new data point
- ✅ Total expenses shows $200

### Test 1.2: Owner Creates Financial Data

**As Owner (Joe Allen):**

1. Log in as workspace owner
2. Navigate to **Financials** tab
3. **Log Financial Entry:**
   - Date: Today
   - MRR: $10,000
   - GMV: $50,000
   - Signups: 100
   - Click **Log Financials**
4. **Create Expense:**
   - Date: Today
   - Category: Infrastructure
   - Amount: $500
   - Description: "AWS Hosting"
   - Click **Add Expense**

**Expected Results:**
- ✅ All 4 items visible (2 from member + 2 from owner)
- ✅ Chart shows both data points
- ✅ Total expenses shows $700 ($200 + $500)

### Test 1.3: Member View Restriction

**As Member (II XII):**

1. Refresh the page or navigate away and back to **Financials** tab
2. Check the financial logs list
3. Check the expenses list

**Expected Results:**
- ✅ Only see OWN financial log (MRR $5k, GMV $25k, Signups 50)
- ✅ Only see OWN expense ($200 Marketing Tools)
- ❌ Cannot see owner's financial log (MRR $10k)
- ❌ Cannot see owner's expense ($500 AWS)
- ✅ Chart only shows member's data point

### Test 1.4: Owner View All Data

**As Owner (Joe Allen):**

1. Refresh the page or navigate away and back to **Financials** tab
2. Check the financial logs list
3. Check the expenses list

**Expected Results:**
- ✅ See ALL financial logs (both member's and owner's)
- ✅ See ALL expenses (both member's and owner's)
- ✅ Chart shows both data points
- ✅ Total expenses shows $700

### Test 1.5: User Attribution Display

**As Owner (Joe Allen):**

1. Hover over financial log entries
2. Look for user attribution indicators

**Expected Results:**
- ✅ Each entry shows who created it (via userName)
- ✅ Can distinguish between member-created and owner-created entries

## Test Suite 2: Marketing Campaign Collaboration

### Objective
Verify that team members can assign campaigns, filter views, and see assignee information.

### Test 2.1: Create Unassigned Campaign

**As Owner (Joe Allen):**

1. Navigate to **Marketing** tab
2. Click **+ New Campaign**
3. Fill in details:
   - Title: "Q4 Product Launch"
   - Type: Social Campaign
   - Status: Planned
   - Due Date: Next month
4. Click **Create**

**Expected Results:**
- ✅ Campaign appears in list
- ✅ No assignee shown on card
- ❌ No "→ [Name]" displayed

### Test 2.2: Assign Campaign to Team Member

**As Owner (Joe Allen):**

1. Click **Edit** on "Q4 Product Launch" campaign
2. In the modal header, look for **AssignmentDropdown**
3. Click dropdown, select **II XII**
4. Close modal

**Expected Results:**
- ✅ AssignmentDropdown appears in modal header
- ✅ Campaign card now shows "→ II XII"
- ✅ Assignment saved (visible after refresh)

### Test 2.3: Filter "My Campaigns" as Member

**As Member (II XII):**

1. Navigate to **Marketing** tab
2. Click filter dropdown next to "Content Calendar"
3. Select **My Campaigns**

**Expected Results:**
- ✅ "Q4 Product Launch" appears (assigned to II XII)
- ❌ Other campaigns don't appear (not assigned to II XII)
- ✅ Filter updates list in real-time

### Test 2.4: Filter "Unassigned" Campaigns

**As Owner (Joe Allen):**

1. Create another campaign: "Newsletter #12" (don't assign)
2. Click filter dropdown
3. Select **Unassigned**

**Expected Results:**
- ✅ "Newsletter #12" appears
- ❌ "Q4 Product Launch" doesn't appear (assigned to II XII)
- ✅ Only unassigned campaigns visible

### Test 2.5: Reassign Campaign

**As Member (II XII):**

1. Open "Q4 Product Launch" campaign (assigned to them)
2. Click **AssignmentDropdown**
3. Select **Joe Allen**
4. Close modal

**Expected Results:**
- ✅ Campaign card now shows "→ Joe Allen"
- ✅ When filtering "My Campaigns", it no longer appears
- ✅ Assignment change persists after refresh

### Test 2.6: Unassign Campaign

**As Owner (Joe Allen):**

1. Open "Q4 Product Launch" campaign
2. Click **AssignmentDropdown**
3. Select **-- Unassigned --**
4. Close modal

**Expected Results:**
- ✅ Campaign card shows no assignee
- ✅ Appears in "Unassigned" filter
- ❌ Doesn't appear in any member's "My Campaigns"

### Test 2.7: All Campaigns View

**As Any User:**

1. Click filter dropdown
2. Select **All Campaigns**

**Expected Results:**
- ✅ All campaigns visible (assigned and unassigned)
- ✅ Assignee names displayed on assigned campaigns
- ✅ Default view when page loads

## Test Suite 3: Activity Log Integration

### Objective
Verify that collaboration actions are logged in the activity feed.

### Test 3.1: Financial Activity Logging

**As Member (II XII):**

1. Create expense: "Office Supplies" $50
2. Navigate to **Dashboard** tab
3. Check **Recent Activity** section

**Expected Results:**
- ✅ Activity shows: "II XII created expense: Office Supplies ($50)"
- ✅ Timestamp is accurate
- ✅ Activity type is "expense-created"

### Test 3.2: Marketing Assignment Logging

**As Owner (Joe Allen):**

1. Assign "Q4 Product Launch" to II XII
2. Navigate to **Dashboard** tab
3. Check **Recent Activity** section

**Expected Results:**
- ✅ Activity shows: "Joe Allen assigned Q4 Product Launch to II XII"
- ✅ Timestamp is accurate
- ✅ Activity type is "marketing-assigned"

## Test Suite 4: Edge Cases & Error Handling

### Test 4.1: Empty States

**As New Workspace Member:**

1. Navigate to **Financials** tab (no data created yet)

**Expected Results:**
- ✅ Empty state message displayed
- ✅ No errors in console
- ✅ Can create first financial entry

### Test 4.2: Single-Member Workspace

**As Owner (Solo Workspace):**

1. Navigate to **Marketing** tab
2. Check for collaboration UI

**Expected Results:**
- ❌ AssignmentDropdown should NOT appear
- ❌ Filter dropdown should NOT appear
- ✅ Can still create and manage campaigns normally

### Test 4.3: Deleted User Assignment

**Setup:** Assign campaign to user, then remove user from workspace

**Expected Results:**
- ✅ Campaign still shows assignedToName (display doesn't break)
- ✅ Can reassign to active user
- ⚠️ assignedTo UUID may be stale (acceptable - shows name)

## Test Suite 5: Performance & Data Integrity

### Test 5.1: Large Dataset Filtering

**Setup:** Create 50+ financial entries split between owner and member

**As Member:**
1. Navigate to **Financials** tab
2. Observe load time

**Expected Results:**
- ✅ Filtering happens instantly (useMemo optimization)
- ✅ Only member's entries visible
- ✅ Chart renders correctly with filtered data

### Test 5.2: Concurrent Assignment Changes

**Setup:** Two users edit same campaign simultaneously

**User 1:** Assign to "John"  
**User 2:** Assign to "Jane"

**Expected Results:**
- ✅ Last write wins (standard Supabase behavior)
- ✅ No data corruption
- ✅ Activity log shows both assignments

### Test 5.3: Data Persistence After Refresh

**Setup:** Create financial entry and assign marketing campaign

1. Refresh browser
2. Check data

**Expected Results:**
- ✅ Financial entry still visible (with correct user attribution)
- ✅ Marketing assignment persists
- ✅ Filters remember state (or reset to "All")

## Regression Testing

### Test R.1: Existing Features Still Work

**Calendar Tab:**
- ✅ Meeting assignees display correctly
- ✅ Can assign meetings to team members

**CRM Tab:**
- ✅ Account assignments work
- ✅ "My Accounts" filter functions

**Dashboard Tab:**
- ✅ Activity feed shows all types
- ✅ XP calculations correct

**Settings Tab:**
- ✅ Workspace member management works
- ✅ Can invite/remove members

### Test R.2: Input Consistency

**All Tabs:**
- ✅ No uncontrolled input warnings in console
- ✅ All form fields have proper `value={field || ''}` pattern
- ✅ No "changing uncontrolled to controlled" errors

## Test Results Template

Copy this template to document your test results:

```markdown
# Test Results - [Date]

## Tester: [Your Name]
## Role: [Owner/Member]

### Financial Privacy Tests
- [ ] Test 1.1: Member Creates Financial Data
- [ ] Test 1.2: Owner Creates Financial Data
- [ ] Test 1.3: Member View Restriction
- [ ] Test 1.4: Owner View All Data
- [ ] Test 1.5: User Attribution Display

**Issues Found:** None / [Description]

### Marketing Collaboration Tests
- [ ] Test 2.1: Create Unassigned Campaign
- [ ] Test 2.2: Assign Campaign to Team Member
- [ ] Test 2.3: Filter "My Campaigns" as Member
- [ ] Test 2.4: Filter "Unassigned" Campaigns
- [ ] Test 2.5: Reassign Campaign
- [ ] Test 2.6: Unassign Campaign
- [ ] Test 2.7: All Campaigns View

**Issues Found:** None / [Description]

### Overall Assessment
- **Financial Privacy:** ✅ Pass / ❌ Fail
- **Marketing Collaboration:** ✅ Pass / ❌ Fail
- **Ready for Production:** Yes / No

**Additional Notes:** [Any observations or recommendations]
```

## Troubleshooting

### Issue: Financial data not filtering correctly

**Check:**
1. Open browser console for errors
2. Verify `useAuth` and `useWorkspace` hooks return correct data
3. Check `workspace?.role` value
4. Verify userId matches between user and financial items

**Fix:**
```typescript
// In FinancialsTab.tsx, add console logs:
console.log('User:', user?.id);
console.log('Role:', workspace?.role);
console.log('Is Owner:', isOwner);
console.log('Visible Financials:', visibleFinancials);
```

### Issue: Marketing assignments not saving

**Check:**
1. Database migration applied? (see DATABASE_MIGRATION_INSTRUCTIONS.md)
2. Check Supabase logs for errors
3. Verify `assigned_to` and `assigned_to_name` columns exist

**Fix:**
```sql
-- In Supabase SQL Editor:
SELECT * FROM marketing_items WHERE id = '[campaign-id]';
-- Should show assigned_to and assigned_to_name values
```

### Issue: AssignmentDropdown not appearing

**Check:**
1. Workspace has members? `workspaceMembers.length > 0`
2. Check console for component errors
3. Verify `useWorkspace` hook returns members

**Fix:**
```typescript
// In MarketingTab.tsx, add console log:
console.log('Workspace Members:', workspaceMembers);
// Should show array with at least 1 member
```

---

**Last Updated:** [Date]  
**Test Coverage:** Financial Privacy (100%), Marketing Collaboration (100%)  
**Status:** Ready for testing after database migration applied
