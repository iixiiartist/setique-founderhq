import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Form,
  FormField,
  FormFieldType,
  FormBuilderState,
  FORM_FIELD_TYPES,
  DEFAULT_FORM_THEME,
  DEFAULT_FORM_BRANDING,
  DEFAULT_FORM_SETTINGS,
  DEFAULT_ANALYTICS_SETTINGS,
} from '../types/forms';

export interface UseFormBuilderStateOptions {
  initialForm?: Form;
  initialFields?: FormField[];
}

export interface UseFormBuilderStateResult {
  state: FormBuilderState;
  setState: React.Dispatch<React.SetStateAction<FormBuilderState>>;
  selectedField: FormField | null;
  
  // Form mutations
  updateForm: (updates: Partial<Form>) => void;
  
  // Field mutations
  addField: (type: FormFieldType) => void;
  updateField: (id: string, updates: Partial<FormField>) => void;
  deleteField: (id: string) => void;
  duplicateField: (id: string) => void;
  selectField: (id: string | null) => void;
  reorderFields: (oldIndex: number, newIndex: number) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Dirty state
  markClean: () => void;
}

/**
 * useFormBuilderState - Manages FormBuilder state with undo/redo support
 * 
 * Note: The undo/redo stacks only track field changes (not form metadata)
 * due to the FormBuilderState type constraints.
 * 
 * @param options - Initial form and fields
 * @returns State and mutation functions
 */
export function useFormBuilderState(options: UseFormBuilderStateOptions = {}): UseFormBuilderStateResult {
  const { initialForm, initialFields = [] } = options;

  const [state, setState] = useState<FormBuilderState>({
    form: initialForm || {
      name: 'Untitled Form',
      description: '',
      settings: DEFAULT_FORM_SETTINGS,
      theme: DEFAULT_FORM_THEME,
      branding: DEFAULT_FORM_BRANDING,
      analytics_settings: DEFAULT_ANALYTICS_SETTINGS,
      visibility: 'public',
      status: 'draft',
    },
    fields: initialFields,
    selectedFieldId: null,
    isDirty: false,
    isPreviewMode: false,
    activeTab: 'fields',
    undoStack: [],
    redoStack: [],
  });

  const selectedField = state.fields.find(f => f.id === state.selectedFieldId) || null;

  // Helper to save current fields to undo stack
  const pushUndoState = useCallback(() => {
    setState(prev => ({
      ...prev,
      undoStack: [...prev.undoStack.slice(-19), [...prev.fields]],
      redoStack: [],
    }));
  }, []);

  // Update form properties
  const updateForm = useCallback((updates: Partial<Form>) => {
    setState(prev => ({
      ...prev,
      form: { ...prev.form, ...updates },
      isDirty: true,
    }));
  }, []);

  // Add a new field
  const addField = useCallback((type: FormFieldType) => {
    pushUndoState();
    const fieldDef = FORM_FIELD_TYPES.find(ft => ft.type === type);
    const hasOptions = ['select', 'radio', 'checkbox', 'multi_select'].includes(type);
    const newField: FormField = {
      id: uuidv4(),
      form_id: state.form.id || '',
      type,
      label: fieldDef?.label || 'New Field',
      required: false,
      validation_rules: {},
      position: state.fields.length,
      options: hasOptions ? [
        { id: uuidv4(), label: 'Option 1', value: 'option_1' },
        { id: uuidv4(), label: 'Option 2', value: 'option_2' },
      ] : undefined,
    };
    
    setState(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
      selectedFieldId: newField.id,
      isDirty: true,
    }));
  }, [pushUndoState, state.form.id, state.fields.length]);

  // Update a field
  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    pushUndoState();
    setState(prev => ({
      ...prev,
      fields: prev.fields.map(f => 
        f.id === id ? { ...f, ...updates } : f
      ),
      isDirty: true,
    }));
  }, [pushUndoState]);

  // Delete a field
  const deleteField = useCallback((id: string) => {
    pushUndoState();
    setState(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id),
      selectedFieldId: prev.selectedFieldId === id ? null : prev.selectedFieldId,
      isDirty: true,
    }));
  }, [pushUndoState]);

  // Duplicate a field
  const duplicateField = useCallback((id: string) => {
    pushUndoState();
    setState(prev => {
      const fieldToDuplicate = prev.fields.find(f => f.id === id);
      if (!fieldToDuplicate) return prev;

      const newField: FormField = {
        ...fieldToDuplicate,
        id: uuidv4(),
        label: `${fieldToDuplicate.label} (Copy)`,
        position: prev.fields.length,
        options: fieldToDuplicate.options?.map(opt => ({
          ...opt,
          id: uuidv4(),
        })),
      };

      return {
        ...prev,
        fields: [...prev.fields, newField],
        selectedFieldId: newField.id,
        isDirty: true,
      };
    });
  }, [pushUndoState]);

  // Select a field
  const selectField = useCallback((id: string | null) => {
    setState(prev => ({
      ...prev,
      selectedFieldId: id,
    }));
  }, []);

  // Reorder fields (for drag-and-drop)
  const reorderFields = useCallback((oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    
    pushUndoState();
    setState(prev => {
      const newFields = [...prev.fields];
      const [movedField] = newFields.splice(oldIndex, 1);
      newFields.splice(newIndex, 0, movedField);
      
      return {
        ...prev,
        fields: newFields,
        isDirty: true,
      };
    });
  }, [pushUndoState]);

  // Undo
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      
      const lastFields = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        fields: lastFields,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, [...prev.fields]],
        isDirty: true,
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      
      const nextFields = prev.redoStack[prev.redoStack.length - 1];
      return {
        ...prev,
        fields: nextFields,
        undoStack: [...prev.undoStack, [...prev.fields]],
        redoStack: prev.redoStack.slice(0, -1),
        isDirty: true,
      };
    });
  }, []);

  // Mark as clean (after save)
  const markClean = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDirty: false,
    }));
  }, []);

  return {
    state,
    setState,
    selectedField,
    updateForm,
    addField,
    updateField,
    deleteField,
    duplicateField,
    selectField,
    reorderFields,
    undo,
    redo,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    markClean,
  };
}

export default useFormBuilderState;
