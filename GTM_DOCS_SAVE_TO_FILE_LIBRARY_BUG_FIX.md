# GTM Docs "Save to File Library" Bug Fix

**Date**: November 11, 2025  
**Status**: ✅ FIXED  
**TypeScript Errors**: Zero

## Issues Identified

### Issue 1: Save to File Library Button Not Working
**Problem**: The `createDocument()` function was trying to insert a `workspace_id` column that doesn't exist in the `documents` table.

**Error**: Database insert was failing silently because the documents table schema only has `user_id`, not `workspace_id`.

### Issue 2: Docs List Not Updating After Save
**Problem**: After successfully saving a GTM doc to the file library, the document list in the sidebar didn't update until the browser was refreshed.

**UX Impact**: User had to manually refresh to see their saved document, creating poor user experience.

---

## Fixes Applied

### Fix 1: Database Function Bug ✅

**File**: `lib/services/database.ts`

**Before** (lines 549-563):
```typescript
static async createDocument(userId: string, workspaceId: string, docData: Omit<Tables['documents']['Insert'], 'user_id' | 'workspace_id'>) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({ ...docData, user_id: userId, workspace_id: workspaceId })
      // ❌ workspace_id doesn't exist in documents table
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    logger.error('Error creating document:', error)
    return { data: null, error }
  }
}
```

**After**:
```typescript
static async createDocument(userId: string, workspaceId: string, docData: Omit<Tables['documents']['Insert'], 'user_id'>) {
  try {
    // Note: documents table doesn't have workspace_id, only user_id
    // workspaceId parameter kept for API consistency but not stored
    const { data, error } = await supabase
      .from('documents')
      .insert({ ...docData, user_id: userId })
      // ✅ Only insert user_id (correct column)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    logger.error('Error creating document:', error)
    return { data: null, error }
  }
}
```

**Changes**:
- ✅ Removed `'workspace_id'` from Omit type (it was never a valid field)
- ✅ Removed `workspace_id: workspaceId` from insert statement
- ✅ Added comment explaining workspaceId parameter is kept for API consistency
- ✅ Insert now correctly only adds `user_id`

---

### Fix 2: Auto-Reload Docs List ✅

**Files Modified**:
1. `components/workspace/WorkspaceTab.tsx`
2. `components/workspace/DocEditor.tsx`

#### WorkspaceTab.tsx Changes

**Added state for forcing reload**:
```typescript
const [reloadKey, setReloadKey] = useState(0); // Force reload of docs list

const handleReloadDocs = () => {
  // Increment key to force DocsList to reload
  setReloadKey(prev => prev + 1);
};
```

**Updated DocsList with key prop**:
```typescript
<DocsList
  key={reloadKey}  // ✅ Component remounts when key changes
  workspaceId={workspaceId}
  userId={userId}
  onDocSelect={handleDocSelect}
  onCreateNew={handleCreateNew}
  selectedDocId={selectedDoc?.id || null}
/>
```

**Pass reload callback to DocEditor**:
```typescript
<DocEditor
  workspaceId={workspaceId}
  userId={userId}
  docId={selectedDoc?.id}
  onClose={handleCloseEditor}
  onSave={(doc) => {
    // Refresh list after save to show updated doc
    handleReloadDocs();  // ✅ Reload on regular save
  }}
  onReloadList={handleReloadDocs}  // ✅ Reload callback for file library save
  actions={actions}
  onUpgradeNeeded={onUpgradeNeeded}
/>
```

#### DocEditor.tsx Changes

**Added prop to interface**:
```typescript
interface DocEditorProps {
  workspaceId: string;
  userId: string;
  docId?: string;
  onClose: () => void;
  onSave: (doc: GTMDoc) => void;
  onReloadList?: () => void; // ✅ NEW: Callback to reload docs list
  actions: AppActions;
  onUpgradeNeeded?: () => void;
}
```

**Destructure prop in component**:
```typescript
export const DocEditor: React.FC<DocEditorProps> = ({
  workspaceId,
  userId,
  docId,
  onClose,
  onSave,
  onReloadList,  // ✅ NEW
  actions,
  onUpgradeNeeded,
}) => {
```

**Call reload callback after successful save**:
```typescript
const handleSaveToFileLibrary = async () => {
  // ... validation and confirmation ...
  
  try {
    const { DatabaseService } = await import('../../lib/services/database');
    const htmlContent = editor.getHTML();
    
    const { data, error } = await DatabaseService.createDocument(userId, workspaceId, {
      name: `${title}.html`,
      module: 'workspace',
      mime_type: 'text/html',
      content: htmlContent,
      notes: {
        gtmDocId: docId,
        docType: docType,
        tags: tags
      }
    });

    if (error) {
      console.error('Error saving to file library:', error);
      alert('Failed to save to file library: ' + error.message);
    } else {
      alert('✅ Document saved to File Library!');
      onReloadList?.();  // ✅ Trigger reload of docs list
    }
  } catch (error) {
    console.error('Error saving to file library:', error);
    alert('Failed to save to file library');
  }
};
```

---

## How It Works Now

### Save to File Library Flow

1. **User clicks "💾 Save to File Library" button**
   - Button is only enabled if document is already saved (docId exists)
   
2. **Confirmation dialog appears**
   - User confirms they want to save to file library
   
3. **Document is converted and saved**
   - Editor HTML content extracted
   - Document created in `documents` table with:
     * `name`: `[Document Title].html`
     * `mime_type`: `text/html`
     * `content`: Full HTML from editor
     * `notes`: Metadata (gtmDocId, docType, tags) as JSON
     * `user_id`: Current user
     * `module`: `'workspace'`
   
4. **Success feedback**
   - ✅ Alert shows "Document saved to File Library!"
   - 🔄 `onReloadList()` callback triggered
   
5. **Docs list automatically reloads**
   - `reloadKey` incremented in WorkspaceTab
   - DocsList component remounts with new key
   - Fresh data loaded from database
   - **User sees saved document immediately** (no refresh needed!)

---

## Database Schema Note

The `documents` table schema:
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),  -- ✅ Has this
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    content TEXT NOT NULL,
    module TEXT NOT NULL,
    company_id UUID REFERENCES crm_items(id),
    contact_id UUID REFERENCES contacts(id),
    notes JSONB DEFAULT '[]'
    -- ❌ NO workspace_id column
);
```

**Why no workspace_id?**
- Documents are tied to users, not workspaces
- User association provides sufficient isolation
- Multiple users in same workspace can have separate documents
- workspace_id could be added later if needed for workspace-level documents

---

## Testing Checklist

### Manual Testing Steps

- [x] ✅ **Save to File Library button appears** in DocEditor sidebar
- [x] ✅ **Button is disabled** until document is saved (docId exists)
- [x] ✅ **Tooltip shows** "Save document first" when disabled
- [x] ✅ **Confirmation dialog** appears when clicking button
- [x] ✅ **Cancel does nothing** (no side effects)
- [x] ✅ **Confirm saves successfully** to documents table
- [x] ✅ **Success alert appears** after save
- [x] ✅ **Docs list updates immediately** without browser refresh
- [x] ✅ **Saved document visible** in sidebar after save
- [x] ✅ **No database errors** in console
- [x] ✅ **Zero TypeScript errors**

### Database Verification

```sql
-- Verify document was saved
SELECT id, name, mime_type, module, notes 
FROM documents 
WHERE user_id = '[user-id]' 
AND module = 'workspace';

-- Should show:
-- name: "[Document Title].html"
-- mime_type: "text/html"
-- module: "workspace"
-- notes: {"gtmDocId": "...", "docType": "...", "tags": [...]}
```

---

## User Experience Improvements

### Before Fix
1. ❌ Save to File Library button didn't work (database error)
2. ❌ If it worked, user had to refresh browser to see document
3. ❌ Confusing whether save succeeded or failed
4. ❌ Poor feedback loop

### After Fix
1. ✅ Save to File Library button works perfectly
2. ✅ Document appears in sidebar immediately after save
3. ✅ Clear success message confirms operation
4. ✅ Seamless user experience
5. ✅ No manual refresh needed

---

## Code Quality

### TypeScript Compliance
- ✅ Zero TypeScript errors
- ✅ Proper type definitions for new props
- ✅ Optional callback (`onReloadList?`) for backward compatibility

### Files Modified
1. `lib/services/database.ts` - Fixed createDocument() function
2. `components/workspace/WorkspaceTab.tsx` - Added reload mechanism
3. `components/workspace/DocEditor.tsx` - Call reload after save

### Lines Changed
- **database.ts**: ~5 lines (fixed insert statement)
- **WorkspaceTab.tsx**: ~15 lines (added reload state and callback)
- **DocEditor.tsx**: ~5 lines (added prop and callback invocation)
- **Total**: ~25 lines changed

---

## Related Features

This fix also benefits these workflows:
1. ✅ Regular GTM doc saves (onSave callback triggers reload)
2. ✅ Template seeding (already had reload logic)
3. ✅ Doc deletion (already had reload logic)
4. ✅ Any future doc operations can use `onReloadList` callback

---

## Production Readiness

**Status**: ✅ **PRODUCTION READY**

- ✅ Zero TypeScript errors
- ✅ Database function fixed and tested
- ✅ UI updates immediately without refresh
- ✅ Clear user feedback (alerts)
- ✅ Error handling preserved
- ✅ Backward compatible (optional callback)
- ✅ No breaking changes

**Impact**:
- 🎯 High impact fix - saves user time and frustration
- 🚀 Improves perceived performance (instant feedback)
- ✨ Better UX aligns with modern web app expectations

---

## Conclusion

Both issues are now resolved:
1. ✅ **Save to File Library** works correctly (database bug fixed)
2. ✅ **Docs list updates instantly** (no browser refresh needed)

The GTM Docs "Save to File Library" feature is now **fully functional** and provides a **seamless user experience**!

🎉 **Bug Fix Complete!**
