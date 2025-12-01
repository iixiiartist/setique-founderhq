# Refactoring Implementation Summary

This document summarizes the shared hooks and utilities created to address the refactoring opportunities outlined for the Setique Founder Dashboard.

## Status

| Area | Status | Notes |
|------|--------|-------|
| 1. Dashboard Data Hook | ✅ Created | `useDashboardData.ts` - Ready for integration |
| 2. CRM Shared Hooks | ✅ Created | `useAccountManagerShared.ts`, `useContactManagerShared.ts` |
| 3. Filter/Selection Hooks | ✅ Created | `useCrmFilters.ts`, `useCrmSelection.ts` |
| 4. CSV Import/Export | ✅ Created | `useCsvImportExport.ts`, `csvSchemas.ts` |
| 5. Doc Editor Hook | ✅ Created | `useDocEditor.ts` - Ready for integration |
| 6. AccountsTab Migration | ✅ Complete | Uses `AccountManagerRefactored`, `ContactManagerRefactored` |
| 7. CrmTab Migration | ✅ Complete | Uses `AccountManagerRefactored`, `ContactManagerRefactored` |
| 8. BusinessProfile Migration | ✅ Complete | DashboardApp uses `BusinessProfileSetupRefactored` |
| 9. LandingPage Migration | ✅ Complete | App.tsx uses `LandingPageRefactored` |
| 10. Delete legacy files | ⏳ Pending | See list below |

**All created hooks compile without TypeScript errors.**

### Legacy Files to Delete (after full testing)
- `components/BusinessProfileSetup.tsx` (58KB → 9KB refactored)
- `components/LandingPage.tsx` (676 lines → modular sections)
- `components/shared/AccountManager.tsx` (1735 lines)
- `components/shared/ContactManager.tsx` (2400+ lines)

## Created Files

### 1. Dashboard Data Management
**File:** `hooks/useDashboardData.ts`

Extracts data loading logic from `DashboardApp.tsx` (~3k lines). This hook:
- Wraps `useQueryDataPersistence` for a cleaner interface
- Handles tab-specific data loading
- Provides unified CRM items/tasks arrays
- Makes data loading testable and reusable (for Electron shell, tests, etc.)

**Usage:**
```tsx
const { data, crmItems, loadTabData, reload, isLoading } = useDashboardData({
  userId: user?.id,
  workspaceId: workspace?.id,
});
```

### 2. CSV Schema Definitions
**File:** `lib/utils/csvSchemas.ts`

Centralizes CSV import/export schemas for all entity types:
- `CONTACT_CSV_SCHEMA`
- `ACCOUNT_CSV_SCHEMA` 
- `INVESTOR_CSV_SCHEMA`
- `CUSTOMER_CSV_SCHEMA`
- `PARTNER_CSV_SCHEMA`
- `TASK_CSV_SCHEMA`
- `DEAL_CSV_SCHEMA`
- `MARKETING_CSV_SCHEMA`

Each schema defines:
- Field definitions with headers, validators, parsers, formatters
- Example data for templates
- Required field validation

**Usage:**
```tsx
import { getCSVSchema, generateTemplateFromSchema, parseRowWithSchema } from '../lib/utils/csvSchemas';

const schema = getCSVSchema('contacts');
const template = generateTemplateFromSchema(schema);
const parsed = parseRowWithSchema(rawRow, schema);
```

### 3. CRM Selection Hook
**File:** `hooks/useCrmSelection.ts`

Unified selection state for CRM components combining:
- Single item view selection
- Bulk selection mode (wraps `useBulkSelection`)
- Helper methods for selecting/deselecting items from lists

**Usage:**
```tsx
const selection = useCrmSelection<AnyCrmItem>({
  getItemId: (item) => item.id,
});

// Single item view
selection.setViewItem(item);

// Bulk selection
selection.toggleSelectionMode();
selection.selectAll(filteredItems);
```

### 4. CRM Filters Hooks
**File:** `hooks/useCrmFilters.ts`

#### `useAccountFilters`
Wraps `useFilteredList` with CRM-specific presets for accounts:
- Search across company, status, contacts
- Priority/status/tag filters
- Contact count, note count, overdue filters
- Analytics calculations

#### `useContactFilters`
Similar for contacts:
- Search across name, email, phone, title
- Link status filter (linked/unlinked)
- Tag, title, note count, meeting count filters

**Usage:**
```tsx
const filters = useAccountFilters(crmItems, {
  initialSort: { field: 'company', order: 'asc' },
});

filters.setSearchQuery('acme');
filters.setAdvancedFilter('priority', 'High');
// filters.filteredItems is the result
```

### 5. CSV Import/Export Hook
**File:** `hooks/useCsvImportExport.ts`

Shared hook for CSV operations:
- Uses centralized schemas from `csvSchemas.ts`
- Handles import with progress tracking
- Export with proper formatting
- Template downloads

**Usage:**
```tsx
const csv = useCsvImportExport<Contact>({
  entityType: 'contacts',
  processImportRow: async (row) => {
    // Process each row
    return { success: true };
  },
});

await csv.startImport(file);
csv.exportItems(items);
csv.downloadTemplate();
```

### 6. Document Editor Hook
**File:** `hooks/useDocEditor.ts`

Extracts core editor logic from `DocEditor.tsx` (~2.6k lines):
- Tiptap editor instance management
- Extension configuration
- Document state (title, type, visibility, tags)
- Block metadata for canvas mode
- Command helpers for formatting, tables, media
- Content manipulation (getHTML, setContent, etc.)

**Usage:**
```tsx
const editor = useDocEditor({
  workspaceId,
  userId,
  docId,
  placeholder: 'Start writing...',
  onChange: (html) => console.log('Content changed'),
});

// Use commands
editor.commands.toggleBold();
editor.commands.insertTable(3, 3);

// Get content
const html = editor.getHTML();
```

### 7. Shared Account Manager Hook
**File:** `components/crm/accounts/hooks/useAccountManagerShared.ts`

Composes all shared hooks for a complete account manager:
- `useAccountFilters` for filtering
- `useCrmSelection` for selection
- `useCsvImportExport` for import/export
- `useModal` for modal state
- CRUD operations
- Duplicate detection

### 8. Shared Contact Manager Hook
**File:** `components/crm/contacts/hooks/useContactManagerShared.ts`

Same pattern for contacts:
- `useContactFilters` for filtering
- `useCrmSelection` for selection
- `useCsvImportExport` for import/export
- `useModal` for modal state
- CRUD operations
- Tag and note operations
- Duplicate detection

## Migration Guide

### Step 1: Consolidate CRM Stacks
The codebase has two competing CRM implementations:

**Legacy (components/shared/):**
- `AccountManager.tsx` (~1.7k lines)
- `ContactManager.tsx` (~2.4k lines)

**Refactored (components/crm/):**
- `AccountManagerRefactored.tsx`
- `ContactManagerRefactored.tsx`

**Recommendation:** Migrate both to use the new shared hooks:

```tsx
// Replace inline state management with:
import { useAccountManagerShared } from './hooks/useAccountManagerShared';

function AccountManagerRefactored(props) {
  const manager = useAccountManagerShared({
    crmItems: props.crmItems,
    actions: props.actions,
    crmCollection: props.crmCollection,
    crmType: props.crmType,
  });

  // manager now has all state and operations
  return (
    <>
      <SearchInput value={manager.searchQuery} onChange={manager.setSearchQuery} />
      <AccountList items={manager.filteredItems} />
      {/* etc */}
    </>
  );
}
```

### Step 2: Update AccountsTab and CrmTab
Both tabs import legacy managers. Update to use refactored versions:

```tsx
// In AccountsTab.tsx and CrmTab.tsx
// Replace:
import { AccountManager } from './shared/AccountManager';
import { ContactManager } from './shared/ContactManager';

// With:
import { AccountManagerRefactored } from './crm/accounts';
import { ContactManagerRefactored } from './crm/contacts';
```

### Step 3: Simplify DashboardApp.tsx
Extract data loading to `useDashboardData`:

```tsx
// Before (inline in DashboardApp):
const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
const loadTabData = useCallback(async (tab) => { /* ... */ }, []);

// After:
import { useDashboardData } from '../hooks/useDashboardData';

const { data, loadTabData, isLoading } = useDashboardData({
  userId: user?.id,
  workspaceId: workspace?.id,
});
```

### Step 4: Refactor DocEditor
Use `useDocEditor` to separate editor logic from UI:

```tsx
// In DocEditor.tsx
import { useDocEditor } from '../../hooks/useDocEditor';

const DocEditor = ({ workspaceId, userId, docId, ...props }) => {
  const editor = useDocEditor({
    workspaceId,
    userId,
    docId,
    onReady: (e) => console.log('Editor ready'),
  });

  return (
    <div>
      <DocEditorToolbar editor={editor.editor} commands={editor.commands} />
      <EditorContent editor={editor.editor} />
      <DocEditorBubbleMenu editor={editor.editor} commands={editor.commands} />
    </div>
  );
};
```

### Step 5: Delete Duplicate Files
After migration is complete:
- Remove `components/BusinessProfileSetup.tsx` (keep `BusinessProfileSetupRefactored`)
- Remove `components/LandingPage.tsx` (keep `LandingPageRefactored`)
- Remove legacy `components/shared/AccountManager.tsx` 
- Remove legacy `components/shared/ContactManager.tsx`

## Benefits

1. **Reduced Code Duplication**
   - Filtering logic: ~400 lines → shared hook
   - CSV import/export: ~200 lines per manager → shared hook
   - Selection logic: ~150 lines → shared hook

2. **Standardized UX**
   - Consistent search debounce (300ms)
   - Consistent sort toggles
   - Consistent filter behavior

3. **Testability**
   - Hooks can be tested in isolation
   - Data loading separated from UI
   - Editor commands testable without UI

4. **Reusability**
   - Same hooks work for Accounts, Contacts, Deals, etc.
   - Data loading works in tests, Electron shell, etc.
   - Editor commands reusable across different editor UIs

5. **Bundle Size**
   - Tab-specific code now truly independent
   - Lazy loading more effective with separated concerns

## Index Exports

All new hooks are exported from `hooks/index.ts`:

```tsx
export { useDashboardData } from './useDashboardData';
export { useCrmSelection } from './useCrmSelection';
export { useAccountFilters, useContactFilters } from './useCrmFilters';
export { useCsvImportExport } from './useCsvImportExport';
export { useDocEditor, getDefaultExtensions } from './useDocEditor';
```
