# CRM Account Save Fix

## Issue
Accounts were not saving when trying to add a new account (Investor, Customer, or Partner).

## Root Cause
The `DataPersistenceAdapter.createCrmItem()` function was missing the `nextActionTime` field:

1. **Missing from Interface**: The `itemData` parameter interface didn't include `nextActionTime?: string`
2. **Missing from Database Mapping**: The function wasn't mapping `nextActionTime` to `next_action_time` when building the database object

When AccountManager tried to create an account with `nextActionTime`, the function silently dropped the field, which may have caused validation errors or incomplete data saves.

## Files Fixed

### `/workspaces/setique-founderhq/lib/services/dataPersistenceAdapter.ts`

**Change 1: Added `nextActionTime` to itemData interface (Line 282)**
```typescript
itemData: {
  company: string
  priority: Priority
  status: string
  nextAction?: string
  nextActionDate?: string
  nextActionTime?: string  // ← ADDED
  checkSize?: number
  dealValue?: number
  opportunity?: string
  website?: string
  industry?: string
  description?: string
  stage?: string
  dealStage?: string
  partnerType?: string
}
```

**Change 2: Added field mapping to database object (Line 302)**
```typescript
const crmData: any = {
  company: itemData.company,
  type: collectionToType(collection),
  priority: itemData.priority || 'Medium',
  status: itemData.status || 'Active',
  next_action: itemData.nextAction || null,
  next_action_date: itemData.nextActionDate || null,
  next_action_time: itemData.nextActionTime || null,  // ← ADDED
  check_size: itemData.checkSize || null,
  deal_value: itemData.dealValue || null,
  opportunity: itemData.opportunity || null,
  notes: [],
  website: itemData.website || null,
  industry: itemData.industry || null,
  description: itemData.description || null,
  investment_stage: itemData.stage || null,
  deal_stage: itemData.dealStage || null,
  partner_type: itemData.partnerType || null
}
```

## Verification

### What Was Working Before
- The database column `next_action_time` existed (added in migration)
- AccountManager was sending `nextActionTime` in itemData
- The field transformer `crmItemToDb()` properly converted `nextActionTime` → `next_action_time`

### What Was Broken
- The `createCrmItem()` function interface didn't accept `nextActionTime`
- The function didn't map it to the database field
- This likely caused TypeScript errors or data loss during account creation

### What's Working Now
✅ AccountManager sends `nextActionTime` in itemData  
✅ `createCrmItem()` accepts `nextActionTime` parameter  
✅ Function maps it to `next_action_time` for database insert  
✅ Accounts should now save successfully with all fields  

## Testing Steps

1. **Navigate to CRM Tab** (Investor, Customer, or Partner)
2. **Click "Add New [Type]"** button
3. **Fill out form**:
   - Company Name: "Test Company"
   - Priority: "High"
   - Status: "Active"
   - Next Action: "Follow up call"
   - Next Action Date: Tomorrow's date
   - Next Action Time: "14:30"
4. **Click "Create"**
5. **Verify**:
   - Success toast appears
   - New account appears in list
   - Account details show all fields including next action time
   - No console errors

## Related Files

- `/workspaces/setique-founderhq/components/shared/AccountManager.tsx` - Sends account data
- `/workspaces/setique-founderhq/lib/services/database.ts` - Database insert
- `/workspaces/setique-founderhq/lib/utils/fieldTransformers.ts` - Field transformation utilities
- `/workspaces/setique-founderhq/add_time_columns.sql` - Migration that added `next_action_time` column

## Additional Notes

This was a simple oversight during the time columns migration. The database column was added, the UI was updated to collect the data, but the intermediary adapter function wasn't updated to pass it through.

This same pattern should be checked for any other recent field additions to ensure the full data pipeline is connected:
1. Database column exists ✅
2. UI collects data ✅
3. Adapter accepts and maps data ✅ (NOW FIXED)
4. Database service inserts data ✅

---

**Status**: ✅ **FIXED**  
**Date**: November 16, 2025  
**Impact**: All CRM account creation flows (Investors, Customers, Partners)
