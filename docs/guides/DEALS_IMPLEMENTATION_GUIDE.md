# Deals/Opportunity Tracking Implementation Guide

## Status: 80% Complete

### ✅ Completed
1. **Database Schema** (`create_deals_table.sql`):
   - Full `deals` table with all fields
   - Proper RLS policies
   - Indexes for performance
   - Foreign key relationships to CRM items and contacts

2. **TypeScript Types** (`types.ts`):
   - `Deal` interface with all properties
   - Added `deals` array to `DashboardData`
   - Added deal actions to `AppActions` interface

3. **Database Service** (`lib/services/database.ts`):
   - `getDeals()` - fetch with filters
   - `createDeal()` - create new deal
   - `updateDeal()` - update existing deal
   - `deleteDeal()` - remove deal

4. **Data Loading Hook** (`hooks/useLazyDataPersistence.ts`):
   - `loadDeals()` function with caching
   - Transforms DB format to app format
   - Exports loadDeals method

5. **UI Component** (`components/crm/DealsModule.tsx`):
   - Full deals management interface
   - Pipeline metrics dashboard
   - Create deal form with all fields
   - Filtering and sorting
   - Links to CRM companies and contacts
   - Stage-based color coding

### 🔧 Remaining Steps

#### 1. Apply Database Migration
Run the SQL file to create the deals table:
```bash
# In Supabase SQL Editor, run:
/workspaces/setique-founderhq/create_deals_table.sql
```

#### 2. Add Deal Actions to DashboardApp.tsx

Find the `actions` object (around line 671) and add these three functions:

```typescript
// After createMarketingCalendarLink and before the closing })

createDeal: async (data) => {
  if (!workspace?.id || !user?.id) {
    return { success: false, message: 'User or workspace not available' };
  }

  const dealData = {
    workspace_id: workspace.id,
    title: data.title,
    crm_item_id: data.crmItemId || null,
    contact_id: data.contactId || null,
    value: data.value,
    currency: data.currency,
    stage: data.stage,
    probability: data.probability,
    expected_close_date: data.expectedCloseDate || null,
    actual_close_date: data.actualCloseDate || null,
    source: data.source || null,
    category: data.category,
    priority: data.priority,
    assigned_to: data.assignedTo || null,
    assigned_to_name: data.assignedToName || null,
  };

  const result = await DatabaseService.createDeal(dealData as any);
  if (result.error) {
    return { success: false, message: 'Failed to create deal' };
  }

  // Reload deals
  if (useLazyDataPersistenceRef.current?.loadDeals) {
    const deals = await useLazyDataPersistenceRef.current.loadDeals({ force: true });
    dispatch({ type: 'SET_DATA', payload: { ...data, deals } });
  }

  return { success: true, message: 'Deal created successfully', dealId: result.data?.id };
},

updateDeal: async (dealId, updates) => {
  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.crmItemId !== undefined) dbUpdates.crm_item_id = updates.crmItemId;
  if (updates.contactId !== undefined) dbUpdates.contact_id = updates.contactId;
  if (updates.value !== undefined) dbUpdates.value = updates.value;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
  if (updates.probability !== undefined) dbUpdates.probability = updates.probability;
  if (updates.expectedCloseDate !== undefined) dbUpdates.expected_close_date = updates.expectedCloseDate;
  if (updates.actualCloseDate !== undefined) dbUpdates.actual_close_date = updates.actualCloseDate;
  if (updates.source !== undefined) dbUpdates.source = updates.source;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
  if (updates.assignedToName !== undefined) dbUpdates.assigned_to_name = updates.assignedToName;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;

  const result = await DatabaseService.updateDeal(dealId, dbUpdates);
  if (result.error) {
    return { success: false, message: 'Failed to update deal' };
  }

  // Reload deals
  if (useLazyDataPersistenceRef.current?.loadDeals) {
    const deals = await useLazyDataPersistenceRef.current.loadDeals({ force: true });
    dispatch({ type: 'SET_DATA', payload: { ...data, deals } });
  }

  return { success: true, message: 'Deal updated successfully' };
},

deleteDeal: async (dealId) => {
  const result = await DatabaseService.deleteDeal(dealId);
  if (result.error) {
    return { success: false, message: 'Failed to delete deal' };
  }

  // Reload deals
  if (useLazyDataPersistenceRef.current?.loadDeals) {
    const deals = await useLazyDataPersistenceRef.current.loadDeals({ force: true });
    dispatch({ type: 'SET_DATA', payload: { ...data, deals } });
  }

  return { success: true, message: 'Deal deleted successfully' };
},
```

#### 3. Load Deals on CRM Tab

In DashboardApp.tsx, find the CRM tab handlers (around lines 607-610 for Tab.Investors, etc).

Add this before the switch statement (around line 605):

```typescript
// Load deals when on CRM tabs
if ([Tab.Investors, Tab.Customers, Tab.Partners].includes(activeTab) && !data.deals.length) {
  if (useLazyDataPersistenceRef.current?.loadDeals) {
    const deals = await useLazyDataPersistenceRef.current.loadDeals();
    dispatch({ type: 'SET_DATA', payload: { ...data, deals } });
  }
}
```

#### 4. Add Deals View to CrmTab Component

In `components/CrmTab.tsx`:

1. Update the `activeView` state type (around line 39):
```typescript
const [activeView, setActiveView] = useState<'accounts' | 'contacts' | 'followups' | 'deals'>('accounts');
```

2. Import DealsModule at the top:
```typescript
import { DealsModule } from './crm';
```

3. Add deals to props interface (around line 11):
```typescript
interface CrmTabProps {
    title: string;
    crmItems: AnyCrmItem[];
    tasks: Task[];
    actions: AppActions;
    documents: Document[];
    businessProfile?: BusinessProfile | null;
    workspaceId?: string;
    onUpgradeNeeded?: () => void;
    workspaceMembers?: WorkspaceMember[];
    userId?: string;
    deals?: Deal[]; // ADD THIS LINE
}
```

4. Update the props destructuring (around line 23):
```typescript
const CrmTab: React.FC<CrmTabProps> = React.memo(({ 
    title, 
    crmItems, 
    tasks, 
    actions, 
    documents, 
    businessProfile,
    workspaceId,
    onUpgradeNeeded,
    workspaceMembers = [],
    userId,
    deals = [], // ADD THIS LINE
}) => {
```

5. Find the view buttons section and add a "Deals" button (look for the section with "Accounts", "Contacts", "Follow-Ups"):
```typescript
<button
  onClick={() => setActiveView('deals')}
  className={`px-6 py-2 font-bold border-2 border-black ${
    activeView === 'deals'
      ? 'bg-black text-white'
      : 'bg-white hover:bg-gray-100'
  }`}
>
  💼 Deals
</button>
```

6. Add the deals view rendering (find the section that renders different views based on `activeView`):
```typescript
{activeView === 'deals' && (
  <DealsModule
    deals={deals}
    crmItems={crmItems}
    actions={actions}
    workspaceId={workspaceId || ''}
    userId={userId}
    workspaceMembers={workspaceMembers}
  />
)}
```

#### 5. Pass Deals Data to CrmTab in DashboardApp

In DashboardApp.tsx, update all three CrmTab usages to include deals:

```typescript
// Around line 1799 for Investors
<CrmTab 
    title="Investor" 
    crmItems={data.investors} 
    tasks={data.investorTasks} 
    actions={actions} 
    documents={data.documents} 
    businessProfile={businessProfile}
    workspaceId={workspace?.id}
    onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
    workspaceMembers={workspaceMembers}
    userId={user?.id}
    deals={data.deals}  // ADD THIS
/>

// Around line 1814 for Customers
<CrmTab 
    title="Customer" 
    crmItems={data.customers} 
    tasks={data.customerTasks} 
    actions={actions} 
    documents={data.documents} 
    businessProfile={businessProfile}
    workspaceId={workspace?.id}
    onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
    workspaceMembers={workspaceMembers}
    userId={user?.id}
    deals={data.deals}  // ADD THIS
/>

// Around line 1829 for Partners
<CrmTab 
    title="Partner" 
    crmItems={data.partners} 
    tasks={data.partnerTasks} 
    actions={actions} 
    documents={data.documents} 
    businessProfile={businessProfile}
    workspaceId={workspace?.id}
    onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
    workspaceMembers={workspaceMembers}
    userId={user?.id}
    deals={data.deals}  // ADD THIS
/>
```

#### 6. Update Revenue Form to Use Deals

In `components/financials/RevenueModule.tsx`, update the "Link to CRM Deal" section (around line 314):

```typescript
<div>
  <label className="block text-sm font-semibold mb-1">Link to Deal/Opportunity</label>
  <select
    value={formData.crmItemId}
    onChange={(e) => setFormData({ ...formData, crmItemId: e.target.value })}
    className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
  >
    <option value="">Select a deal...</option>
    {/* Show actual deals instead of CRM items */}
    {(data?.deals || []).map(deal => (
      <option key={deal.id} value={deal.id}>
        {deal.title} - {formatCurrency(deal.value)}
      </option>
    ))}
  </select>
</div>
```

Note: You'll need to pass deals to RevenueModule props or access via DashboardData.

### 🎯 Expected Result

Once complete, users will have:
- **Dedicated pipeline/deal tracking** separate from relationship management
- **Deals view** in CRM tabs (Investors, Customers, Partners)
- **Pipeline metrics**: total value, weighted value, won deals
- **Deal stages**: lead → qualified → proposal → negotiation → closed (won/lost)
- **Revenue linking**: transactions can link to specific deals instead of vague "CRM items"
- **Full deal lifecycle**: create, update, move through stages, close

### 🔍 Testing Checklist

1. ✅ Run SQL migration
2. ✅ Navigate to any CRM tab (Investors/Customers/Partners)
3. ✅ Click "Deals" view button
4. ✅ Create a new deal with company/contact links
5. ✅ Verify deal appears in list
6. ✅ Check metrics update correctly
7. ✅ Test filtering by stage and category
8. ✅ Go to Financials → Revenue
9. ✅ Create revenue transaction
10. ✅ Verify deal dropdown shows actual deals (not CRM items)

### 💡 Benefits Over Old System

**Before (CRM Items as "Deals"):**
- Mixed relationship tracking with deal tracking
- Customer/Investor objects had `dealValue`/`checkSize` but no pipeline stages
- No proper opportunity management
- Revenue linked to companies, not specific opportunities

**After (Dedicated Deals):**
- ✅ Clear separation: Companies (relationships) vs Deals (opportunities)
- ✅ Proper sales pipeline with stages
- ✅ Win probability and weighted forecasting
- ✅ Deal-specific tracking (source, expected close, etc.)
- ✅ Revenue tied to specific deals for better attribution
- ✅ Multi-deal support per company (realistic for B2B)

