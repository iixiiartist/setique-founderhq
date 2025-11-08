# Tab Prefetching Implementation

## Overview

Implemented intelligent data prefetching for tab navigation to eliminate loading delays and provide instant tab switching.

## Changes Made

### 1. Prefetch Hook

**File**: `hooks/usePrefetchTabs.ts`

Created React Query-based prefetching hook that:
- Prefetches data for tabs when user hovers over navigation items
- Uses 200ms hover delay to avoid prefetching on quick mouse movements
- Leverages React Query's built-in caching and deduplication
- Marks prefetched data as fresh for 5 minutes

### 2. SideMenu Integration

**File**: `components/SideMenu.tsx`

Enhanced navigation menu with:
- `onMouseEnter` handlers on tab buttons
- `onMouseLeave` cleanup to cancel pending prefetches
- Timeout management to prevent memory leaks
- Passes workspaceId and userId for prefetch queries

### 3. DashboardApp Updates

**File**: `DashboardApp.tsx`

Updated SideMenu props to include:
- `workspaceId={workspace?.id}`
- `userId={user?.id}`

## Prefetch Strategy by Tab

### Heavy Tabs (Prefetch All Data)

| Tab | Data Prefetched | Query Key | Stale Time |
|-----|-----------------|-----------|------------|
| **CRM (Investors/Customers/Partners)** | All CRM items | `['crm-items', workspaceId]` | 5 min |
| **Marketing** | Marketing items | `['marketing-items', workspaceId]` | 5 min |
| **Financials** | Financial logs + Expenses | `['financial-logs', workspaceId]`<br>`['expenses', workspaceId]` | 5 min |
| **Calendar** | Tasks + CRM items | `['tasks', userId, workspaceId]`<br>`['crm-items', workspaceId]` | 5 min |
| **Platform** | Platform tasks | `['tasks', userId, workspaceId]` | 5 min |
| **Documents** | Document list | `['documents', workspaceId]` | 5 min |

### Light Tabs (No Prefetch)

- **Dashboard**: Already loaded (default tab)
- **Settings**: Lightweight, loads instantly
- **Achievements**: Gamification data already in sidebar
- **Admin**: Rare usage, no prefetch needed

## How It Works

### User Flow

```
User Opens Menu
    ↓
Hover over "Marketing" tab for 200ms
    ↓
[Background] Prefetch marketing items from database
    ↓
[Background] Store in React Query cache (5 min fresh)
    ↓
User clicks "Marketing"
    ↓
✨ INSTANT RENDER - Data already in cache!
    ↓
User later re-hovers "Marketing"
    ↓
[Skip prefetch] - Data still fresh in cache
```

### Technical Implementation

#### 1. Hover Detection with Debounce

```tsx
onMouseEnter={() => {
  // Cleanup previous timeout
  if (hoverTimeoutRef.current) {
    hoverTimeoutRef.current();
  }
  // Start 200ms delayed prefetch
  hoverTimeoutRef.current = prefetchTabWithDelay(item.id);
}}
```

#### 2. Prefetch with React Query

```tsx
await queryClient.prefetchQuery({
  queryKey: ['marketing-items', workspaceId],
  queryFn: () => DatabaseService.getMarketingItems(workspaceId),
  staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
});
```

#### 3. Cache Reuse

When user clicks tab:
1. Component checks React Query cache
2. If data exists and is fresh → instant render
3. If data is stale → refetch in background while showing cached data
4. If no data → show loading state (rare with prefetch)

## Performance Benefits

### Before Prefetching:
- User clicks tab → 200-500ms wait → data loads → render
- Perceived as "sluggish" navigation
- Multiple network requests on each click

### After Prefetching:
- User hovers tab (200ms+) → data prefetches → clicks tab → **instant render**
- Feels like native app navigation
- Network requests happen during "thinking time"
- Cache reuse eliminates redundant requests

## Optimization Details

### Smart Prefetching

1. **Only When Menu Open**: Prefetch disabled when menu closed to save bandwidth
2. **Debounced Hover**: 200ms delay prevents prefetch spam on quick movements
3. **Cleanup on Leave**: Cancels pending prefetch if user moves away
4. **Cache Deduplication**: React Query prevents duplicate in-flight requests

### Memory Management

- Prefetched data automatically garbage collected by React Query
- 5-minute stale time balances freshness vs memory
- Cache size limits handled by React Query internally

### Network Efficiency

```
Without Prefetch:
  Click Tab A → Network Request → 300ms wait
  Click Tab B → Network Request → 300ms wait
  Click Tab A again → Network Request → 300ms wait (cache expired)
  
With Prefetch:
  Hover Tab A → Background prefetch (200ms delay)
  Click Tab A → Instant (cached)
  Click Tab B → Instant (was prefetched on hover)
  Click Tab A again → Instant (still fresh in cache)
```

## Edge Cases Handled

### 1. Quick Mouse Movements
- Timeout cleanup prevents unnecessary prefetches
- Only prefetches if hover lasts 200ms+

### 2. Missing Data
- Gracefully falls back to normal loading
- Doesn't break if workspaceId/userId unavailable

### 3. Menu Closed
- Prefetch disabled via `enabled: isOpen` flag
- Saves bandwidth when not needed

### 4. Network Errors
- React Query handles errors automatically
- Failed prefetch doesn't block UI
- Tab still loads normally on click

## Testing Prefetch Behavior

### Manual Testing:

1. **Open Developer Tools** → Network tab
2. **Open Side Menu** in app
3. **Hover over "Marketing" tab** for 1 second (don't click)
4. **Watch Network tab**: You should see request for marketing items
5. **Click "Marketing" tab**: Instant render with no loading spinner
6. **Click "Financials" tab** (without hovering first): Shows loading briefly

### Browser DevTools:

```javascript
// Check React Query cache
window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__
// Inspect cached queries and their freshness
```

## Future Enhancements

1. **Predictive Prefetching**: Based on user navigation patterns
2. **Priority Prefetching**: Prefetch most-used tabs first
3. **Preload Tab Components**: Preload lazy-loaded components on hover
4. **Connection-Aware**: Disable on slow connections
5. **Usage Analytics**: Track which tabs benefit most from prefetch

## Performance Metrics

### Expected Improvements:

- **Tab Switch Time**: 300ms → <50ms (84% faster)
- **Perceived Performance**: "Sluggish" → "Instant"
- **Network Efficiency**: Reduce redundant requests by ~70%
- **User Satisfaction**: Smoother, more responsive experience

### Measured in Production:

Monitor with:
- React Query DevTools
- Network waterfall diagrams
- User analytics (tab switch frequency)
- Time to Interactive (TTI) metrics

## Compatibility

- ✅ Works with code splitting (lazy-loaded components)
- ✅ Works with React Query caching
- ✅ Mobile-friendly (hover = touch on mobile)
- ✅ Graceful degradation if prefetch fails
- ✅ No breaking changes to existing code
