# Codebase Refactoring Plan

> Generated: December 2, 2025  
> Based on Codex recommendations for consolidating/refactoring duplicate and legacy code

---

## Overview

This document outlines a phased approach to cleaning up legacy code, consolidating duplicates, and standardizing patterns across the codebase. Changes are organized by risk level to allow incremental validation.

---

## Phase 1: Low Risk Deletions ✅ COMPLETED

These items had zero or minimal imports and were safe to delete without functional impact.

| Item | Type | Reason | Status |
|------|------|--------|--------|
| `components/BusinessProfileSetup.tsx` | Legacy component | Superseded by `business-profile/BusinessProfileSetup.tsx` | ✅ Deleted |
| `components/LandingPage.tsx` | Legacy component | Superseded by `landing/LandingPage.tsx` | ✅ Deleted |
| `contexts/WorkspaceContext.old.tsx` | Backup file | Duplicate of active `WorkspaceContext.tsx` | ✅ Deleted |
| `utils/gtmTemplates.ts` | Orphaned file | Zero imports anywhere in codebase | ✅ Deleted |
| `hooks/useToast.ts` | Unused hook | App uses `react-hot-toast` via `lib/utils/toast.tsx` | ✅ Deleted |
| `components/shared/Toast.tsx` | Legacy component | Replaced by `react-hot-toast` | ✅ Deleted |
| `components/shared/AccountManager.tsx` | Legacy component | Superseded by `crm/AccountManagerRefactored.tsx` | ✅ Deleted |
| `components/shared/ContactManager.tsx` | Legacy component | Superseded by `crm/ContactManagerRefactored.tsx` | ✅ Deleted |
| `hooks/useDataPersistence.ts` | Superseded hook | Replaced by `useQueryDataPersistence.ts` (React Query) | ✅ Deleted |
| `hooks/useLazyDataPersistence.ts` | Superseded hook | Replaced by `useQueryDataPersistence.ts` (React Query) | ✅ Deleted |
| `services/formService.ts` | Pass-through wrapper | Just re-exported `src/services/formService` | ✅ Deleted |

### Additional Phase 1 Changes

| Item | Change | Status |
|------|--------|--------|
| `components/dashboard/useDashboardData.ts` | Renamed to `useDashboardMetrics.ts` to avoid collision with `hooks/useDashboardData.ts` | ✅ Done |
| `DashboardApp.tsx` | Migrated from legacy Toast to `react-hot-toast` | ✅ Done |
| `hooks/index.ts` | Removed `useToast` exports | ✅ Done |
| Form service imports (4 files) | Updated to canonical path `src/services/formService` | ✅ Done |

**Commit**: `refactor: cleanup legacy/duplicate code - Phase 1`

---

## Phase 2: Medium Risk Consolidations 🔄 IN PROGRESS

These require careful migration to avoid breaking functionality.

### 2.1 Email Composer Migration

**Current State:**
- `components/email/EmailComposer.tsx` (2,061 lines) - Legacy, still exists for rollback
- `components/email/composer/EmailComposerRefactored.tsx` - Modern, cleaner architecture
- `components/email/EmailComposerWrapper.tsx` - NEW: Compatibility wrapper

**Consumers (Updated):**
- `components/email/EmailInbox.tsx` - ✅ Updated to use wrapper
- `components/email/EmailThread.tsx` - ✅ Updated to use wrapper
- `components/FileLibraryTab.tsx` - ✅ Updated to use wrapper

**Migration Plan:**
1. ✅ Create `EmailComposerWrapper.tsx` with `isOpen`/`isInline` API compatibility
2. ✅ Update `EmailInbox.tsx` to import from wrapper
3. ✅ Update `EmailThread.tsx` to import from wrapper  
4. ✅ Update `FileLibraryTab.tsx` to import from wrapper
5. ⏳ Test both modal and inline modes
6. ⏳ Delete legacy `EmailComposer.tsx` after testing

**Risk:** Medium - Email is critical functionality  
**Status:** 🔄 In Progress (wrapper created, consumers updated, testing needed)

---

### 2.2 Dashboard Data Hook Consolidation

**Current State:**
- Tab-loading logic scattered in `DashboardApp.tsx` (~200 lines)
- `hooks/useDashboardData.ts` exists but doesn't include tab-loading

**Target:**
- Move `loadTabData` logic from `DashboardApp.tsx` into `hooks/useDashboardData.ts`
- Single source of truth for dashboard data fetching

**Migration Plan:**
1. Extract `loadTabData` function and related state from `DashboardApp.tsx`
2. Add to `useDashboardData` hook with proper memoization
3. Update `DashboardApp.tsx` to use consolidated hook
4. Test all tab transitions

**Risk:** Medium - Affects all dashboard tabs  
**Status:** ⏳ Not Started

---

### 2.3 CRM Shared Hooks Integration

**Current State:**
- `hooks/useAccountManagerShared.ts` - Shared logic exists
- `hooks/useContactManagerShared.ts` - Shared logic exists
- `crm/AccountManagerRefactored.tsx` - Not using shared hooks
- `crm/ContactManagerRefactored.tsx` - Not using shared hooks

**Target:**
- Wire shared hooks into refactored components
- Eliminate duplicate state management

**Migration Plan:**
1. Import `useAccountManagerShared` into `AccountManagerRefactored.tsx`
2. Replace local state with hook-provided state
3. Import `useContactManagerShared` into `ContactManagerRefactored.tsx`
4. Replace local state with hook-provided state
5. Test all CRM CRUD operations

**Risk:** Medium - CRM is core functionality  
**Status:** ⏳ Not Started

---

### 2.4 Supabase Functions Standardization

**Current State:**
- CORS handling duplicated across ~15 Edge Functions
- Response formatting inconsistent
- Error handling varies by function

**Target:**
- Extract common utilities to `supabase/functions/_shared/`
- Standardize CORS, responses, and error handling

**Migration Plan:**
1. Create `_shared/cors.ts` with standard CORS headers
2. Create `_shared/response.ts` with `jsonResponse()`, `errorResponse()` helpers
3. Migrate non-critical functions first (reports, analytics)
4. Migrate critical functions (auth, payments) last
5. Test each function after migration

**Risk:** Medium - Affects backend functionality  
**Status:** ⏳ Not Started

---

## Phase 3: High Risk Consolidations ⏸️ PLANNED

These require extensive testing and may affect multiple components.

### 3.1 Doc Editor Consolidation

**Current State:**
- Multiple TipTap configurations across components:
  - `components/workspace/DocEditor.tsx`
  - `components/email/EmailComposerRefactored.tsx`
  - `components/docs/DocumentEditor.tsx`
- `hooks/useDocEditor.ts` exists but underutilized

**Target:**
- Create shared extension presets (basic, email, full-featured)
- Single `EditorProvider` component
- All editors use `useDocEditor` hook

**Migration Plan:**
1. Define extension presets in `lib/editor/presets.ts`
2. Create `EditorProvider` wrapper component
3. Update `useDocEditor` to accept preset parameter
4. Migrate `DocEditor.tsx` first (simplest)
5. Migrate `EmailComposerRefactored.tsx`
6. Migrate `DocumentEditor.tsx` last (most complex)

**Risk:** High - Rich text editing is complex  
**Status:** ⏸️ Not Started

---

### 3.2 Feature Flags Cleanup

**Current State:**
- `lib/featureFlags.ts` - `FeatureFlagManager` class
- `contexts/FeatureFlagContext.tsx` - React context + hook
- Both approaches work, used inconsistently

**Target:**
- Standardize on `FeatureFlagManager` class for all usage
- Context provides instance, components use class methods

**Migration Plan:**
1. Audit all feature flag usage
2. Update components to use consistent pattern
3. Consider removing context if not needed

**Risk:** Low (deferred) - Current approach works  
**Status:** ⏸️ Deferred

---

## Testing Checklist

After each phase, verify:

- [ ] Dev server starts without errors (`npm run dev`)
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] All dashboard tabs load correctly
- [ ] CRM operations (create, read, update, delete) work
- [ ] Email compose/send works (modal and inline)
- [ ] Document editing works
- [ ] No console errors in browser

---

## Rollback Plan

If issues arise:
1. `git revert HEAD` to undo last commit
2. `git stash` any uncommitted changes
3. Document the issue in this file
4. Plan fix before re-attempting

---

## Progress Log

| Date | Phase | Action | Result |
|------|-------|--------|--------|
| 2025-12-02 | Phase 1 | Deleted 11 legacy/unused files | ✅ Success |
| 2025-12-02 | Phase 1 | Renamed useDashboardData → useDashboardMetrics | ✅ Success |
| 2025-12-02 | Phase 1 | Migrated DashboardApp to react-hot-toast | ✅ Success |
| 2025-12-02 | Phase 1 | Updated formService imports | ✅ Success |
| 2025-12-02 | Phase 1 | Committed and pushed | ✅ Success |
| 2025-12-02 | Phase 2.1 | Created EmailComposerWrapper.tsx | ✅ Success |
| 2025-12-02 | Phase 2.1 | Updated EmailInbox to use wrapper | ✅ Success |
| 2025-12-02 | Phase 2.1 | Updated EmailThread to use wrapper | ✅ Success |
| 2025-12-02 | Phase 2.1 | Updated FileLibraryTab to use wrapper | ✅ Success |

