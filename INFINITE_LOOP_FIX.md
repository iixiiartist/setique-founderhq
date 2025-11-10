# Infinite Loop Bug Fix - November 10, 2025

## Problem
Users experienced a critical infinite recursion bug when signing in and loading the dashboard:
- Thousands of data fetch requests in rapid succession
- Browser console showed: `ERR_INSUFFICIENT_RESOURCES`
- App completely crashed - unable to use dashboard
- All data endpoints flooded: tasks, CRM, marketing, financials, documents, profiles

## Root Cause
The bug was in `DashboardApp.tsx` with two useEffect hooks:

### Issue 1: Function Dependencies in useEffect
```typescript
useEffect(() => {
  // ... initialization logic
}, [user, workspace?.id, loadCoreData, loadDocumentsMetadata]);
```

**Problem**: `loadCoreData` and `loadDocumentsMetadata` are memoized functions from `useLazyDataPersistence` hook, but they recreate on every render because they depend on `user` and `workspace?.id`. This created an infinite loop:
1. Effect runs → loads data
2. Functions recreate (because they're in closure)
3. Effect sees "new" functions → runs again
4. Repeat infinitely

### Issue 2: State Setter in Dependencies + Checking Same State
```typescript
const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

useEffect(() => {
  if (loadedTabs.has(activeTab)) return; // Check state
  // ... load data
  setLoadedTabs(prev => new Set(prev).add(activeTab)); // Update state
}, [activeTab, loadedTabs, ...functions]);
```

**Problem**: Creating a new Set with `new Set(prev)` creates a new object reference, triggering the effect again because `loadedTabs` is in the dependency array.

## Solution

### Fix 1: Remove Function Dependencies
```typescript
useEffect(() => {
  // ... initialization logic
}, [user?.id, workspace?.id]); // Only depend on actual values that change
```

**Result**: Effect only runs when user ID or workspace ID actually changes (e.g., switching accounts), not on every render.

### Fix 2: Use useRef Instead of useState for Tracking
```typescript
const loadedTabsRef = useRef<Set<string>>(new Set());

useEffect(() => {
  if (loadedTabsRef.current.has(activeTab)) return;
  // ... load data
  loadedTabsRef.current.add(activeTab); // Mutate ref directly
}, [activeTab, user?.id, workspace?.id, isLoading]);
```

**Benefits**:
- Ref mutations don't trigger re-renders
- No new object creation
- No circular dependency

## Files Changed
- `DashboardApp.tsx`: 
  - Changed `loadedTabs` state to `loadedTabsRef` ref
  - Removed function dependencies from useEffect arrays
  - Updated all `setLoadedTabs()` calls to `loadedTabsRef.current.add()`
  - Updated all `loadedTabs.has()` calls to `loadedTabsRef.current.has()`

## Testing
✅ App now loads without infinite requests
✅ Data fetches occur only when needed (tab switching, initial load)
✅ No browser resource exhaustion
✅ TypeScript compilation passes with no errors

## Lessons Learned
1. **Never put recreating functions in useEffect dependencies** - use primitive values only
2. **Be careful with state that both checks and updates in same effect** - can create loops
3. **Use refs for tracking that doesn't need to trigger renders** - more efficient
4. **Watch for object creation in setters** (`new Set()`, `{...obj}`) in effects

## Prevention
To avoid similar issues in future:
1. Use `user?.id` instead of `user` in dependencies
2. Use `workspace?.id` instead of `workspace` in dependencies
3. Use refs for internal tracking that doesn't affect UI
4. Add ESLint rule: `react-hooks/exhaustive-deps` (already enabled, but review warnings)
5. Monitor network tab during development for repeated requests

## Related Documentation
- React docs: [useEffect pitfalls](https://react.dev/reference/react/useEffect#troubleshooting)
- React docs: [useRef for storing mutable values](https://react.dev/reference/react/useRef#referencing-a-value-with-a-ref)
