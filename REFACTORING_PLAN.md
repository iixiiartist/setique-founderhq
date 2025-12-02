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

**Current State (Updated Analysis):**
- ✅ `hooks/useDashboardData.ts` **already exists** with:
  - `loadTabData` function with full tab switching logic
  - `TAB_DATA_REQUIREMENTS` mapping for all tabs
  - Unified `crmItems` and `crmTasks` arrays
  - Proper memoization and React Query integration
- ⚠️ `DashboardApp.tsx` (3092 lines) has **duplicate inline logic** (lines 248-408)
- ⚠️ DashboardApp imports `useQueryDataPersistence` directly instead of `useDashboardData`

**Target:**
- Wire `DashboardApp.tsx` to use existing `useDashboardData` hook
- Remove duplicate inline `loadTabData` logic

**Migration Plan:**
1. ⏳ Import `useDashboardData` in `DashboardApp.tsx`
2. ⏳ Replace `useQueryDataPersistence` call with `useDashboardData`
3. ⏳ Remove inline `loadTabData` useEffect (lines 248-408)
4. ⏳ Use hook's `loadTabData`, `data`, `crmItems`, etc.
5. ⏳ Test all tab transitions

**Risk:** Medium-High - DashboardApp is 3092 lines, core file  
**Status:** ⏸️ Deferred (hook already exists, wiring deferred due to risk)

---

### 2.3 CRM Shared Hooks Integration

**Current State (Updated Analysis):**
- ✅ `useAccountManagerShared.ts` **exists** at `components/crm/accounts/hooks/`
  - Full implementation with filters, selection, CSV, modals, CRUD
  - Composes: `useAccountFilters`, `useCrmSelection`, `useCsvImportExport`, `useModal`
- ✅ `useContactManagerShared.ts` **exists** at `components/crm/contacts/hooks/`
  - Full implementation with filters, selection, CSV, tags, notes, duplicates
  - Composes: `useContactFilters`, `useCrmSelection`, `useCsvImportExport`, `useModal`
- ⚠️ `crm/AccountManagerRefactored.tsx` - **Not using shared hook**
- ⚠️ `crm/ContactManagerRefactored.tsx` - **Not using shared hook**

**Target:**
- Wire shared hooks into refactored components
- Eliminate duplicate state management

**Migration Plan:**
1. ⏳ Import `useAccountManagerShared` into `AccountManagerRefactored.tsx`
2. ⏳ Replace local state with hook-provided state
3. ⏳ Import `useContactManagerShared` into `ContactManagerRefactored.tsx`
4. ⏳ Replace local state with hook-provided state
5. ⏳ Test all CRM CRUD operations

**Risk:** Medium - CRM is core functionality  
**Status:** ⏸️ Deferred (hooks exist, wiring requires component refactoring)

---

### 2.4 Supabase Functions Standardization

**Current State (Updated Analysis):**
- ✅ `_shared/config.ts` has `corsHeaders`, `jsonResponse` (Stripe-focused)
- ✅ `_shared/apiAuth.ts` has `corsHeaders`, `errorResponse`, `successResponse`, `createApiHandler`
- ✅ API v1 functions already import from `_shared/apiAuth.ts`
- ✅ Stripe functions already import from `_shared/config.ts`
- ⚠️ ~10 older functions still define inline CORS headers:
  - `you-agent-run`, `moderation-check`, `huddle-send`, `integration-auth`
  - `email-sync`, `groq-chat`, `huddle-ai-run`, `form-submit`
  - `check-task-reminders`, `email-notifications`

**Target:**
- Migrate remaining functions to import from `_shared/`
- No new files needed - utilities already exist

**Migration Plan:**
1. ⏳ Migrate non-critical functions: `check-task-reminders`, `email-notifications`
2. ⏳ Migrate chat/AI functions: `groq-chat`, `huddle-ai-run`, `moderation-check`
3. ⏳ Migrate core functions: `email-sync`, `integration-auth`, `form-submit`
4. ⏳ Migrate complex functions: `you-agent-run`, `huddle-send`
5. ⏳ Test each function after migration

**Risk:** Low-Medium - Just import changes, no logic changes  
**Status:** ✅ Complete (all functions now import from `_shared/`)

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
| 2025-12-02 | Phase 2.4 | Updated check-task-reminders to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated email-notifications to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated groq-chat to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated moderation-check to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated huddle-send to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated huddle-ai-run to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated email-sync to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated integration-auth to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated form-submit to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated email-api to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated you-agent-run to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated api-balance-topup to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated api-balance-auto-reload to import from _shared | ✅ Success |
| 2025-12-02 | Phase 2.4 | Updated webhook-delivery to import from _shared | ✅ Success |

