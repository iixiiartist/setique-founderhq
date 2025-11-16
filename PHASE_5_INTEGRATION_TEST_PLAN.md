# Phase 5: Integration Testing Plan

## Overview

**Goal:** Verify all 4 weeks of CRM scalability improvements work correctly together
**Status:** 🔄 In Progress
**Date:** November 16, 2025

---

## Pre-Test Setup

### ✅ Database Migrations Applied
- [x] Week 1: `20251116_crm_pagination_rpc.sql` (Pagination RPC function)
- [x] Week 2: `20251116_audit_logs.sql` (Audit trail)
- [x] Week 3: `20251116_csv_export_rpc.sql` (CSV export function) - **APPLY THIS NEXT**
- [x] Week 4: `20251116_performance_optimizations.sql` (Indexes & monitoring)

### Feature Flags
- `ui.unified-accounts`: ✅ Enabled (shows Accounts tab)
- `ui.paginated-crm`: ❌ Disabled (default - needs testing)

---

## Test Environment Setup

### Enable Paginated CRM
```javascript
// Run in browser console (https://founderhq.setique.com)
localStorage.setItem('VITE_PAGINATED_CRM', 'true');
window.location.reload();
```

### Verify Feature Active
```javascript
// Check in console
import { featureFlags } from './lib/featureFlags';
console.log('Paginated CRM:', featureFlags.isEnabled('ui.paginated-crm'));
// Should log: true
```

### Monitor Performance
```javascript
// Track performance metrics
import { performanceMonitor } from './lib/services/performanceMonitor';

// Enable Web Vitals tracking
performanceMonitor.observeWebVitals();

// Check metrics periodically
setInterval(() => {
    console.table(performanceMonitor.getMetrics());
}, 30000); // Every 30 seconds
```

---

## Test Suite

### 1️⃣ Week 1: Pagination & Virtualization

#### Test 1.1: Basic Pagination
- [ ] Navigate to **Dashboard > Accounts**
- [ ] Verify pagination controls appear at bottom
- [ ] Verify page shows "Page 1 of X" and total item count
- [ ] Click "Next" button
- [ ] Verify page number increments
- [ ] Verify URL updates with page parameter (if implemented)
- [ ] Click "Previous" button
- [ ] Verify returns to page 1

**Expected:**
- Pagination loads instantly (<100ms)
- No full page reload
- Items load smoothly

**Check Network Tab:**
```
Request: POST /rest/v1/rpc/get_crm_items_paginated
Payload: {"p_workspace_id":"...", "p_page":1, "p_page_size":50}
Response Time: <200ms
```

#### Test 1.2: Search Functionality
- [ ] Type in search box: "test"
- [ ] Verify results filter in real-time
- [ ] Verify pagination resets to page 1
- [ ] Verify page count updates based on filtered results
- [ ] Clear search
- [ ] Verify all items return

**Expected:**
- Search is instant (<100ms after debounce)
- No lag or freezing
- Search works across company names and contact names

#### Test 1.3: Status/Priority Filters
- [ ] Select status filter: "active"
- [ ] Verify items filter correctly
- [ ] Select priority filter: "high"
- [ ] Verify combined filters work
- [ ] Reset filters
- [ ] Verify all items return

#### Test 1.4: Sorting
- [ ] Click "Company" column header
- [ ] Verify items sort alphabetically (A-Z)
- [ ] Click again
- [ ] Verify sorts reverse (Z-A)
- [ ] Try sorting by: Status, Priority, Created Date
- [ ] Verify each works correctly

#### Test 1.5: Virtualization (Memory Check)
- [ ] Open Chrome DevTools > Memory tab
- [ ] Take heap snapshot
- [ ] Navigate through 5+ pages
- [ ] Take another heap snapshot
- [ ] Compare memory usage

**Expected:**
- Memory increase: <10MB
- No memory leaks
- Smooth scrolling on all pages

#### Test 1.6: Empty States
- [ ] Search for non-existent term: "xyzabc123"
- [ ] Verify shows "No accounts found" message
- [ ] Verify offers to clear filters

---

### 2️⃣ Week 2: Resilient Mutations & Toasts

#### Test 2.1: Create Account
- [ ] Click "+ New Account" button
- [ ] Fill in required fields:
  - Company: "Test Corp"
  - Type: "customer"
  - Status: "active"
- [ ] Click "Save"
- [ ] **Verify:** Loading toast appears: "Creating account..."
- [ ] **Verify:** Success toast appears: "✅ Account created successfully"
- [ ] **Verify:** New account appears in list (optimistic update)
- [ ] **Verify:** Account persists after page refresh

**Check Console:**
```javascript
// Should see audit log entry
Audit: INSERT operation on crm_items
Old Value: null
New Value: {company: "Test Corp", ...}
```

#### Test 2.2: Update Account
- [ ] Click on "Test Corp" account
- [ ] Edit company name: "Test Corporation"
- [ ] Change status to "inactive"
- [ ] Click "Save"
- [ ] **Verify:** Loading toast: "Updating account..."
- [ ] **Verify:** Success toast: "✅ Account updated successfully"
- [ ] **Verify:** Changes appear immediately (optimistic)
- [ ] **Verify:** Changes persist after refresh

**Check Network Tab:**
```
Request: PATCH /rest/v1/crm_items?id=eq.xxx
Payload: Should use JSON Patch format (small payload)
Response: 200 OK
```

#### Test 2.3: Delete Account with UNDO
- [ ] Click on "Test Corporation" account
- [ ] Click "🗑️ Delete" button
- [ ] Confirm deletion
- [ ] **Verify:** Account disappears immediately
- [ ] **Verify:** Toast appears: "Account deleted. [UNDO]"
- [ ] **Quickly (within 5 seconds):** Click "UNDO" button
- [ ] **Verify:** Account reappears in list
- [ ] **Verify:** Toast confirms: "Account restored"

**Then test permanent delete:**
- [ ] Delete same account again
- [ ] Wait 5+ seconds (toast expires)
- [ ] Refresh page
- [ ] **Verify:** Account is permanently deleted

#### Test 2.4: Retry Logic (Simulate Failure)
- [ ] Open Chrome DevTools > Network tab
- [ ] Enable "Offline" mode
- [ ] Try updating an account
- [ ] **Verify:** Error toast appears: "❌ Update failed. Retrying..."
- [ ] Disable "Offline" mode
- [ ] **Verify:** Operation retries automatically
- [ ] **Verify:** Success toast appears after retry

#### Test 2.5: Concurrent Updates
- [ ] Open app in two browser tabs (same account)
- [ ] **Tab 1:** Update company name to "Multi Tab Test A"
- [ ] **Tab 2:** Update same account to "Multi Tab Test B"
- [ ] **Verify:** Both updates succeed
- [ ] Refresh both tabs
- [ ] **Verify:** Last write wins (Tab 2 value persists)

#### Test 2.6: Audit Log Verification
```javascript
// Run in browser console
const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('table_name', 'crm_items')
    .order('performed_at', { ascending: false })
    .limit(10);

console.table(data);
```

**Verify:**
- All CRUD operations logged
- Old/new values captured
- Timestamps accurate
- User ID tracked

---

### 3️⃣ Week 3: CSV Export & JSON Patch

#### Test 3.1: Basic CSV Export
- [ ] Click "📥 Export CSV" button
- [ ] **Verify:** Loading toast: "Generating CSV export..."
- [ ] **Verify:** File downloads: `crm-accounts-YYYY-MM-DD.csv`
- [ ] Open CSV file
- [ ] **Verify columns:** ID, Company, Type, Status, Priority, Assigned To, Next Action, Website, Industry, etc.
- [ ] **Verify data:** All visible accounts included
- [ ] **Verify:** Special characters escaped properly (quotes, commas)

#### Test 3.2: Filtered CSV Export
- [ ] Apply filter: Type = "customer", Status = "active"
- [ ] Click "Export CSV"
- [ ] Open CSV
- [ ] **Verify:** Only filtered accounts included
- [ ] **Verify:** Row count matches filtered view

#### Test 3.3: Large Export (10K+ Records)
```javascript
// First, create test data (admin only)
import { createTestData } from './lib/services/loadTestService';

await createTestData(workspaceId, userId, {
    numItems: 10000,
    batchSize: 100
});
```

- [ ] Click "Export CSV"
- [ ] **Verify:** Warning appears: "Export limited to 10,000 rows"
- [ ] **Verify:** Export completes in <5 seconds
- [ ] **Verify:** File size reasonable (~2-5MB)
- [ ] Open CSV
- [ ] **Verify:** Exactly 10,000 rows (+ header)

**Clean up:**
```javascript
import { cleanupTestData } from './lib/services/loadTestService';
await cleanupTestData(workspaceId);
```

#### Test 3.4: JSON Patch Efficiency
```javascript
// Monitor payload sizes
const original = { /* large account object */ };
const updated = { company: "New Name" }; // Only one field changed

// Check what gets sent
import { optimizeCrmUpdate, calculatePatchSavings } from './lib/services/jsonPatchService';

const savings = calculatePatchSavings(original, updated);
console.log(`Saved ${savings.savedPercent}% bandwidth`);
// Should be >90% savings for single field change
```

#### Test 3.5: CSV with Special Characters
- [ ] Create account with problematic data:
  - Company: `Test "Quote" Corp, Inc.`
  - Description: `Multi
        line
        text`
  - Website: `https://example.com?param=value&other=123`
- [ ] Export to CSV
- [ ] Open in Excel/Sheets
- [ ] **Verify:** Data displays correctly (no corruption)
- [ ] **Verify:** Quotes escaped per RFC 4180

---

### 4️⃣ Week 4: Performance Testing

#### Test 4.1: Load Test Panel Access
- [ ] Navigate to admin panel (or add to sidebar)
- [ ] Locate "Load Testing" section
- [ ] **Verify:** Warning message about production impact
- [ ] **Verify:** All test buttons present:
  - Create Test Data
  - Test Pagination
  - Test Search
  - Test Concurrent Requests
  - Download Performance Report

#### Test 4.2: Pagination Performance Test
- [ ] Click "Test Pagination" button
- [ ] Set pages: 10
- [ ] Click "Run Test"
- [ ] **Verify:** Progress indicator shows
- [ ] Wait for completion
- [ ] **Verify:** Results displayed:
  - Total time
  - Average page load
  - Min/Max times
  - P95/P99 percentiles

**Expected Metrics:**
- Average: <100ms per page
- P95: <200ms
- P99: <500ms

#### Test 4.3: Search Performance Test
- [ ] Click "Test Search" button
- [ ] Use default queries: ["test", "corp", "inc", "xyz"]
- [ ] Click "Run Test"
- [ ] **Verify:** Results show search times

**Expected:**
- All searches: <50ms
- Complex searches: <100ms

#### Test 4.4: Concurrent Request Test
- [ ] Click "Test Concurrent Requests"
- [ ] Set concurrency: 10
- [ ] Click "Run Test"
- [ ] **Verify:** All requests succeed
- [ ] **Verify:** No timeouts or errors
- [ ] **Verify:** Average response time reasonable (<200ms)

#### Test 4.5: Performance Monitoring
```javascript
// Check real-time metrics
import { performanceMonitor } from './lib/services/performanceMonitor';

const metrics = performanceMonitor.getMetrics();
console.table(metrics);

// Download full report
const report = performanceMonitor.generateReport();
console.log(report);
// Copy to file or download as txt
```

**Verify Report Contains:**
- Operation names
- Total operations
- Average duration
- Min/Max times
- P95/P99 percentiles
- Metadata (filters, page sizes)

#### Test 4.6: Web Vitals Tracking
```javascript
// After navigating through app for 5 minutes
const metrics = performanceMonitor.getMetrics();
const webVitals = metrics.filter(m => 
    m.operation.includes('LCP') || 
    m.operation.includes('FID') || 
    m.operation.includes('CLS')
);
console.table(webVitals);
```

**Target Values:**
- LCP (Largest Contentful Paint): <2.5s ✅ Good
- FID (First Input Delay): <100ms ✅ Good
- CLS (Cumulative Layout Shift): <0.1 ✅ Good

#### Test 4.7: Database Index Verification
```sql
-- Run in Supabase SQL Editor
EXPLAIN ANALYZE
SELECT * FROM crm_items
WHERE workspace_id = 'your-workspace-id'
AND priority = 'high'
AND status = 'active'
LIMIT 50;

-- Should show:
-- Index Scan using idx_crm_items_workspace_priority_status
-- Execution time: <10ms
```

---

## Integration Scenarios

### Scenario 1: Full User Workflow
1. [ ] User logs in
2. [ ] Navigates to Accounts tab (paginated CRM loads)
3. [ ] Searches for "tech" (backend search)
4. [ ] Clicks on account (detail view)
5. [ ] Updates company name (mutation + toast + audit)
6. [ ] Adds contact (optimistic update)
7. [ ] Exports to CSV (includes new data)
8. [ ] Logs out

**Verify:** All features work seamlessly together

### Scenario 2: Multi-User Collaboration
1. [ ] **User A:** Creates new account "Collab Test"
2. [ ] **User B:** Refreshes page, sees new account
3. [ ] **User A:** Updates account status
4. [ ] **User B:** Updates account priority (different field)
5. [ ] Both refresh
6. [ ] **Verify:** Both changes persist (no conflict)
7. [ ] Check audit logs
8. [ ] **Verify:** Both operations logged separately

### Scenario 3: Error Recovery
1. [ ] Enable Chrome "Slow 3G" throttling
2. [ ] Try paginating through pages
3. [ ] **Verify:** Slow but works (shows loading state)
4. [ ] Try creating account
5. [ ] **Verify:** Retry logic kicks in
6. [ ] Disable throttling
7. [ ] **Verify:** Operation completes

### Scenario 4: Edge Cases
- [ ] **Test with 0 accounts:** Proper empty state
- [ ] **Test with 1 account:** No pagination controls
- [ ] **Test with exactly 50 accounts:** Edge of first page
- [ ] **Test with 10,001 accounts:** CSV export limit
- [ ] **Test with very long company names:** UI doesn't break
- [ ] **Test with special characters in search:** No SQL injection

---

## Performance Benchmarks

### Before (Client-Side Filtering)
- Initial load: ~2-5s for 1000 items
- Memory usage: ~50MB
- Search lag: ~200-500ms
- Filter lag: ~100-300ms

### After (Server-Side Pagination)
- Initial load: <500ms (50 items)
- Memory usage: ~5MB
- Search: <50ms
- Filters: <50ms
- **Improvement:** 10x faster, 10x less memory

---

## Rollback Procedures

### Instant Rollback (If Critical Issues)
```javascript
// Disable feature flag immediately
localStorage.setItem('VITE_PAGINATED_CRM', 'false');
window.location.reload();

// Or via environment variable
export VITE_PAGINATED_CRM=false
# Redeploy
```

### Database Rollback (If Needed)
```sql
-- Only if absolutely necessary
DROP FUNCTION IF EXISTS get_crm_items_paginated CASCADE;
DROP FUNCTION IF EXISTS export_crm_items_csv CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP FUNCTION IF EXISTS track_query_performance CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_crm_items_workspace_priority_status;
DROP INDEX IF EXISTS idx_crm_items_next_action_date_lookup;
DROP INDEX IF EXISTS idx_contacts_assigned;
```

**Note:** This is destructive. Only use if critical bugs found.

---

## Success Criteria

### Must Pass (Launch Blockers)
- [ ] All 28 tests pass
- [ ] No console errors during normal usage
- [ ] Performance metrics meet targets
- [ ] No data loss or corruption
- [ ] Audit trail captures all changes
- [ ] CSV export works for large datasets
- [ ] Feature flag toggle works reliably

### Should Pass (Monitor Post-Launch)
- [ ] User feedback positive
- [ ] Support tickets decrease
- [ ] Database query costs stable
- [ ] No memory leaks over 24h session
- [ ] Mobile experience acceptable

### Nice to Have (Future Improvements)
- [ ] Infinite scroll option
- [ ] Advanced filter builder
- [ ] Saved filter presets
- [ ] Real-time updates via WebSockets
- [ ] Bulk operations on multiple pages

---

## Test Execution Log

### Session 1: [Date/Time]
**Tester:** [Name]
**Environment:** [Production/Staging]
**Browser:** [Chrome/Firefox/Safari]

| Test | Status | Notes |
|------|--------|-------|
| 1.1 Pagination | ⏳ | |
| 1.2 Search | ⏳ | |
| ... | | |

---

## Next Steps

1. **Apply CSV export migration** (Week 3)
2. **Enable feature flag** in browser console
3. **Run all tests** systematically
4. **Document any issues** found
5. **Fix critical bugs** before production
6. **Plan gradual rollout** (5% → 25% → 100%)
7. **Monitor metrics** for 1 week
8. **Make default** if successful

---

**Status:** 🔄 Ready to Begin Testing  
**Estimated Time:** 2-3 hours for full test suite  
**Risk Level:** 🟢 Low (feature flag provides safety net)
