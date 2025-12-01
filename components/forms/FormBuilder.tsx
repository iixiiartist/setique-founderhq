import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { withRetry } from '../../lib/utils/retry';
import { FormFieldToolbox } from './FormFieldToolbox';
import { FormPreview } from './FormPreview';
import { FormFieldEditor } from './FormFieldEditor';
import { FormSettingsPanel } from './FormSettingsPanel';
import { FormDesignPanel } from './FormDesignPanel';
import { FormIntegrationsPanel } from './FormIntegrationsPanel';
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
} from '../../types/forms';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// CRM and Campaign types
interface Contact {
  id: string;
  name: string;
  email?: string;
  type: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  channel?: string;
}

interface FormBuilderProps {
  form?: Form;
  workspaceId: string;
  onSave: (form: Partial<Form>, fields: Partial<FormField>[]) => Promise<void>;
  onBack: () => void;
}

// Form type for internal use (supports form, survey, poll)
type FormType = 'form' | 'survey' | 'poll' | 'quiz' | 'feedback';

// Sortable Field Component
const SortableField: React.FC<{
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
}> = ({ field, isSelected, onSelect, onDelete, onDuplicate, onUpdate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldMeta = FORM_FIELD_TYPES.find(f => f.type === field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-2 ${isSelected ? 'border-yellow-400' : 'border-gray-200'} bg-white p-4 transition-colors hover:border-gray-400`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono font-semibold text-gray-500">{fieldMeta?.label}</span>
            {field.required && <Badge variant="warning" size="sm">Required</Badge>}
          </div>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full bg-transparent border-none text-lg font-semibold text-black focus:outline-none focus:ring-0"
            placeholder="Field label"
            onClick={(e) => e.stopPropagation()}
          />
          {field.description && (
            <p className="text-sm text-gray-500 mt-1">{field.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-2 hover:bg-gray-100 rounded"
            title="Duplicate"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 hover:bg-red-100 rounded text-red-600"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Field-specific preview */}
      <div className="mt-3 pl-8">
        {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number') && (
          <Input placeholder={field.placeholder || 'Enter text...'} disabled className="bg-gray-50" />
        )}
        {field.type === 'textarea' && (
          <textarea
            placeholder={field.placeholder || 'Enter text...'}
            disabled
            className="w-full p-2 border-2 border-gray-200 bg-gray-50 resize-none"
            rows={3}
          />
        )}
        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox' || field.type === 'multi_select') && field.options && (
          <div className="space-y-1">
            {field.options.slice(0, 3).map(opt => (
              <div key={opt.id} className="flex items-center gap-2 text-sm text-gray-500">
                {field.type === 'checkbox' || field.type === 'multi_select' ? '☐' : field.type === 'select' ? '▾' : '○'} {opt.label}
              </div>
            ))}
            {field.options.length > 3 && (
              <p className="text-xs text-gray-400">+{field.options.length - 3} more</p>
            )}
          </div>
        )}
        {field.type === 'date' && (
          <input type="date" disabled className="w-full p-2 border-2 border-gray-200 bg-gray-50" />
        )}
        {field.type === 'time' && (
          <input type="time" disabled className="w-full p-2 border-2 border-gray-200 bg-gray-50" />
        )}
        {field.type === 'datetime' && (
          <input type="datetime-local" disabled className="w-full p-2 border-2 border-gray-200 bg-gray-50" />
        )}
        {field.type === 'rating' && (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} className="text-2xl text-gray-300">★</span>
            ))}
          </div>
        )}
        {field.type === 'nps' && (
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <span key={n} className="w-6 h-6 text-center text-xs bg-gray-100 border border-gray-200 rounded">
                {n}
              </span>
            ))}
          </div>
        )}
        {field.type === 'scale' && (
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-400">1</span>
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <span key={n} className="w-8 h-8 text-center text-xs bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                {n}
              </span>
            ))}
            <span className="text-xs text-gray-400">7</span>
          </div>
        )}
        {field.type === 'file' && (
          <div className="border-2 border-dashed border-gray-300 p-4 text-center bg-gray-50">
            <span className="text-gray-400">📤 File upload</span>
          </div>
        )}
        {field.type === 'signature' && (
          <div className="border-2 border-gray-300 p-4 text-center bg-gray-50 h-20">
            <span className="text-gray-400">✍️ Signature pad</span>
          </div>
        )}
        {field.type === 'address' && (
          <div className="space-y-2">
            <Input placeholder="Street address" disabled className="bg-gray-50" />
            <div className="flex gap-2">
              <Input placeholder="City" disabled className="bg-gray-50 flex-1" />
              <Input placeholder="State" disabled className="bg-gray-50 w-24" />
              <Input placeholder="ZIP" disabled className="bg-gray-50 w-24" />
            </div>
          </div>
        )}
        {field.type === 'multi_select' && field.options && (
          <div className="flex flex-wrap gap-1">
            {field.options.slice(0, 4).map(opt => (
              <span key={opt.id} className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded">
                {opt.label}
              </span>
            ))}
            {field.options.length > 4 && (
              <span className="px-2 py-1 text-xs text-gray-400">+{field.options.length - 4} more</span>
            )}
          </div>
        )}
        {field.type === 'image' && (
          <div className="border-2 border-dashed border-gray-300 p-4 text-center bg-gray-50">
            <span className="text-gray-400">🖼️ Image block</span>
          </div>
        )}
        {field.type === 'heading' && (
          <div className="text-lg font-bold text-gray-400">[Heading Element]</div>
        )}
        {field.type === 'paragraph' && (
          <div className="text-sm text-gray-400 italic">{field.description || '[Paragraph text]'}</div>
        )}
        {field.type === 'divider' && (
          <hr className="border-2 border-gray-300" />
        )}
      </div>
    </div>
  );
};

export const FormBuilder: React.FC<FormBuilderProps> = ({
  form,
  workspaceId,
  onSave,
  onBack,
}) => {
  // Builder state
  const [state, setState] = useState<FormBuilderState>({
    form: form || {
      name: 'Untitled Form',
      description: '',
      settings: DEFAULT_FORM_SETTINGS,
      theme: DEFAULT_FORM_THEME,
      branding: DEFAULT_FORM_BRANDING,
      analytics_settings: DEFAULT_ANALYTICS_SETTINGS,
      visibility: 'public',
      status: 'draft',
    },
    fields: form?.fields || [],
    selectedFieldId: null,
    isDirty: false,
    isPreviewMode: false,
    activeTab: 'fields',
    undoStack: [],
    redoStack: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showFieldPanel, setShowFieldPanel] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'fields' | 'design' | 'settings' | 'integrations'>('fields');
  
  // Form type state
  const [formType, setFormType] = useState<FormType>((form as any)?.type || 'form');
  
  // CRM and Campaign state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>((form as any)?.linked_contact_id || '');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>((form as any)?.default_campaign_id || '');
  const [autoCreateContact, setAutoCreateContact] = useState<boolean>((form as any)?.auto_create_contact || false);
  const [defaultCrmType, setDefaultCrmType] = useState<string>((form as any)?.default_crm_type || 'customer');
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  
  // Autosave refs
  const autosaveDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoSavingRef = React.useRef(false);
  const AUTOSAVE_DEBOUNCE_MS = 3000; // 3 seconds after last change
  const AUTOSAVE_INTERVAL_MS = 60000; // 60 second backup interval
  
  // Beforeunload guard for unsaved changes - prevents accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes to this form. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);
  
  // Autosave function - silent save without UI blocking
  const performAutosave = useCallback(async () => {
    if (isAutoSavingRef.current || !state.isDirty || !form?.id) return;
    
    isAutoSavingRef.current = true;
    try {
      const formWithIntegrations = {
        ...state.form,
        type: formType,
        default_campaign_id: selectedCampaignId || null,
        auto_create_contact: autoCreateContact,
        default_crm_type: defaultCrmType,
      };
      
      // Use retry wrapper for autosave - 2 attempts with short delays
      await withRetry(
        () => onSave(formWithIntegrations, state.fields),
        {
          maxAttempts: 2,
          initialDelayMs: 500,
          maxDelayMs: 2000,
          onRetry: (attempt, err) => {
            console.log('[FormBuilder] Autosave retry attempt', attempt, err);
          },
        }
      );
      
      setState(prev => ({ ...prev, isDirty: false }));
      setLastAutoSaved(new Date());
      console.log('[FormBuilder] Autosave completed');
    } catch (error) {
      console.warn('[FormBuilder] Autosave failed (after retries):', error);
    } finally {
      isAutoSavingRef.current = false;
    }
  }, [state.isDirty, state.form, state.fields, form?.id, formType, selectedCampaignId, autoCreateContact, defaultCrmType, onSave]);
  
  // Autosave effect - debounced save on changes + periodic backup
  useEffect(() => {
    // Only autosave existing forms (not new unsaved forms)
    if (!form?.id) return;
    
    // Debounced autosave after changes
    if (state.isDirty) {
      if (autosaveDebounceRef.current) {
        clearTimeout(autosaveDebounceRef.current);
      }
      autosaveDebounceRef.current = setTimeout(() => {
        performAutosave();
      }, AUTOSAVE_DEBOUNCE_MS);
    }
    
    // Periodic backup interval
    if (!autosaveIntervalRef.current) {
      autosaveIntervalRef.current = setInterval(() => {
        if (state.isDirty) {
          performAutosave();
        }
      }, AUTOSAVE_INTERVAL_MS);
    }
    
    return () => {
      if (autosaveDebounceRef.current) {
        clearTimeout(autosaveDebounceRef.current);
        autosaveDebounceRef.current = null;
      }
    };
  }, [state.isDirty, form?.id, performAutosave]);
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
        autosaveIntervalRef.current = null;
      }
      // Final save attempt on unmount if dirty
      if (state.isDirty && form?.id) {
        performAutosave();
      }
    };
  }, []);
  
  // Load contacts and campaigns for integrations
  useEffect(() => {
    if (activePanel === 'integrations' && workspaceId) {
      loadIntegrationData();
    }
  }, [activePanel, workspaceId]);
  
  const loadIntegrationData = async () => {
    setLoadingIntegrations(true);
    try {
      // Load contacts
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, name, email, type')
        .eq('workspace_id', workspaceId)
        .order('name')
        .limit(100);
      
      if (contactsData) {
        setContacts(contactsData);
      }
      
      // Load campaigns
      const { data: campaignsData } = await supabase
        .from('marketing_campaigns')
        .select('id, name, status, channel')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (campaignsData) {
        setCampaigns(campaignsData);
      }
    } catch (error) {
      console.error('Error loading integration data:', error);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  // Handle logo upload to Supabase storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPG, SVG, or WebP)');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }
    
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${workspaceId}/logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('form-assets')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });
      
      if (error) {
        console.error('Upload error:', error);
        // Fallback: use URL input if storage isn't configured
        alert('Logo upload requires storage configuration. Please use a URL instead.');
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('form-assets')
        .getPublicUrl(fileName);
      
      if (urlData?.publicUrl) {
        updateForm({ 
          branding: { 
            ...DEFAULT_FORM_BRANDING,
            ...state.form.branding, 
            logoUrl: urlData.publicUrl 
          } 
        });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try using a URL instead.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Save to undo stack before changes
  const saveToHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      undoStack: [...prev.undoStack.slice(-20), prev.fields],
      redoStack: [],
    }));
  }, []);

  // Add new field
  const addField = useCallback((type: FormFieldType) => {
    saveToHistory();
    const fieldMeta = FORM_FIELD_TYPES.find(f => f.type === type);
    const newField: FormField = {
      id: uuidv4(),
      form_id: form?.id || '',
      type,
      label: fieldMeta?.label || 'New Field',
      placeholder: '',
      required: false,
      validation_rules: {},
      position: state.fields.length,
      options: (type === 'select' || type === 'radio' || type === 'checkbox' || type === 'multi_select') ? [
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
  }, [saveToHistory, state.fields.length, form?.id]);

  // Update field
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setState(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
      isDirty: true,
    }));
  }, []);

  // Delete field
  const deleteField = useCallback((fieldId: string) => {
    saveToHistory();
    setState(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
      selectedFieldId: prev.selectedFieldId === fieldId ? null : prev.selectedFieldId,
      isDirty: true,
    }));
  }, [saveToHistory]);

  // Duplicate field
  const duplicateField = useCallback((fieldId: string) => {
    saveToHistory();
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;

    const newField: FormField = {
      ...field,
      id: uuidv4(),
      label: `${field.label} (Copy)`,
      position: state.fields.length,
    };

    setState(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
      selectedFieldId: newField.id,
      isDirty: true,
    }));
  }, [saveToHistory, state.fields]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      saveToHistory();
      setState(prev => {
        const oldIndex = prev.fields.findIndex(f => f.id === active.id);
        const newIndex = prev.fields.findIndex(f => f.id === over.id);
        return {
          ...prev,
          fields: arrayMove(prev.fields, oldIndex, newIndex),
          isDirty: true,
        };
      });
    }
  };

  // Update form metadata
  const updateForm = useCallback((updates: Partial<Form>) => {
    setState(prev => ({
      ...prev,
      form: { ...prev.form, ...updates },
      isDirty: true,
    }));
  }, []);

  // Save form
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Include integration data in form save
      const formWithIntegrations = {
        ...state.form,
        type: formType,
        default_campaign_id: selectedCampaignId || null,
        auto_create_contact: autoCreateContact,
        default_crm_type: defaultCrmType,
      };
      await onSave(formWithIntegrations, state.fields);
      setState(prev => ({ ...prev, isDirty: false }));
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Validation state for publish errors
  const [publishErrors, setPublishErrors] = React.useState<string[]>([]);

  // Validate form before publishing
  const validateForPublish = (): string[] => {
    const errors: string[] = [];
    
    // Check form has a name
    if (!state.form.name || state.form.name.trim() === '' || state.form.name === 'Untitled Form') {
      errors.push('Form must have a name before publishing.');
    }
    
    // Check form has at least one field
    if (state.fields.length === 0) {
      errors.push('Form must have at least one field.');
    }
    
    // Check that required fields have labels
    const fieldsWithoutLabels = state.fields.filter(f => !f.label || f.label.trim() === '');
    if (fieldsWithoutLabels.length > 0) {
      errors.push(`${fieldsWithoutLabels.length} field(s) are missing labels.`);
    }
    
    // Check slug is set (if form has an ID/has been saved)
    if (form?.id && (!state.form.slug || state.form.slug.trim() === '')) {
      errors.push('Form needs a URL slug. Save the form first to generate one.');
    }
    
    // Validate captcha settings if enabled
    if (state.form.settings?.captchaEnabled) {
      const captchaType = state.form.settings.captchaType;
      if (!captchaType || captchaType === 'none') {
        errors.push('Captcha is enabled but no captcha provider is selected.');
      }
    }
    
    // Check that email fields have valid patterns (if any)
    const emailFields = state.fields.filter(f => f.type === 'email');
    // Email validation is handled by browser, so just ensure they exist if marked required
    
    // Note: File upload validation is handled server-side via the form settings
    // Client-side mime validation is in formService.ts
    
    return errors;
  };

  // Publish form with validation
  const handlePublish = async () => {
    // Run validation first
    const errors = validateForPublish();
    setPublishErrors(errors);
    
    if (errors.length > 0) {
      // Show errors to user - don't proceed with publish
      return;
    }
    
    setIsSaving(true);
    try {
      const formWithIntegrations = {
        ...state.form,
        type: formType,
        status: 'published' as const,
        default_campaign_id: selectedCampaignId || null,
        auto_create_contact: autoCreateContact,
        default_crm_type: defaultCrmType,
        visibility: 'public' as const,
      };
      await onSave(formWithIntegrations, state.fields);
      setState(prev => ({ 
        ...prev, 
        form: { ...prev.form, status: 'published', visibility: 'public' },
        isDirty: false 
      }));
      setPublishErrors([]); // Clear errors on success
    } catch (error) {
      console.error('Error publishing form:', error);
      setPublishErrors(['Failed to publish form. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  // Undo/Redo
  const handleUndo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      const lastState = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        fields: lastState,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [prev.fields, ...prev.redoStack],
        isDirty: true,
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      const nextState = prev.redoStack[0];
      return {
        ...prev,
        fields: nextState,
        undoStack: [...prev.undoStack, prev.fields],
        redoStack: prev.redoStack.slice(1),
        isDirty: true,
      };
    });
  }, []);

  // Selected field
  const selectedField = state.fields.find(f => f.id === state.selectedFieldId);

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header */}
      <div className="flex-shrink-0 border-b-2 border-black bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            
            {/* Form Type Selector */}
            <Select
              options={[
                { value: 'form', label: '📝 Form' },
                { value: 'survey', label: '📊 Survey' },
                { value: 'poll', label: '📈 Poll' },
                { value: 'quiz', label: '❓ Quiz' },
                { value: 'feedback', label: '💬 Feedback' },
              ]}
              value={formType}
              onChange={(e) => {
                setFormType(e.target.value as FormType);
                setState(prev => ({ ...prev, isDirty: true }));
              }}
              fullWidth={false}
            />
            
            <div className="flex items-center gap-2">
              <input
                value={state.form.name || ''}
                onChange={(e) => updateForm({ name: e.target.value })}
                className="bg-transparent border-none text-lg font-bold focus:outline-none focus:ring-0 min-w-[200px]"
                placeholder={`${formType.charAt(0).toUpperCase() + formType.slice(1)} Name`}
              />
              <Badge variant={state.form.status === 'published' ? 'success' : 'warning'} size="sm">
                {state.form.status || 'draft'}
              </Badge>
              {state.isDirty ? (
                <span title="Changes will be auto-saved">
                  <Badge variant="info" size="sm">Unsaved</Badge>
                </span>
              ) : lastAutoSaved ? (
                <span className="text-xs text-gray-500" title={`Last saved: ${lastAutoSaved.toLocaleTimeString()}`}>
                  ✓ Saved
                </span>
              ) : null}
              {/* Share link for published forms */}
              {state.form.status === 'published' && state.form.slug && (
                <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs">
                  <span className="text-green-700">🔗</span>
                  <code className="text-green-800 font-mono max-w-[150px] truncate">
                    /forms/{state.form.slug}
                  </code>
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/forms/${state.form.slug}`;
                      await navigator.clipboard.writeText(url);
                      alert('Link copied to clipboard!');
                    }}
                    className="ml-1 p-0.5 hover:bg-green-200 rounded"
                    title="Copy link"
                  >
                    📋
                  </button>
                  <a
                    href={`/forms/${state.form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 p-0.5 hover:bg-green-200 rounded"
                    title="Open in new tab"
                  >
                    ↗️
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={state.undoStack.length === 0}
            >
              ↩️
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={state.redoStack.length === 0}
            >
              ↪️
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, isPreviewMode: !prev.isPreviewMode }))}
            >
              👁️ Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              loading={isSaving}
            >
              💾 Save
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePublish}
              disabled={isSaving || state.fields.length === 0}
              loading={isSaving}
            >
              🌐 Publish
            </Button>
          </div>
        </div>
        
        {/* Publish Validation Errors */}
        {publishErrors.length > 0 && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-800 mb-1">Cannot publish form:</p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {publishErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
              <button 
                onClick={() => setPublishErrors([])}
                className="ml-auto text-red-500 hover:text-red-700"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - Field Types */}
        <FormFieldToolbox onAddField={addField} />

        {/* Center - Form Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {state.isPreviewMode ? (
            <FormPreview
              form={state.form}
              fields={state.fields}
              onClosePreview={() => setState(prev => ({ ...prev, isPreviewMode: false }))}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-2xl mx-auto">
                {/* Form Header */}
                <div className="mb-8 bg-white border-2 border-black p-6 shadow-neo">
                  <input
                    value={state.form.name || ''}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 mb-2"
                    placeholder="Form Title"
                  />
                  <textarea
                    value={state.form.description || ''}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-600"
                    placeholder="Add a description..."
                    rows={2}
                  />
                </div>

                {/* Form Fields */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={state.fields.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {state.fields.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-400 bg-white p-12 text-center">
                          <span className="text-5xl mb-4 block">📝</span>
                          <h3 className="text-lg font-bold text-black mb-2">
                            Start building your form
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Click on field types in the left panel or drag and drop to add fields
                          </p>
                          <Button variant="primary" onClick={() => addField('text')}>
                            + Add First Field
                          </Button>
                        </div>
                      ) : (
                        state.fields.map((field) => (
                          <SortableField
                            key={field.id}
                            field={field}
                            isSelected={field.id === state.selectedFieldId}
                            onSelect={() => setState(prev => ({ ...prev, selectedFieldId: field.id }))}
                            onDelete={() => deleteField(field.id)}
                            onDuplicate={() => duplicateField(field.id)}
                            onUpdate={(updates) => updateField(field.id, updates)}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>

                  <DragOverlay>
                    {activeId ? (
                      <div className="bg-white border-2 border-black p-4 shadow-neo opacity-80">
                        <div className="flex items-center gap-2">
                          <span>☰</span>
                          <span>{state.fields.find(f => f.id === activeId)?.label}</span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>

                {/* Add Field Button */}
                {state.fields.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <Button variant="ghost" size="sm" onClick={() => addField('text')}>
                      + Add Field
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Field Settings */}
        <div className="w-80 flex-shrink-0 border-l-2 border-black bg-white overflow-y-auto">
          {/* Panel Tabs */}
          <div className="border-b-2 border-black flex flex-wrap">
            {(['fields', 'design', 'settings', 'integrations'] as const).map(panel => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`flex-1 px-2 py-2 text-xs font-mono font-semibold transition-colors ${
                  activePanel === panel
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {panel === 'fields' ? '⚙️' : panel === 'design' ? '🎨' : panel === 'settings' ? '⚡' : '🔗'}
                <span className="hidden sm:inline ml-1">
                  {panel === 'fields' ? 'Field' : panel === 'design' ? 'Design' : panel === 'settings' ? 'Settings' : 'CRM'}
                </span>
              </button>
            ))}
          </div>

          <div className="p-4">
            {activePanel === 'fields' && (
              <FormFieldEditor
                selectedField={selectedField}
                onUpdateField={updateField}
                onDeleteField={deleteField}
              />
            )}

            {activePanel === 'design' && (
              <FormDesignPanel
                form={state.form}
                onUpdateForm={updateForm}
                onLogoUpload={handleLogoUpload}
                uploadingLogo={uploadingLogo}
              />
            )}

            {activePanel === 'settings' && (
              <FormSettingsPanel
                form={state.form}
                onUpdateForm={updateForm}
              />
            )}

            {/* Integrations Panel - CRM & Campaign Linking */}
            {activePanel === 'integrations' && (
              <FormIntegrationsPanel
                form={state.form}
                onUpdateForm={updateForm}
                campaigns={campaigns}
                selectedCampaignId={selectedCampaignId}
                onCampaignChange={setSelectedCampaignId}
                autoCreateContact={autoCreateContact}
                onAutoCreateContactChange={setAutoCreateContact}
                defaultCrmType={defaultCrmType}
                onDefaultCrmTypeChange={setDefaultCrmType}
                loadingIntegrations={loadingIntegrations}
                onMarkDirty={() => setState(prev => ({ ...prev, isDirty: true }))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
