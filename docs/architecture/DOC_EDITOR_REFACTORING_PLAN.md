# DocEditor Component Refactoring Plan

## Current State
- **File**: `components/workspace/DocEditor.tsx`
- **Size**: ~2,995 lines (reduced from ~3,330)
- **Progress**: Phase 1 & 2 completed

## Completed Extractions ✅

### 1. DocEditorExportModal.tsx ✅ (~260 lines)
**Status**: COMPLETED
**File**: `components/workspace/DocEditorExportModal.tsx`
**Purpose**: Export settings UI with presets, page settings, branding
- Extracted successfully with all props
- No TypeScript errors

### 2. DocEditorBubbleMenu.tsx ✅ (~170 lines)
**Status**: COMPLETED
**File**: `components/workspace/DocEditorBubbleMenu.tsx`
**Purpose**: Floating toolbar with formatting options
- Extracted successfully
- Handles font family, font size, text formatting, headings, lists, alignment, links, highlighting

## Remaining Component Extraction

### High Priority
**Lines**: 1935-2340 approximately
**Purpose**: Main document toolbar with all controls
**Props needed**:
```typescript
interface DocEditorToolbarProps {
  editor: Editor | null;
  title: string;
  docType: DocType;
  visibility: DocVisibility;
  tags: string[];
  isSaving: boolean;
  lastSavedAt: Date | null;
  canEdit: boolean;
  onTitleChange: (title: string) => void;
  onDocTypeChange: (type: DocType) => void;
  onVisibilityChange: (visibility: DocVisibility) => void;
  onTagsChange: (tags: string[]) => void;
  onSave: () => void;
  onExport: () => void;
  onShare: () => void;
  onOpenAIPalette: () => void;
  // ...additional props
}
```

### Medium Priority

#### 4. DocEditorContextMenu.tsx (~50 lines)
**Lines**: 3190-3212
**Purpose**: Right-click context menu

#### 5. DocEditorStatusBar.tsx (~80 lines)
**Purpose**: Word count, character count, collab status at bottom

#### 6. DocEditorCanvasTools.tsx (~150 lines)
**Purpose**: Professional canvas mode tools (shape, text box, signature, frame)

### Low Priority (Nice to Have)

#### 7. DocEditorCollabPresence.tsx (~100 lines)
**Purpose**: Collaboration avatar/presence indicators

#### 8. useDocEditorState.ts (~200 lines)
**Purpose**: Custom hook to manage all document state (title, content, tags, etc.)

#### 9. useDocEditorAutosave.ts (~100 lines)
**Purpose**: Custom hook for autosave logic with retry

#### 10. useDocEditorCollab.ts (~150 lines)
**Purpose**: Custom hook for Yjs/Supabase provider collaboration state

## Implementation Order

1. **Phase 1**: Extract `DocEditorExportModal` - self-contained, low risk
2. **Phase 2**: Extract `DocEditorBubbleMenu` - encapsulated floating toolbar
3. **Phase 3**: Extract `DocEditorToolbar` - main toolbar, higher complexity
4. **Phase 4**: Create custom hooks for state management
5. **Phase 5**: Extract remaining UI components

## Testing Strategy

1. After each extraction, verify:
   - No TypeScript errors
   - Component renders correctly
   - All existing functionality works (save, export, collab, etc.)
   - No performance regressions

2. Consider adding:
   - Unit tests for extracted components
   - Integration tests for the combined editor

## Benefits

- **Maintainability**: Smaller files are easier to understand and modify
- **Testability**: Isolated components can be unit tested
- **Reusability**: Components like ExportModal could be reused elsewhere
- **Performance**: React can better optimize re-renders with smaller components
- **Code Review**: Smaller diffs in PRs
