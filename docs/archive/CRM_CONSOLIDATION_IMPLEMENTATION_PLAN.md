# CRM Consolidation Implementation Plan

## Executive Summary

**Goal**: Consolidate 3 separate CRM tabs (Investors, Customers, Partners) into a single unified "Accounts" tab with type filtering.

**Benefits**:
- ✅ Single data load instead of 3 separate loads
- ✅ Eliminates stale cache closure issues affecting each CRM type
- ✅ Cross-type filtering and search (find all accounts at once)
- ✅ Better UX - no need to switch tabs to see different account types
- ✅ Easier to maintain - single component instead of 3 duplicates
- ✅ Faster navigation - all accounts in one view
- ✅ Aligns with modern CRM patterns (Salesforce, HubSpot, etc.)

**Status**: Ready for implementation (no breaking database changes needed)

---

## Current Architecture Analysis

### Database Layer ✅ Already Unified
The database **already has a unified structure**:

```sql
-- Single table: crm_items
CREATE TABLE crm_items (
    id UUID PRIMARY KEY,
    workspace_id UUID,
    user_id UUID,
    type TEXT, -- 'investor', 'customer', or 'partner'
    company TEXT,
    priority TEXT,
    status TEXT,
    
    -- Type-specific fields (nullable)
    check_size NUMERIC,        -- investors only
    deal_value NUMERIC,        -- customers only
    opportunity TEXT,          -- partners only
    investment_stage TEXT,     -- investors only
    deal_stage TEXT,           -- customers only
    partner_type TEXT,         -- partners only
    
    -- Common fields
    website TEXT,
    industry TEXT,
    description TEXT,
    next_action TEXT,
    next_action_date DATE,
    next_action_time TIME,
    notes JSONB,
    assigned_to UUID,
    assigned_to_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Key Insight**: The database is **already consolidated**! We just need to update the UI layer.

### Data Loading Layer ✅ Already Fetches All Types Together

```typescript
// hooks/useLazyDataPersistence.ts line 160-210
const loadCrmItems = useCallback(async (options: LoadOptions = {}) => {
  // Fetches ALL CRM types in one query, then splits them
  const crmTypes = ['investor', 'customer', 'partner'] as const
  
  const crmResults = await Promise.all(
    crmTypes.map(async (type) => {
      const { data: crmItems } = await DatabaseService.getCrmItems(workspace.id, { 
        type,
        limit: 1000
      })
      // ...transforms and returns
    })
  )
  
  // Currently returns split by type:
  return {
    investors: [...],
    customers: [...],
    partners: [...]
  }
}, [user, workspace?.id])
```

**Current Behavior**: Loads all CRM data at once, splits into 3 arrays
**Target Behavior**: Load all CRM data at once, return as single array with type property

### DashboardData Interface - Needs Update

```typescript
// types.ts - CURRENT
export interface DashboardData {
    investors: Investor[];
    investorTasks: Task[];
    customers: Customer[];
    customerTasks: Task[];
    partners: Partner[];
    partnerTasks: Task[];
    // ...
}

// types.ts - PROPOSED
export interface DashboardData {
    crmItems: CrmItem[];  // Unified array with type discriminator
    crmTasks: Task[];     // Unified tasks with crmType property
    // ...
}
```

### UI Components - Current Split Architecture

```
DashboardApp.tsx
├── Tab.Investors → <CrmTab title="Investor" crmItems={data.investors} />
├── Tab.Customers → <CrmTab title="Customer" crmItems={data.customers} />
└── Tab.Partners  → <CrmTab title="Partner" crmItems={data.partners} />
```

**Target Architecture**:
```
DashboardApp.tsx
└── Tab.Accounts → <AccountsTab crmItems={data.crmItems} crmTasks={data.crmTasks} />
```

---

## Implementation Phases

### Phase 1: Type System Updates (Non-Breaking)

#### 1.1 Update CRM Type Definitions

```typescript
// types.ts - Add unified CRM item type
export type CrmType = 'investor' | 'customer' | 'partner';

export interface CrmItem extends BaseCrmItem {
    type: CrmType; // Discriminator field
    
    // Type-specific fields (made optional for union)
    checkSize?: number;        // investors
    dealValue?: number;        // customers
    opportunity?: string;      // partners
    investmentStage?: string;  // investors
    dealStage?: string;        // customers
    partnerType?: string;      // partners
}

// Keep existing specific types for backwards compatibility
export interface Investor extends BaseCrmItem {
    type: 'investor';
    checkSize: number;
    investmentStage?: string;
}

export interface Customer extends BaseCrmItem {
    type: 'customer';
    dealValue: number;
    dealStage?: string;
}

export interface Partner extends BaseCrmItem {
    type: 'partner';
    opportunity: string;
    partnerType?: string;
}

// Union type (keep for backwards compat)
export type AnyCrmItem = Investor | Customer | Partner;

// NEW: More flexible unified type
export type AnyAccountItem = CrmItem;
```

#### 1.2 Update Task Type for CRM Context

```typescript
// types.ts
export interface Task {
    // ... existing fields
    category: 'productsServicesTasks' | 'crmTasks' | 'marketingTasks' | 'financialTasks';
    crmType?: 'investor' | 'customer' | 'partner'; // NEW: Which CRM type this task relates to
    crmItemId?: string;
    contactId?: string;
}
```

#### 1.3 Update DashboardData Interface (Gradual Migration)

```typescript
// types.ts - Add new properties alongside old ones
export interface DashboardData {
    // OLD (keep for backwards compatibility during migration)
    investors: Investor[];
    investorTasks: Task[];
    customers: Customer[];
    customerTasks: Task[];
    partners: Partner[];
    partnerTasks: Task[];
    
    // NEW (add these, populate from old arrays initially)
    crmItems: CrmItem[];     // Unified array
    crmTasks: Task[];        // Unified tasks with crmType
    
    // ... rest of interface
}
```

### Phase 2: Data Loading Updates

#### 2.1 Update useLazyDataPersistence Hook

```typescript
// hooks/useLazyDataPersistence.ts
const loadCrmItems = useCallback(async (options: LoadOptions = {}) => {
  // ... cache check logic
  
  const crmTypes = ['investor', 'customer', 'partner'] as const
  
  const crmResults = await Promise.all(
    crmTypes.map(async (type) => {
      const { data: crmItems } = await DatabaseService.getCrmItems(workspace.id, { 
        type,
        limit: 1000
      })
      
      return (crmItems || []).map(item => dbToCrmItem(item, type))
    })
  )
  
  // Flatten all types into single array
  const allCrmItems = crmResults.flat()
  
  // Also return split by type for backwards compatibility
  const investors = allCrmItems.filter(i => i.type === 'investor')
  const customers = allCrmItems.filter(i => i.type === 'customer')
  const partners = allCrmItems.filter(i => i.type === 'partner')
  
  return {
    // NEW unified format
    crmItems: allCrmItems,
    
    // OLD format (keep for backwards compat)
    investors,
    customers,
    partners
  }
}, [user, workspace?.id])

const loadTasks = useCallback(async (options: LoadOptions = {}) => {
  // ... existing task loading logic
  
  // Group CRM tasks by type
  const investorTasks = tasks.filter(t => t.category === 'investorTasks')
  const customerTasks = tasks.filter(t => t.category === 'customerTasks')
  const partnerTasks = tasks.filter(t => t.category === 'partnerTasks')
  
  // Create unified CRM tasks array with type annotations
  const crmTasks = [
    ...investorTasks.map(t => ({ ...t, crmType: 'investor' as const, category: 'crmTasks' as const })),
    ...customerTasks.map(t => ({ ...t, crmType: 'customer' as const, category: 'crmTasks' as const })),
    ...partnerTasks.map(t => ({ ...t, crmType: 'partner' as const, category: 'crmTasks' as const }))
  ]
  
  return {
    // NEW unified format
    crmTasks,
    
    // OLD format (keep for backwards compat)
    investorTasks,
    customerTasks,
    partnerTasks,
    // ...
  }
}, [user, workspace?.id])
```

#### 2.2 Update DashboardApp Data Loading

```typescript
// DashboardApp.tsx
useEffect(() => {
    if (activeTab === Tab.Accounts && !loadedTabsRef.current.has('accounts')) {
        loadCrmItems().then(crm => {
            setData(prev => ({ 
                ...prev, 
                // Populate BOTH old and new formats
                ...crm,
                crmItems: crm.crmItems,
                investors: crm.investors,
                customers: crm.customers,
                partners: crm.partners
            }))
            loadedTabsRef.current.add('accounts')
        })
    }
}, [activeTab])
```

### Phase 3: Create Unified AccountsTab Component

#### 3.1 New AccountsTab Component

```typescript
// components/AccountsTab.tsx
interface AccountsTabProps {
    crmItems: CrmItem[];
    crmTasks: Task[];
    actions: AppActions;
    documents: Document[];
    businessProfile?: BusinessProfile | null;
    workspaceId?: string;
    workspaceMembers?: WorkspaceMember[];
    userId?: string;
    deals?: Deal[];
    productsServices?: ProductService[];
}

function AccountsTab(props: AccountsTabProps) {
    const { crmItems, crmTasks, actions } = props
    
    // Unified filtering state
    const [typeFilter, setTypeFilter] = useState<CrmType | 'all'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedItem, setSelectedItem] = useState<CrmItem | null>(null)
    const [activeView, setActiveView] = useState<'accounts' | 'contacts' | 'followups' | 'deals'>('accounts')
    
    // Filter items by type
    const filteredItems = useMemo(() => {
        let items = crmItems
        
        // Type filter
        if (typeFilter !== 'all') {
            items = items.filter(item => item.type === typeFilter)
        }
        
        // Search filter
        if (searchQuery) {
            items = items.filter(item => 
                item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.status.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        
        return items
    }, [crmItems, typeFilter, searchQuery])
    
    // Filter tasks by type
    const filteredTasks = useMemo(() => {
        if (typeFilter === 'all') return crmTasks
        return crmTasks.filter(t => t.crmType === typeFilter)
    }, [crmTasks, typeFilter])
    
    return (
        <div>
            {/* Filter Bar */}
            <div className="flex gap-4 mb-6">
                <div className="flex gap-2">
                    <FilterButton 
                        active={typeFilter === 'all'} 
                        onClick={() => setTypeFilter('all')}
                    >
                        All ({crmItems.length})
                    </FilterButton>
                    <FilterButton 
                        active={typeFilter === 'investor'} 
                        onClick={() => setTypeFilter('investor')}
                    >
                        Investors ({crmItems.filter(i => i.type === 'investor').length})
                    </FilterButton>
                    <FilterButton 
                        active={typeFilter === 'customer'} 
                        onClick={() => setTypeFilter('customer')}
                    >
                        Customers ({crmItems.filter(i => i.type === 'customer').length})
                    </FilterButton>
                    <FilterButton 
                        active={typeFilter === 'partner'} 
                        onClick={() => setTypeFilter('partner')}
                    >
                        Partners ({crmItems.filter(i => i.type === 'partner').length})
                    </FilterButton>
                </div>
                
                <input 
                    type="search"
                    placeholder="Search accounts..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-black"
                />
            </div>
            
            {/* View Switcher */}
            <div className="flex gap-2 mb-6">
                <ViewButton active={activeView === 'accounts'} onClick={() => setActiveView('accounts')}>
                    📋 Accounts
                </ViewButton>
                <ViewButton active={activeView === 'contacts'} onClick={() => setActiveView('contacts')}>
                    👤 Contacts
                </ViewButton>
                <ViewButton active={activeView === 'followups'} onClick={() => setActiveView('followups')}>
                    📅 Follow-ups
                </ViewButton>
                <ViewButton active={activeView === 'deals'} onClick={() => setActiveView('deals')}>
                    💰 Deals
                </ViewButton>
            </div>
            
            {/* Content Area */}
            {activeView === 'accounts' && (
                <AccountManager 
                    accounts={filteredItems}
                    tasks={filteredTasks}
                    actions={actions}
                    // ... other props
                />
            )}
            
            {activeView === 'contacts' && (
                <ContactManager 
                    contacts={filteredItems.flatMap(item => item.contacts || [])}
                    crmItems={filteredItems}
                    // ... other props
                />
            )}
            
            {/* ... other views */}
        </div>
    )
}
```

#### 3.2 Update Navigation Constants

```typescript
// constants.ts
export const Tab = {
    Dashboard: 'dashboard',
    Calendar: 'calendar',
    ProductsServices: 'products-services',
    Accounts: 'accounts', // NEW unified tab
    // Remove these:
    // Investors: 'investor-crm',
    // Customers: 'customer-crm',
    // Partners: 'partnerships',
    Marketing: 'marketing',
    Financials: 'financials',
    // ...
} as const;

export const NAV_ITEMS: NavItem[] = [
    { id: Tab.Dashboard, label: 'Dashboard' },
    { id: Tab.Calendar, label: 'Calendar' },
    { id: Tab.ProductsServices, label: 'Products & Services' },
    { id: Tab.Accounts, label: 'Accounts' }, // NEW
    { id: Tab.Marketing, label: 'Marketing' },
    { id: Tab.Financials, label: 'Financials' },
    // ...
];
```

### Phase 4: Update Action Handlers

#### 4.1 Simplify CRM Actions (Remove Collection Parameter)

```typescript
// types.ts - Update AppActions interface
export interface AppActions {
    // OLD (with collection parameter)
    // createCrmItem: (collection: CrmCollectionName, data: ...) => ...
    // updateCrmItem: (collection: CrmCollectionName, itemId: string, ...) => ...
    
    // NEW (type is part of the data)
    createCrmItem: (data: Partial<CrmItem>) => Promise<{ success: boolean; message: string; itemId?: string; }>;
    updateCrmItem: (itemId: string, updates: Partial<CrmItem>) => Promise<{ success: boolean; message: string; }>;
    deleteCrmItem: (itemId: string) => Promise<{ success: boolean; message: string; }>;
    
    // Contacts still need parent item context
    createContact: (crmItemId: string, contactData: Omit<Contact, 'id' | 'crmItemId'>) => ...;
    updateContact: (crmItemId: string, contactId: string, updates: Partial<Contact>) => ...;
    // ...
}
```

#### 4.2 Update DashboardApp Actions

```typescript
// DashboardApp.tsx
const actions: AppActions = useMemo(() => ({
    // Simplified CRM actions
    createCrmItem: async (data) => {
        // Type is now in the data object
        const { type, ...itemData } = data
        
        // Validate required fields based on type
        if (type === 'investor' && !data.checkSize) {
            return { success: false, message: 'Check size required for investors' }
        }
        if (type === 'customer' && !data.dealValue) {
            return { success: false, message: 'Deal value required for customers' }
        }
        
        // Create item
        const { data: createdItem, error } = await DataPersistenceAdapter.createCrmItem(
            userId, 
            workspace.id, 
            type, 
            itemData
        )
        
        if (error) throw error
        
        // Reload ALL CRM data (not just one type)
        invalidateCache('crm')
        const crm = await loadCrmItems({ force: true })
        setData(prev => ({ ...prev, ...crm }))
        
        return { success: true, itemId: createdItem.id }
    },
    
    updateCrmItem: async (itemId, updates) => {
        await DataPersistenceAdapter.updateCrmItem(itemId, updates)
        
        // Reload ALL CRM data
        const crm = await loadCrmItems({ force: true })
        setData(prev => ({ ...prev, ...crm }))
        
        return { success: true }
    },
    
    // ... other actions
}), [userId, workspace, data])
```

### Phase 5: Database Query Optimization

#### 5.1 Add Composite Indexes

```sql
-- Optimize filtering by type + status
CREATE INDEX IF NOT EXISTS idx_crm_items_type_status 
ON crm_items(workspace_id, type, status);

-- Optimize filtering by type + priority
CREATE INDEX IF NOT EXISTS idx_crm_items_type_priority 
ON crm_items(workspace_id, type, priority);

-- Optimize next action date queries
CREATE INDEX IF NOT EXISTS idx_crm_items_next_action 
ON crm_items(workspace_id, next_action_date) 
WHERE next_action_date IS NOT NULL;
```

#### 5.2 Update DatabaseService Methods

```typescript
// lib/services/database.ts
static async getCrmItems(
    workspaceId: string, 
    options: { 
        type?: 'investor' | 'customer' | 'partner';
        types?: Array<'investor' | 'customer' | 'partner'>; // NEW: multi-type query
        status?: string;
        priority?: string;
        limit?: number;
        offset?: number;
    } = {}
) {
    let query = supabase
        .from('crm_items')
        .select('*')
        .eq('workspace_id', workspaceId)
    
    // Support both single type and multiple types
    if (options.type) {
        query = query.eq('type', options.type)
    } else if (options.types && options.types.length > 0) {
        query = query.in('type', options.types)
    }
    
    if (options.status) {
        query = query.eq('status', options.status)
    }
    
    if (options.priority) {
        query = query.eq('priority', options.priority)
    }
    
    if (options.limit) {
        query = query.limit(options.limit)
    }
    
    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }
    
    return query.order('created_at', { ascending: false })
}

// NEW: Single query to get all CRM types at once
static async getAllCrmItems(workspaceId: string, limit = 1000) {
    return this.getCrmItems(workspaceId, { 
        types: ['investor', 'customer', 'partner'],
        limit 
    })
}
```

---

## Migration Strategy (Gradual, Non-Breaking)

### Step 1: Add New Properties (Week 1)
- ✅ Add `crmItems` and `crmTasks` to DashboardData
- ✅ Update `loadCrmItems()` to return both old and new formats
- ✅ Keep all existing 3-tab structure working

### Step 2: Build AccountsTab (Week 2)
- ✅ Create new `AccountsTab` component
- ✅ Add "Accounts" to navigation (initially hidden or beta flag)
- ✅ Test with real data using new unified arrays

### Step 3: Migrate Users Gradually (Week 3)
- ✅ Show both old tabs and new Accounts tab
- ✅ Add banner: "Try our new unified Accounts view!"
- ✅ Allow users to switch between old and new
- ✅ Collect feedback

### Step 4: Full Cutover (Week 4)
- ✅ Make Accounts tab default
- ✅ Remove old Investors/Customers/Partners tabs
- ✅ Clean up deprecated code
- ✅ Update all documentation

### Step 5: Cleanup (Week 5)
- ✅ Remove backwards compatibility code
- ✅ Remove split arrays from DashboardData
- ✅ Simplify type definitions
- ✅ Update tests

---

## Testing Checklist

### Functionality Tests
- [ ] Create investor account
- [ ] Create customer account
- [ ] Create partner account
- [ ] Filter by type
- [ ] Search across all types
- [ ] Create contact on any account type
- [ ] Create task on any account type
- [ ] Edit account (all types)
- [ ] Delete account (all types)
- [ ] Assign account to team member
- [ ] Next action scheduling

### Performance Tests
- [ ] Load 1000+ accounts (should be faster than before)
- [ ] Filter performance with large datasets
- [ ] Search performance
- [ ] Cache invalidation works correctly
- [ ] No stale data after create/update/delete

### Cross-Feature Tests
- [ ] Calendar shows all CRM events
- [ ] Dashboard shows all CRM stats
- [ ] AI assistant has access to all accounts
- [ ] Documents link to any account type
- [ ] Deals link to any account type

---

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**: Revert navigation to show old 3 tabs
2. **Data Safety**: All data still works with old structure
3. **No Database Changes**: No schema migrations needed to rollback
4. **Feature Flag**: Use feature flag to toggle between old/new UI

---

## Benefits Summary

### Developer Benefits
- **Single Source of Truth**: One component to maintain instead of 3
- **Easier Debugging**: Single data flow path
- **Better Testing**: Test one component thoroughly
- **Simpler Actions**: No more collection parameter everywhere

### User Benefits
- **Faster Loading**: Single cache instead of 3
- **Better Search**: Search all accounts at once
- **Easier Navigation**: No tab switching
- **Unified View**: See all relationships in one place
- **Better Filtering**: Cross-type filtering and sorting

### Performance Benefits
- **Single Database Query**: Load all types at once
- **One Cache Entry**: No more 3 separate caches
- **Faster Invalidation**: Clear one cache instead of 3
- **Better UX**: No more waiting for each tab to load

---

## Next Steps

1. **Review and Approve**: Team reviews this plan
2. **Create Feature Branch**: `feature/crm-consolidation`
3. **Start Phase 1**: Update type definitions
4. **Build Incrementally**: Each phase is independently testable
5. **Deploy Gradually**: Feature flag rollout

**Estimated Timeline**: 3-4 weeks
**Risk Level**: Low (non-breaking, gradual migration)
**Rollback Risk**: Very Low (no database changes)
