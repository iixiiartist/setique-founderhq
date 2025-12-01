# FormBuilder Component Refactoring Plan

## Current State

- **File**: `components/forms/FormBuilder.tsx`
- **Size**: ~2,213 lines (reduced from ~2,245)
- **Progress**: Phase 1 started

## Completed Extractions ✅

### 1. FormFieldToolbox.tsx ✅ (~80 lines)

**Status**: COMPLETED
**File**: `components/forms/FormFieldToolbox.tsx`
**Purpose**: Palette of field types to add to forms (input, choice, advanced, layout categories)

- Extracted successfully
- No TypeScript errors
- Includes icon mapping helper and category labels

## Proposed Component Extraction

### High Priority (Extract First)

#### 1. FormFieldEditor.tsx (~300 lines)

**Purpose**: Editor for individual form field properties (label, placeholder, validation, options)

**Props needed**:

```typescript
interface FormFieldEditorProps {
  field: FormField;
  onChange: (field: FormField) => void;
  onDelete: () => void;
}
```

#### 2. FormPreview.tsx (~400 lines)

**Purpose**: Live preview of the form with theme/branding applied

**Props needed**:

```typescript
interface FormPreviewProps {
  form: Form;
  fields: FormField[];
  theme: FormTheme;
  branding: FormBranding;
  isPreviewMode: boolean;
}
```

#### 3. FormSettingsPanel.tsx (~200 lines)

**Purpose**: Form settings (captcha, success message, notifications)

**Props needed**:

```typescript
interface FormSettingsPanelProps {
  settings: FormSettings;
  onChange: (settings: FormSettings) => void;
}
```

### Medium Priority

#### 4. FormThemePanel.tsx (~150 lines)

**Purpose**: Theme/styling configuration panel

#### 5. FormBrandingPanel.tsx (~150 lines)

**Purpose**: Branding configuration (logo, colors)

#### 6. FormIntegrationsPanel.tsx (~200 lines)

**Purpose**: CRM/Campaign integrations settings

#### 7. FormAnalyticsPanel.tsx (~150 lines)

**Purpose**: Analytics and tracking configuration

### Low Priority

#### 8. FormFieldPalette.tsx (~100 lines)

**Purpose**: Draggable field type palette

#### 9. FormFieldsList.tsx (~150 lines)

**Purpose**: Sortable list of form fields

#### 10. useFormBuilderState.ts (~150 lines)

**Purpose**: Custom hook for form builder state management

## Implementation Order

1. **Phase 1**: Extract `FormPreview` - self-contained render component
2. **Phase 2**: Extract `FormFieldEditor` - focused field editing
3. **Phase 3**: Extract settings panels (Settings, Theme, Branding)
4. **Phase 4**: Extract integration/analytics panels
5. **Phase 5**: Create custom hooks for state management

## Testing Strategy

1. After each extraction, verify:
   - No TypeScript errors
   - Form builder renders correctly
   - Drag-and-drop still works
   - Save/publish functionality intact
   - Preview updates in real-time

2. Consider adding:
   - Unit tests for extracted components
   - E2E tests for form creation flow

## Benefits

- **Maintainability**: Each panel can be modified independently
- **Testability**: Isolated components can be unit tested
- **Performance**: React can better optimize re-renders
- **Code Review**: Smaller, focused PRs
- **Reusability**: Components like FormPreview could be used elsewhere
