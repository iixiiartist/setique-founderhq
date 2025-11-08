# Cache Force Reload Implementation Plan

## Overview

Implementation plan for adding force reload capability to lazy data loaders, ensuring cache invalidation properly bypasses stale entries and pulls fresh workspace data on demand.

**Status**: 📋 Ready for Implementation  
**Priority**: High (Data Consistency & Cache Staleness Fix)  
**Estimated Time**: 1-2 hours  
**Risk Level**: Low (Backward compatible, additive change)

---

## 🎯 Objectives

### Primary Goals
1. **Add Force Flag**: Add optional `force` parameter to all lazy data loaders
2. **Fix Cache Staleness**: Ensure mutations always fetch fresh server data
3. **Improve Reload UX**: Manual reload button always gets latest data
4. **Maintain Consistency**: Replace optimistic updates with canonical server values

### Expected Outcomes
- ✅ No stale cache after mutations
- ✅ Reliable reload functionality
- ✅ Optimistic updates replaced with server truth
- ✅ Backward compatible (force is optional)
- ✅ More predictable data flow

---

## 📋 Implementation Phases

### **Phase 1: Add LoadOptions Type and Force Flag to Loaders** ⭐ Priority: Critical

**Objective**: Update `useLazyDataPersistence.ts` to support force reload

**File**: `hooks/useLazyDataPersistence.ts`

**Changes**:

**1. Add LoadOptions type** (after imports):
```typescript
type LoadOptions = {
  force?: boolean
}
```

**2. Update loadTasks signature and logic**:
```typescript
// BEFORE:
const loadTasks = useCallback(async () => {
    const cacheKey = 'tasks'
    const cached = dataCache[cacheKey]
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data
    }

// AFTER:
const loadTasks = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'tasks'
    const cached = dataCache[cacheKey]
    
    // Return cached data if still fresh (unless force reload)
    if (!options.force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data
    }
```

**3. Apply same pattern to all loaders**:
- `loadCrmItems(options: LoadOptions = {})`
- `loadMarketing(options: LoadOptions = {})`
- `loadFinancials(options: LoadOptions = {})`
- `loadDocuments(options: LoadOptions = {})`

**Benefits**:
- ✅ Explicit control over cache behavior
- ✅ Backward compatible (defaults to cached behavior)
- ✅ Type-safe with TypeScript
- ✅ Consistent API across all loaders

**Testing Checklist**:
- [ ] Loaders without force flag use cache (normal behavior)
- [ ] Loaders with `force: true` always fetch fresh data
- [ ] No TypeScript errors
- [ ] Cache timestamp still updates after force reload

---

### **Phase 2: Update Reload Function** ⭐ Priority: High

**Objective**: Ensure manual reload always fetches fresh data

**File**: `DashboardApp.tsx`

**Changes**:

Update all loader calls in the `reload` function (around line 516-600):

```typescript
// Dashboard/Calendar/Platform tabs
const tasks = await loadTasks({ force: true });

if (activeTab === Tab.Platform) {
    const documents = await loadDocuments({ force: true });
}

// Investors/Customers/Partners tabs
const crm = await loadCrmItems({ force: true });
const crmTasks = await loadTasks({ force: true });

// Marketing tab
const marketing = await loadMarketing({ force: true });
const marketingTasks = await loadTasks({ force: true });

// Financials tab
const financials = await loadFinancials({ force: true });
const financialTasks = await loadTasks({ force: true });

// Documents tab
const docs = await loadDocuments({ force: true });
```

**Why This Matters**:
- Users expect manual reload to fetch latest data
- Prevents "reload button does nothing" bug
- Clear user intent = force fresh data

**Testing Checklist**:
- [ ] Click reload button - data refreshes from server
- [ ] Network tab shows API calls being made
- [ ] Cached data is replaced with fresh data
- [ ] Loading states display correctly

---

### **Phase 3: Update Task Mutation Handlers** ⭐⭐ Priority: High

**Objective**: Ensure task create/update replaces optimistic updates with server data

**File**: `DashboardApp.tsx`

**Changes**:

**3.1 Update createTask** (around line 663):
```typescript
// BEFORE:
invalidateCache('tasks');
const updatedTasks = await loadTasks();

// AFTER:
invalidateCache('tasks');
const updatedTasks = await loadTasks({ force: true });
```

**3.2 Update updateTask** (around line 754):
```typescript
// BEFORE:
invalidateCache('tasks');
const updatedTasks = await loadTasks();

// AFTER:
invalidateCache('tasks');
const updatedTasks = await loadTasks({ force: true });
```

**Why Keep invalidateCache?**
- Defensive programming (belt + suspenders)
- Clear intent (this mutation affects task cache)
- Minimal cost, prevents bugs if force flag accidentally removed

**Testing Checklist**:
- [ ] Create task - optimistic placeholder replaced with real task
- [ ] Update task - changes reflected immediately
- [ ] Task IDs are server-generated (not temp IDs)
- [ ] No duplicate tasks in UI

---

### **Phase 4: Update Financial Mutation Handlers** ⭐⭐ Priority: High

**Objective**: Ensure financial operations fetch fresh data

**File**: `DashboardApp.tsx`

**Changes**:

**4.1 Update logFinancials** (around line 1269):
```typescript
// BEFORE:
invalidateCache('financials');
const freshFinancials = await loadFinancials();

// AFTER:
invalidateCache('financials');
const freshFinancials = await loadFinancials({ force: true });
```

**4.2 Update createExpense** (around line 1344):
```typescript
// BEFORE:
invalidateCache('financials');
const freshFinancials = await loadFinancials();

// AFTER:
invalidateCache('financials');
const freshFinancials = await loadFinancials({ force: true });
```

**4.3 Update updateExpense** (around line 1380):
```typescript
// BEFORE:
invalidateCache('financials');
const freshFinancials = await loadFinancials();

// AFTER:
invalidateCache('financials');
const freshFinancials = await loadFinancials({ force: true });
```

**Testing Checklist**:
- [ ] Log financials - new entry appears immediately
- [ ] Create expense - expense list updates
- [ ] Update expense - changes reflected
- [ ] Charts/summaries recalculate correctly

---

### **Phase 5: Update Delete Item Handler** ⭐⭐ Priority: High

**Objective**: Rollback on delete error uses fresh data

**File**: `DashboardApp.tsx`

**Changes**:

Update all rollback reloads in `deleteItem` (around line 1433):

```typescript
// Rollback on error - reload the data
if (collection === 'financials' || collection === 'expenses') {
    const freshFinancials = await loadFinancials({ force: true });
    setData(prev => ({ ...prev, ...freshFinancials }));
} else if (collection === 'marketing') {
    const freshMarketing = await loadMarketing({ force: true });
    setData(prev => ({ ...prev, marketing: freshMarketing }));
} else if (['investors', 'customers', 'partners'].includes(collection) || collection === 'contacts') {
    const freshCrm = await loadCrmItems({ force: true });
    setData(prev => ({ ...prev, ...freshCrm }));
} else if (['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
    const freshTasks = await loadTasks({ force: true });
    setData(prev => ({ ...prev, ...freshTasks }));
} else if (collection === 'documents') {
    const freshDocuments = await loadDocuments({ force: true });
    setData(prev => ({ ...prev, documents: freshDocuments }));
}
```

**Why This Matters**:
- Delete failures should restore accurate server state
- Not just revert optimistic update (might be stale)
- Ensures UI matches database after errors

**Testing Checklist**:
- [ ] Simulate delete failure (network offline)
- [ ] UI reverts to accurate server state
- [ ] No phantom deleted items
- [ ] No accidentally restored items

---

### **Phase 6: Update Marketing Mutation Handlers** ⭐⭐ Priority: High

**Objective**: Marketing create/update uses fresh data

**File**: `DashboardApp.tsx`

**Changes**:

**6.1 Update createMarketingItem** (around line 1480):
```typescript
// BEFORE:
invalidateCache('marketing');
const freshMarketing = await loadMarketing();

// AFTER:
invalidateCache('marketing');
const freshMarketing = await loadMarketing({ force: true });
```

**6.2 Update updateMarketingItem** (around line 1520+):
```typescript
// BEFORE:
invalidateCache('marketing');
const freshMarketing = await loadMarketing();

// AFTER:
invalidateCache('marketing');
const freshMarketing = await loadMarketing({ force: true });
```

**Testing Checklist**:
- [ ] Create marketing campaign - appears immediately
- [ ] Update campaign status - reflects changes
- [ ] Published status triggers correct behavior
- [ ] Marketing list stays current

---

### **Phase 7: Fix WorkspaceContext Duplication** 🔴 Critical

**Objective**: Remove duplicated `withTimeout` implementation

**File**: `contexts/WorkspaceContext.tsx`

**Problem**: Codex inlined `withTimeout` instead of importing from our utility

**Changes**:

**Remove the inline function** (around line 6-20):
```typescript
// REMOVE THIS:
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        return result as T;
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
};
```

**Add import instead** (at top of file):
```typescript
import { withTimeout } from '../lib/utils/promiseHelpers';
```

**Why This Matters**:
- Code duplication = maintenance burden
- We already created the utility file
- Single source of truth for timeout logic

**Testing Checklist**:
- [ ] No TypeScript errors after import
- [ ] Workspace loading still works
- [ ] Timeout behavior unchanged
- [ ] No regression in WorkspaceContext functionality

---

### **Phase 8: Testing and Verification** ⭐⭐⭐ Priority: Critical

**Objective**: Comprehensive testing of force reload behavior

#### Manual Testing Checklist

**Cache Behavior**:
- [ ] Normal load uses cache (no force flag)
- [ ] Cache expires after 5 minutes
- [ ] Force reload bypasses cache even when fresh
- [ ] Cache updates after force reload

**Task Operations**:
- [ ] Create task - optimistic → real task ID
- [ ] Update task - changes appear immediately
- [ ] Complete task - XP awarded, status updated
- [ ] Delete task - removed from UI
- [ ] Rollback on error - accurate server state

**Financial Operations**:
- [ ] Log financials - new entry appears
- [ ] Create expense - expense added to list
- [ ] Update expense - changes reflected
- [ ] Delete financial/expense - removed correctly

**CRM Operations**:
- [ ] Create CRM item - appears in correct category
- [ ] Update CRM item - changes visible
- [ ] Delete CRM item - removed from list
- [ ] Contacts/meetings stay synced

**Marketing Operations**:
- [ ] Create campaign - appears immediately
- [ ] Update campaign - status changes reflected
- [ ] Publish campaign - triggers achievements
- [ ] Delete campaign - removed from list

**Documents**:
- [ ] Upload document - appears in list
- [ ] Delete document - removed correctly
- [ ] Document metadata accurate

**Reload Function**:
- [ ] Manual reload button works
- [ ] All tabs reload correctly
- [ ] Loading states display
- [ ] No infinite loading bugs

**Performance Testing**:
```bash
# Open browser DevTools Network tab
# 1. Load dashboard - should use cache for subsequent tabs
# 2. Create task - should see forced API call
# 3. Click reload - should see API calls for active tab
# 4. Switch tabs without reload - should use cache if fresh
```

**Edge Cases**:
- [ ] Network offline - errors handled gracefully
- [ ] Concurrent mutations - last write wins
- [ ] Race conditions - force reload prevents stale data
- [ ] Cache expiration during mutation - force still works

---

### **Phase 9: Code Documentation** ⭐ Priority: Medium

**Objective**: Document the force reload pattern

**Files to Update**:
1. `hooks/useLazyDataPersistence.ts` - Add JSDoc comments
2. `DashboardApp.tsx` - Add inline comments for force reloads

**Documentation Template**:
```typescript
/**
 * Loads tasks with optional cache bypass
 * @param options.force - If true, bypasses cache and fetches fresh data from server
 * @returns Object containing all task collections
 * 
 * @example
 * // Normal load (uses cache if fresh)
 * const tasks = await loadTasks();
 * 
 * // Force reload (always fetches fresh data)
 * const tasks = await loadTasks({ force: true });
 */
```

**Inline Comment Template**:
```typescript
// Force reload to bypass cache and get fresh server data
// This ensures optimistic updates are replaced with canonical values
const tasks = await loadTasks({ force: true });
```

**Benefits**:
- Clear intent for future developers
- Explains when to use force flag
- Documents the pattern

---

### **Phase 10: Commit and Push** ⭐ Priority: Final

**Objective**: Deploy cache force reload improvements

**Commit Message Template**:
```bash
git commit -m "feat(cache): Add force reload capability to lazy data loaders

Phase 1: LoadOptions Type
- Add LoadOptions = { force?: boolean } type to useLazyDataPersistence
- Update all loaders (tasks, CRM, marketing, financials, documents) to accept options
- Force flag bypasses cache check: if (!options.force && cached && ...)

Phase 2: Manual Reload
- Update reload() function to use force: true for all loaders
- Ensures reload button always fetches fresh data from server
- Fixes 'reload does nothing' bug when cache is fresh

Phase 3-6: Mutation Handlers
- Update createTask, updateTask to use force reload
- Update logFinancials, createExpense, updateExpense to use force reload
- Update deleteItem rollback logic to use force reload
- Update createMarketingItem, updateMarketingItem to use force reload
- Ensures optimistic updates replaced with server canonical values

Phase 7: Fix Code Duplication
- Remove inline withTimeout from WorkspaceContext
- Import from lib/utils/promiseHelpers instead
- Maintains single source of truth for timeout utility

Benefits:
- Eliminates stale cache after mutations
- Reliable reload functionality (always fetches latest)
- Prevents race conditions (cache invalidate + load)
- Backward compatible (force is optional, defaults to false)
- More predictable data flow

Breaking Changes: None
Testing: Manual testing completed for all mutation scenarios
Performance Impact: Slight increase in API calls after mutations (acceptable trade-off for consistency)

Related: Builds on WorkspaceContext improvements (commit d41f5ad)
"
```

**Pre-commit Checklist**:
- [ ] All TypeScript errors resolved
- [ ] No ESLint warnings
- [ ] Manual testing completed (Phase 8)
- [ ] Code documentation added (Phase 9)
- [ ] No breaking changes
- [ ] All tests passing

---

## 🔧 Optional Enhancements (Future)

### Enhancement 1: Telemetry for Cache Behavior

**Track cache hits vs force reloads**:
```typescript
const loadTasks = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'tasks'
    const cached = dataCache[cacheKey]
    
    if (!options.force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('[Cache] Hit:', cacheKey); // or send to analytics
        return cached.data
    }
    
    console.log('[Cache] Miss:', options.force ? 'forced' : 'expired', cacheKey);
    // ... fetch logic
})
```

**Benefits**:
- Understand cache effectiveness
- Optimize cache duration
- Identify over-fetching patterns

---

### Enhancement 2: Smart Force Reload

**Only force reload if optimistic update failed**:
```typescript
try {
    await DataPersistenceAdapter.createTask(...);
    // Success - optimistic update was correct, use cache
    const tasks = await loadTasks();
} catch (error) {
    // Error - optimistic update was wrong, force reload
    const tasks = await loadTasks({ force: true });
}
```

**Trade-off**: More complexity for marginal API savings

---

### Enhancement 3: Granular Cache Invalidation

**Invalidate specific items instead of entire cache**:
```typescript
type CacheInvalidation = {
    type: 'full' | 'partial'
    ids?: string[]
}

invalidateCache('tasks', { type: 'partial', ids: [taskId] });
```

**Benefits**: Fewer API calls, more efficient
**Complexity**: Requires partial cache updates

---

## 📊 Expected Impact

### Before Implementation
| Scenario | Behavior | Issue |
|----------|----------|-------|
| Create task | Optimistic + cached load | Might show stale temp ID |
| Manual reload | Cached load | Appears to do nothing |
| Update expense | Cached load | Old value might persist |
| Race condition | Load before invalidate completes | Stale data in UI |

### After Implementation
| Scenario | Behavior | Result |
|----------|----------|--------|
| Create task | Optimistic + force reload | Always shows real server task |
| Manual reload | Force reload all | **Always fetches latest** |
| Update expense | Force reload | **Always shows new value** |
| Race condition | Force bypasses cache | **No stale data possible** |

### Performance Metrics
- **API Calls**: +10-20% (only on mutations, not views)
- **Cache Hit Rate**: No change for normal loads
- **Data Freshness**: 100% guaranteed after mutations
- **User-Perceived Latency**: No change (already loading)

**Trade-off Analysis**: Slight increase in API calls is acceptable for guaranteed data consistency.

---

## 🎯 Success Criteria

### Must Have (Phase 1-7)
- [ ] Force flag added to all 5 loaders
- [ ] Reload function uses force: true
- [ ] All mutation handlers use force: true
- [ ] WorkspaceContext duplication removed
- [ ] No TypeScript errors
- [ ] Backward compatible

### Nice to Have (Phase 8-10)
- [ ] Comprehensive testing completed
- [ ] Code documentation added
- [ ] Telemetry added (optional)
- [ ] Performance monitoring (optional)

### Production Ready Checklist
- [ ] No TypeScript/ESLint errors
- [ ] Manual testing passed for all scenarios
- [ ] No breaking changes
- [ ] Cache behavior predictable
- [ ] Mutation handlers consistent
- [ ] Documentation complete

---

## 🚨 Rollback Plan

If issues arise after deployment:

### Immediate Rollback
```bash
git revert HEAD
git push origin main
```

### Gradual Rollback (if needed)
1. Remove force flags from mutation handlers
2. Keep force in reload function
3. Keep LoadOptions type (no harm)

### Monitoring During Rollout
- Watch for increased API call volume (expected)
- Monitor for infinite loading states (should not happen)
- Check error rates in Sentry (should not increase)
- User reports of stale data (should decrease)

---

## 📚 Related Documentation

- [useLazyDataPersistence.ts](../hooks/useLazyDataPersistence.ts) - Lazy loading implementation
- [DashboardApp.tsx](../DashboardApp.tsx) - Main app with mutations
- [LAZY_LOADING_GUIDE.md](./LAZY_LOADING_GUIDE.md) - Lazy loading patterns
- [WORKSPACE_CONTEXT_IMPROVEMENTS.md](./WORKSPACE_CONTEXT_IMPROVEMENTS.md) - Related optimizations

---

## ✅ Sign-off

**Reviewed by**: AI Code Analysis (Codex)  
**Implementation Plan by**: Development Team  
**Status**: Ready for Implementation  
**Priority**: High (Data Consistency + Cache Staleness)  
**Risk Assessment**: Low (Backward compatible, additive change)  

**Estimated Timeline**:
- Phase 1: 15 minutes (add LoadOptions, update signatures)
- Phase 2: 10 minutes (update reload function)
- Phase 3-6: 30 minutes (update all mutation handlers)
- Phase 7: 5 minutes (fix WorkspaceContext duplication)
- Phase 8: 30-45 minutes (comprehensive testing)
- Phase 9: 15 minutes (documentation)
- Phase 10: 10 minutes (commit + push)

**Total**: 1.5-2 hours for complete implementation and testing

**Key Insight**: The force flag pattern is superior to just cache invalidation because it's explicit, deterministic, and prevents race conditions. This is a low-risk, high-value improvement.
