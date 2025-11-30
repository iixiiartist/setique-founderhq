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
import { Checkbox } from '../ui/Checkbox';
import { Upload } from 'lucide-react';
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

// CRM field mapping options
const CRM_FIELD_MAPPINGS = [
  { value: '', label: 'No mapping' },
  { value: 'name', label: 'Contact Name' },
  { value: 'email', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'company', label: 'Company Name' },
  { value: 'title', label: 'Job Title' },
  { value: 'website', label: 'Website' },
  { value: 'notes', label: 'Notes' },
];

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

  // Publish form
  const handlePublish = async () => {
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
    } catch (error) {
      console.error('Error publishing form:', error);
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
              {state.isDirty && (
                <Badge variant="info" size="sm">Unsaved</Badge>
              )}
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - Field Types */}
        <div className="w-64 flex-shrink-0 border-r-2 border-black bg-white overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-mono font-bold text-black mb-3 uppercase tracking-wider">Add Fields</h3>
            
            {(['input', 'choice', 'advanced', 'layout'] as const).map(category => (
              <div key={category} className="mb-4">
                <p className="text-xs font-mono text-gray-500 uppercase mb-2">
                  {category === 'input' ? 'Input Fields' :
                   category === 'choice' ? 'Choice Fields' :
                   category === 'advanced' ? 'Advanced' : 'Layout'}
                </p>
                <div className="space-y-1">
                  {FORM_FIELD_TYPES.filter(f => f.category === category).map(fieldType => (
                    <button
                      key={fieldType.type}
                      onClick={() => addField(fieldType.type)}
                      className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-yellow-100 hover:text-black transition-colors text-left border border-transparent hover:border-black"
                      title={fieldType.description}
                    >
                      <span className="text-base">{
                        fieldType.icon === 'Type' ? '✏️' :
                        fieldType.icon === 'Mail' ? '📧' :
                        fieldType.icon === 'Phone' ? '📱' :
                        fieldType.icon === 'Hash' ? '#️⃣' :
                        fieldType.icon === 'AlignLeft' ? '📝' :
                        fieldType.icon === 'ChevronDown' ? '⬇️' :
                        fieldType.icon === 'ListChecks' ? '☑️' :
                        fieldType.icon === 'Circle' ? '🔘' :
                        fieldType.icon === 'CheckSquare' ? '✅' :
                        fieldType.icon === 'Calendar' ? '📅' :
                        fieldType.icon === 'Clock' ? '🕐' :
                        fieldType.icon === 'Upload' ? '📤' :
                        fieldType.icon === 'Star' ? '⭐' :
                        fieldType.icon === 'BarChart2' ? '📊' :
                        fieldType.icon === 'Heading' ? '🔠' :
                        fieldType.icon === 'FileText' ? '📄' :
                        fieldType.icon === 'Minus' ? '➖' :
                        fieldType.icon === 'Image' ? '🖼️' :
                        '📋'
                      }</span>
                      <span className="truncate">{fieldType.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Form Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {state.isPreviewMode ? (
            <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: state.form.theme?.backgroundColor || '#F3F4F6' }}>
              <div 
                className="max-w-2xl mx-auto bg-white border-2 border-black shadow-neo p-8"
                style={{ 
                  fontFamily: state.form.theme?.fontFamily || 'Inter, system-ui, sans-serif',
                  borderRadius: state.form.theme?.borderRadius || '8px',
                }}
              >
                {/* Logo */}
                {state.form.branding?.logoUrl && state.form.branding?.logoPosition !== 'hidden' && (
                  <div className={`mb-6 ${
                    state.form.branding.logoPosition === 'center' ? 'text-center' : 
                    state.form.branding.logoPosition === 'right' ? 'text-right' : 'text-left'
                  }`}>
                    <img
                      src={state.form.branding.logoUrl}
                      alt="Logo"
                      className={`inline-block ${
                        state.form.branding.logoSize === 'small' ? 'h-8' : 
                        state.form.branding.logoSize === 'large' ? 'h-16' : 'h-12'
                      }`}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                
                {/* Progress Bar */}
                {state.form.settings?.showProgressBar && (
                  <div className="mb-6">
                    <div className="h-2 bg-gray-200 border border-gray-300" style={{ borderRadius: state.form.theme?.borderRadius || '8px' }}>
                      <div
                        className="h-full transition-all duration-300"
                        style={{ 
                          width: '33%', 
                          backgroundColor: state.form.theme?.primaryColor || '#8B5CF6',
                          borderRadius: state.form.theme?.borderRadius || '8px',
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <h1 
                  className="text-3xl font-bold mb-2"
                  style={{ color: state.form.theme?.textColor || '#1F2937' }}
                >
                  {state.form.name}
                </h1>
                {state.form.description && (
                  <p 
                    className="mb-6"
                    style={{ color: state.form.theme?.textColor || '#6B7280', opacity: 0.7 }}
                  >
                    {state.form.description}
                  </p>
                )}
                <div className={`space-y-${state.form.theme?.spacing === 'compact' ? '4' : state.form.theme?.spacing === 'relaxed' ? '8' : '6'}`}>
                  {state.fields.map((field, index) => (
                    <div key={field.id} className="space-y-2">
                      {field.type === 'heading' ? (
                        <h2 
                          className="text-xl font-bold mt-4"
                          style={{ color: state.form.theme?.textColor || '#1F2937' }}
                        >
                          {field.label}
                        </h2>
                      ) : field.type === 'paragraph' ? (
                        <p style={{ color: state.form.theme?.textColor || '#6B7280' }}>
                          {field.description || field.label}
                        </p>
                      ) : field.type === 'divider' ? (
                        <hr className="border-2 border-gray-200 my-4" />
                      ) : (
                        <>
                          <label 
                            className="block font-mono text-sm font-semibold"
                            style={{ color: state.form.theme?.textColor || '#1F2937' }}
                          >
                            {state.form.settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: state.form.theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          
                          {/* Text inputs */}
                          {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number') && (
                            <input
                              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
                              placeholder={field.placeholder || ''}
                              className="w-full p-3 border-2"
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                                backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                              }}
                            />
                          )}
                          
                          {/* Textarea */}
                          {field.type === 'textarea' && (
                            <textarea
                              placeholder={field.placeholder || ''}
                              className="w-full p-3 border-2"
                              rows={4}
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                                backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                              }}
                            />
                          )}
                          
                          {/* Select dropdown */}
                          {field.type === 'select' && (
                            <select
                              className="w-full p-3 border-2"
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                                backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                              }}
                            >
                              <option value="">{field.placeholder || 'Select...'}</option>
                              {field.options?.map(opt => (
                                <option key={opt.id} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          )}
                          
                          {/* Radio buttons */}
                          {field.type === 'radio' && (
                            <div className="space-y-2">
                              {field.options?.map(opt => (
                                <label
                                  key={opt.id}
                                  className="flex items-center gap-3 p-3 border-2 cursor-pointer transition-colors hover:border-gray-400"
                                  style={{ 
                                    borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                    borderRadius: state.form.theme?.borderRadius || '8px',
                                  }}
                                >
                                  <input type="radio" name={field.id} value={opt.value} className="w-4 h-4" />
                                  <span style={{ color: state.form.theme?.textColor || '#1F2937' }}>{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {/* Checkboxes */}
                          {field.type === 'checkbox' && (
                            <div className="space-y-2">
                              {field.options?.map(opt => (
                                <label
                                  key={opt.id}
                                  className="flex items-center gap-3 p-3 border-2 cursor-pointer transition-colors hover:border-gray-400"
                                  style={{ 
                                    borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                    borderRadius: state.form.theme?.borderRadius || '8px',
                                  }}
                                >
                                  <input type="checkbox" value={opt.value} className="w-4 h-4" />
                                  <span style={{ color: state.form.theme?.textColor || '#1F2937' }}>{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {/* Date */}
                          {field.type === 'date' && (
                            <input
                              type="date"
                              className="w-full p-3 border-2"
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                                backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                              }}
                            />
                          )}
                          
                          {/* Time */}
                          {field.type === 'time' && (
                            <input
                              type="time"
                              className="w-full p-3 border-2"
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                                backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                              }}
                            />
                          )}
                          
                          {/* DateTime */}
                          {field.type === 'datetime' && (
                            <input
                              type="datetime-local"
                              className="w-full p-3 border-2"
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                                backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                              }}
                            />
                          )}
                          
                          {/* Rating (Stars) */}
                          {field.type === 'rating' && (
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map(n => (
                                <button
                                  key={n}
                                  type="button"
                                  className="text-3xl hover:scale-110 transition-transform"
                                  style={{ color: state.form.theme?.primaryColor || '#8B5CF6' }}
                                >
                                  ☆
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* NPS */}
                          {field.type === 'nps' && (
                            <div>
                              <div className="flex gap-1 flex-wrap">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                  <button
                                    key={n}
                                    type="button"
                                    className="w-10 h-10 border-2 flex items-center justify-center text-sm transition-all hover:border-gray-400"
                                    style={{ 
                                      borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                      borderRadius: state.form.theme?.borderRadius || '8px',
                                      backgroundColor: n <= 6 ? '#FEF2F2' : n <= 8 ? '#FEF9C3' : '#DCFCE7',
                                    }}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                              <div className="flex justify-between mt-2 text-xs" style={{ color: state.form.theme?.textColor || '#6B7280', opacity: 0.6 }}>
                                <span>Not likely at all</span>
                                <span>Extremely likely</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Scale (e.g., 1-7) */}
                          {field.type === 'scale' && (
                            <div>
                              <div className="flex gap-2 items-center justify-between">
                                <span className="text-sm" style={{ color: state.form.theme?.textColor || '#6B7280' }}>
                                  {(field as any).scale_min_label || 'Strongly Disagree'}
                                </span>
                                <div className="flex gap-1">
                                  {Array.from({ length: (field as any).scale_max || 7 }, (_, i) => i + 1).map(n => (
                                    <button
                                      key={n}
                                      type="button"
                                      className="w-10 h-10 border-2 flex items-center justify-center text-sm transition-all hover:border-gray-400"
                                      style={{ 
                                        borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                        borderRadius: state.form.theme?.borderRadius || '8px',
                                      }}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                                <span className="text-sm" style={{ color: state.form.theme?.textColor || '#6B7280' }}>
                                  {(field as any).scale_max_label || 'Strongly Agree'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* File Upload */}
                          {field.type === 'file' && (
                            <div 
                              className="border-2 border-dashed p-8 text-center"
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                              }}
                            >
                              <span className="text-4xl block mb-2">📤</span>
                              <p style={{ color: state.form.theme?.textColor || '#6B7280' }}>
                                Drag & drop or click to upload
                              </p>
                            </div>
                          )}
                          
                          {/* Signature */}
                          {field.type === 'signature' && (
                            <div 
                              className="border-2 p-4 text-center h-32 flex items-center justify-center"
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                                backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                              }}
                            >
                              <div>
                                <span className="text-3xl block mb-2">✍️</span>
                                <p className="text-sm" style={{ color: state.form.theme?.textColor || '#6B7280' }}>
                                  Click or tap to sign
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Address */}
                          {field.type === 'address' && (
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Street Address"
                                className="w-full p-3 border-2"
                                style={{ 
                                  borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                  borderRadius: state.form.theme?.borderRadius || '8px',
                                  backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Address Line 2"
                                className="w-full p-3 border-2"
                                style={{ 
                                  borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                  borderRadius: state.form.theme?.borderRadius || '8px',
                                  backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                                }}
                              />
                              <div className="grid grid-cols-3 gap-3">
                                <input
                                  type="text"
                                  placeholder="City"
                                  className="p-3 border-2"
                                  style={{ 
                                    borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                    borderRadius: state.form.theme?.borderRadius || '8px',
                                    backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder="State"
                                  className="p-3 border-2"
                                  style={{ 
                                    borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                    borderRadius: state.form.theme?.borderRadius || '8px',
                                    backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder="ZIP"
                                  className="p-3 border-2"
                                  style={{ 
                                    borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                    borderRadius: state.form.theme?.borderRadius || '8px',
                                    backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Multi-Select */}
                          {field.type === 'multi_select' && (
                            <div className="space-y-2">
                              {field.options?.map(opt => (
                                <label
                                  key={opt.id}
                                  className="flex items-center gap-3 p-3 border-2 cursor-pointer transition-colors hover:border-gray-400"
                                  style={{ 
                                    borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                    borderRadius: state.form.theme?.borderRadius || '8px',
                                  }}
                                >
                                  <input type="checkbox" value={opt.value} className="w-4 h-4" />
                                  <span style={{ color: state.form.theme?.textColor || '#1F2937' }}>{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {/* Image Block */}
                          {field.type === 'image' && (
                            <div 
                              className="border-2 border-dashed p-8 text-center"
                              style={{ 
                                borderColor: state.form.theme?.borderColor || '#E5E7EB',
                                borderRadius: state.form.theme?.borderRadius || '8px',
                              }}
                            >
                              <span className="text-4xl block mb-2">🖼️</span>
                              <p style={{ color: state.form.theme?.textColor || '#6B7280' }}>
                                Drag & drop or click to upload image
                              </p>
                            </div>
                          )}
                          
                          {/* Help text */}
                          {field.help_text && (
                            <p 
                              className="text-xs"
                              style={{ color: state.form.theme?.textColor || '#6B7280', opacity: 0.6 }}
                            >
                              {field.help_text}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <button
                    className={`w-full py-3 font-semibold transition-colors ${
                      state.form.theme?.buttonStyle === 'outlined' 
                        ? 'bg-transparent border-2' 
                        : state.form.theme?.buttonStyle === 'ghost'
                        ? 'bg-transparent'
                        : 'text-white'
                    }`}
                    style={{ 
                      backgroundColor: state.form.theme?.buttonStyle === 'filled' ? (state.form.theme?.primaryColor || '#8B5CF6') : 'transparent',
                      color: state.form.theme?.buttonStyle === 'filled' ? '#FFFFFF' : (state.form.theme?.primaryColor || '#8B5CF6'),
                      borderColor: state.form.theme?.primaryColor || '#8B5CF6',
                      borderRadius: state.form.theme?.borderRadius || '8px',
                    }}
                  >
                    Submit
                  </button>
                </div>
              </div>
              <div className="text-center mt-4">
                <Button variant="ghost" onClick={() => setState(prev => ({ ...prev, isPreviewMode: false }))}>
                  ✕ Close Preview
                </Button>
              </div>
            </div>
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
              selectedField ? (
                <div className="space-y-4">
                  <h3 className="font-mono font-bold text-sm uppercase">Field Settings</h3>
                  
                  <Input
                    id="field-label"
                    label="Label"
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                  />
                  
                  {/* Description for paragraph/heading */}
                  {(selectedField.type === 'paragraph' || selectedField.type === 'heading') && (
                    <div className="space-y-1">
                      <label htmlFor="field-description" className="block font-mono text-sm font-semibold">Content</label>
                      <textarea
                        id="field-description"
                        value={selectedField.description || ''}
                        onChange={(e) => updateField(selectedField.id, { description: e.target.value })}
                        className="w-full p-2 border-2 border-black text-sm resize-none"
                        rows={4}
                        placeholder={selectedField.type === 'heading' ? 'Heading text...' : 'Paragraph text...'}
                      />
                    </div>
                  )}
                  
                  {/* Placeholder for input fields */}
                  {!['heading', 'paragraph', 'divider', 'image'].includes(selectedField.type) && (
                    <Input
                      id="field-placeholder"
                      label="Placeholder"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                    />
                  )}
                  
                  {/* Help text for interactive fields */}
                  {!['heading', 'paragraph', 'divider', 'image'].includes(selectedField.type) && (
                    <Input
                      id="field-help-text"
                      label="Help Text"
                      value={selectedField.help_text || ''}
                      onChange={(e) => updateField(selectedField.id, { help_text: e.target.value })}
                    />
                  )}

                  {/* Required toggle - only for interactive fields */}
                  {!['heading', 'paragraph', 'divider', 'image'].includes(selectedField.type) && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="field-required"
                        checked={selectedField.required}
                        onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                      />
                      <label htmlFor="field-required" className="text-sm font-mono font-semibold">Required field</label>
                    </div>
                  )}

                  {/* Options for select/radio/checkbox/multi_select */}
                  {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox' || selectedField.type === 'multi_select') && (
                    <div className="space-y-2">
                      <label className="block font-mono text-sm font-semibold">Options</label>
                      {selectedField.options?.map((opt, idx) => (
                        <div key={opt.id} className="flex gap-2">
                          <input
                            id={`option-${opt.id}`}
                            value={opt.label}
                            onChange={(e) => {
                              const newOptions = [...(selectedField.options || [])];
                              newOptions[idx] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                              updateField(selectedField.id, { options: newOptions });
                            }}
                            className="flex-1 p-2 border-2 border-black text-sm"
                            placeholder={`Option ${idx + 1}`}
                          />
                          <button
                            onClick={() => {
                              const newOptions = selectedField.options?.filter((_, i) => i !== idx);
                              updateField(selectedField.id, { options: newOptions });
                            }}
                            className="px-2 text-red-600 hover:bg-red-50"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newOptions = [
                            ...(selectedField.options || []),
                            { id: uuidv4(), label: `Option ${(selectedField.options?.length || 0) + 1}`, value: `option_${(selectedField.options?.length || 0) + 1}` }
                          ];
                          updateField(selectedField.id, { options: newOptions });
                        }}
                      >
                        + Add Option
                      </Button>
                    </div>
                  )}

                  {/* CRM Field Mapping */}
                  {(selectedField.type === 'text' || selectedField.type === 'email' || selectedField.type === 'phone' || selectedField.type === 'textarea') && (
                    <div className="space-y-2 pt-4 border-t border-gray-200">
                      <label className="block font-mono text-sm font-semibold">🔗 CRM Field Mapping</label>
                      <Select
                        id="field-crm-mapping"
                        options={CRM_FIELD_MAPPINGS}
                        value={(selectedField as any).crm_field_mapping || ''}
                        onChange={(e) => updateField(selectedField.id, { crm_field_mapping: e.target.value } as any)}
                      />
                      <p className="text-xs text-gray-500">
                        Map this field to a CRM contact property
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteField(selectedField.id)}
                    >
                      🗑️ Delete Field
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <span className="text-4xl mb-4 block">⚙️</span>
                  <p>Select a field to edit its properties</p>
                </div>
              )
            )}

            {activePanel === 'design' && (
              <div className="space-y-4">
                <h3 className="font-mono font-bold text-sm uppercase">Form Design</h3>
                
                <div>
                  <label className="block font-mono text-sm font-semibold mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={state.form.theme?.primaryColor || '#8B5CF6'}
                      onChange={(e) => updateForm({ 
                        theme: { 
                          ...DEFAULT_FORM_THEME,
                          ...state.form.theme, 
                          primaryColor: e.target.value 
                        } 
                      })}
                      className="w-12 h-10 border-2 border-black cursor-pointer p-0"
                    />
                    <Input
                      value={state.form.theme?.primaryColor || '#8B5CF6'}
                      onChange={(e) => updateForm({ 
                        theme: { 
                          ...DEFAULT_FORM_THEME,
                          ...state.form.theme, 
                          primaryColor: e.target.value 
                        } 
                      })}
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-sm font-semibold mb-2">Background Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={state.form.theme?.backgroundColor || '#FFFFFF'}
                      onChange={(e) => updateForm({ 
                        theme: { 
                          ...DEFAULT_FORM_THEME,
                          ...state.form.theme, 
                          backgroundColor: e.target.value 
                        } 
                      })}
                      className="w-12 h-10 border-2 border-black cursor-pointer p-0"
                    />
                    <Input
                      value={state.form.theme?.backgroundColor || '#FFFFFF'}
                      onChange={(e) => updateForm({ 
                        theme: { 
                          ...DEFAULT_FORM_THEME,
                          ...state.form.theme, 
                          backgroundColor: e.target.value 
                        } 
                      })}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-sm font-semibold mb-2">Text Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={state.form.theme?.textColor || '#1F2937'}
                      onChange={(e) => updateForm({ 
                        theme: { 
                          ...DEFAULT_FORM_THEME,
                          ...state.form.theme, 
                          textColor: e.target.value 
                        } 
                      })}
                      className="w-12 h-10 border-2 border-black cursor-pointer p-0"
                    />
                    <Input
                      value={state.form.theme?.textColor || '#1F2937'}
                      onChange={(e) => updateForm({ 
                        theme: { 
                          ...DEFAULT_FORM_THEME,
                          ...state.form.theme, 
                          textColor: e.target.value 
                        } 
                      })}
                      placeholder="#1F2937"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-sm font-semibold mb-2">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={state.form.theme?.accentColor || '#8B5CF6'}
                      onChange={(e) => updateForm({ 
                        theme: { 
                          ...DEFAULT_FORM_THEME,
                          ...state.form.theme, 
                          accentColor: e.target.value 
                        } 
                      })}
                      className="w-12 h-10 border-2 border-black cursor-pointer p-0"
                    />
                    <Input
                      value={state.form.theme?.accentColor || '#8B5CF6'}
                      onChange={(e) => updateForm({ 
                        theme: { 
                          ...DEFAULT_FORM_THEME,
                          ...state.form.theme, 
                          accentColor: e.target.value 
                        } 
                      })}
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>

                <Select
                  label="Button Style"
                  id="design-button-style"
                  options={[
                    { value: 'filled', label: 'Filled' },
                    { value: 'outlined', label: 'Outlined' },
                    { value: 'ghost', label: 'Ghost' },
                  ]}
                  value={state.form.theme?.buttonStyle || 'filled'}
                  onChange={(e) => updateForm({ 
                    theme: { 
                      ...DEFAULT_FORM_THEME,
                      ...state.form.theme, 
                      buttonStyle: e.target.value as any 
                    } 
                  })}
                />

                <Select
                  label="Font Family"
                  id="design-font-family"
                  options={[
                    { value: 'Inter, system-ui, sans-serif', label: 'Inter (Modern)' },
                    { value: 'Georgia, serif', label: 'Georgia (Classic)' },
                    { value: 'monospace', label: 'Monospace (Technical)' },
                    { value: 'Arial, sans-serif', label: 'Arial (Clean)' },
                  ]}
                  value={state.form.theme?.fontFamily || 'Inter, system-ui, sans-serif'}
                  onChange={(e) => updateForm({ 
                    theme: { 
                      ...DEFAULT_FORM_THEME,
                      ...state.form.theme, 
                      fontFamily: e.target.value 
                    } 
                  })}
                />

                <Select
                  label="Spacing"
                  id="design-spacing"
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'relaxed', label: 'Relaxed' },
                  ]}
                  value={state.form.theme?.spacing || 'normal'}
                  onChange={(e) => updateForm({ 
                    theme: { 
                      ...DEFAULT_FORM_THEME,
                      ...state.form.theme, 
                      spacing: e.target.value as any 
                    } 
                  })}
                />

                <Select
                  label="Border Radius"
                  id="design-border-radius"
                  options={[
                    { value: '0px', label: 'None (Square)' },
                    { value: '4px', label: 'Small' },
                    { value: '8px', label: 'Medium' },
                    { value: '12px', label: 'Large' },
                    { value: '9999px', label: 'Pill' },
                  ]}
                  value={state.form.theme?.borderRadius || '8px'}
                  onChange={(e) => updateForm({ 
                    theme: { 
                      ...DEFAULT_FORM_THEME,
                      ...state.form.theme, 
                      borderRadius: e.target.value 
                    } 
                  })}
                />

                <hr className="border-gray-200 my-4" />

                <h4 className="font-mono font-bold text-sm uppercase">Branding</h4>

                <div>
                  <label className="block font-mono text-sm font-semibold mb-2">Logo</label>
                  {state.form.branding?.logoUrl && (
                    <div className="mb-2 p-2 bg-gray-50 border-2 border-gray-200 rounded flex items-center gap-2">
                      <img 
                        src={state.form.branding.logoUrl} 
                        alt="Logo preview" 
                        className="max-h-16 max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateForm({ 
                          branding: { 
                            ...DEFAULT_FORM_BRANDING,
                            ...state.form.branding, 
                            logoUrl: '' 
                          } 
                        })}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  
                  {/* File Upload Option */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <label 
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{uploadingLogo ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">or</span>
                    </div>
                    
                    <Input
                      id="design-logo-url"
                      value={state.form.branding?.logoUrl || ''}
                      onChange={(e) => updateForm({ 
                        branding: { 
                          ...DEFAULT_FORM_BRANDING,
                          ...state.form.branding, 
                          logoUrl: e.target.value 
                        } 
                      })}
                      placeholder="https://your-logo-url.com/logo.png"
                    />
                    <p className="text-xs text-gray-500">
                      Upload an image or enter a URL (PNG, JPG, SVG, WebP • Max 2MB)
                    </p>
                  </div>
                </div>

                <Select
                  label="Logo Position"
                  id="design-logo-position"
                  options={[
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'right', label: 'Right' },
                    { value: 'hidden', label: 'Hidden' },
                  ]}
                  value={state.form.branding?.logoPosition || 'left'}
                  onChange={(e) => updateForm({ 
                    branding: { 
                      ...DEFAULT_FORM_BRANDING,
                      ...state.form.branding, 
                      logoPosition: e.target.value as any 
                    } 
                  })}
                />

                <Select
                  label="Logo Size"
                  id="design-logo-size"
                  options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                  value={state.form.branding?.logoSize || 'medium'}
                  onChange={(e) => updateForm({ 
                    branding: { 
                      ...DEFAULT_FORM_BRANDING,
                      ...state.form.branding, 
                      logoSize: e.target.value as any 
                    } 
                  })}
                />

                {/* Theme Preview */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block font-mono text-sm font-semibold mb-2">Preview</label>
                  <div 
                    className="p-4 border-2 border-black"
                    style={{ 
                      backgroundColor: state.form.theme?.backgroundColor || '#FFFFFF',
                      fontFamily: state.form.theme?.fontFamily || 'Inter, system-ui, sans-serif',
                      borderRadius: state.form.theme?.borderRadius || '8px',
                    }}
                  >
                    <p 
                      className="text-sm font-semibold mb-2"
                      style={{ color: state.form.theme?.textColor || '#1F2937' }}
                    >
                      Sample Question
                    </p>
                    <div 
                      className="h-8 border-2 mb-2"
                      style={{ 
                        borderColor: state.form.theme?.primaryColor || '#8B5CF6',
                        backgroundColor: state.form.theme?.inputBackground || '#F9FAFB',
                        borderRadius: state.form.theme?.borderRadius || '8px',
                      }}
                    />
                    <button
                      className="px-4 py-2 text-sm font-semibold text-white"
                      style={{ 
                        backgroundColor: state.form.theme?.primaryColor || '#8B5CF6',
                        borderRadius: state.form.theme?.borderRadius || '8px',
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'settings' && (
              <div className="space-y-4">
                <h3 className="font-mono font-bold text-sm uppercase">Form Settings</h3>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-progress"
                    checked={state.form.settings?.showProgressBar ?? true}
                    onChange={(e) => updateForm({ settings: { ...DEFAULT_FORM_SETTINGS, ...state.form.settings, showProgressBar: e.target.checked } })}
                  />
                  <label htmlFor="settings-progress" className="text-sm">Show progress bar</label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-numbers"
                    checked={state.form.settings?.showQuestionNumbers ?? false}
                    onChange={(e) => updateForm({ settings: { ...DEFAULT_FORM_SETTINGS, ...state.form.settings, showQuestionNumbers: e.target.checked } })}
                  />
                  <label htmlFor="settings-numbers" className="text-sm">Show question numbers</label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-multiple"
                    checked={state.form.settings?.allowMultipleSubmissions ?? true}
                    onChange={(e) => updateForm({ settings: { ...DEFAULT_FORM_SETTINGS, ...state.form.settings, allowMultipleSubmissions: e.target.checked } })}
                  />
                  <label htmlFor="settings-multiple" className="text-sm">Allow multiple submissions</label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-shuffle"
                    checked={state.form.settings?.shuffleQuestions ?? false}
                    onChange={(e) => updateForm({ settings: { ...DEFAULT_FORM_SETTINGS, ...state.form.settings, shuffleQuestions: e.target.checked } })}
                  />
                  <label htmlFor="settings-shuffle" className="text-sm">Shuffle questions</label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-captcha"
                    checked={state.form.settings?.captchaEnabled ?? false}
                    onChange={(e) => updateForm({ settings: { ...DEFAULT_FORM_SETTINGS, ...state.form.settings, captchaEnabled: e.target.checked } })}
                  />
                  <label htmlFor="settings-captcha" className="text-sm">Enable CAPTCHA</label>
                </div>

                <Input
                  id="settings-confirmation"
                  label="Confirmation Message"
                  value={state.form.settings?.confirmationMessage || ''}
                  onChange={(e) => updateForm({ settings: { ...DEFAULT_FORM_SETTINGS, ...state.form.settings, confirmationMessage: e.target.value } })}
                />

                <Input
                  id="settings-redirect"
                  label="Redirect URL (optional)"
                  value={state.form.settings?.redirectUrl || ''}
                  onChange={(e) => updateForm({ settings: { ...DEFAULT_FORM_SETTINGS, ...state.form.settings, redirectUrl: e.target.value } })}
                  placeholder="https://..."
                />

                <Select
                  id="settings-visibility"
                  label="Visibility"
                  options={[
                    { value: 'public', label: 'Public' },
                    { value: 'private', label: 'Private (link only)' },
                    { value: 'password_protected', label: 'Password Protected' },
                  ]}
                  value={state.form.visibility || 'public'}
                  onChange={(e) => updateForm({ visibility: e.target.value as any })}
                />

                {state.form.visibility === 'password_protected' && (
                  <Input
                    id="settings-password"
                    label="Access Password"
                    type="password"
                    value={state.form.access_password || ''}
                    onChange={(e) => updateForm({ access_password: e.target.value })}
                    placeholder="Enter password"
                  />
                )}

                <hr className="border-gray-200 my-4" />

                <h4 className="font-mono font-bold text-sm uppercase">Limits</h4>

                <Input
                  id="settings-response-limit"
                  label="Response Limit (optional)"
                  type="number"
                  value={state.form.response_limit?.toString() || ''}
                  onChange={(e) => updateForm({ response_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Unlimited"
                />

                <Input
                  id="settings-expires"
                  label="Expires At (optional)"
                  type="datetime-local"
                  value={state.form.expires_at ? state.form.expires_at.substring(0, 16) : ''}
                  onChange={(e) => updateForm({ expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                />
              </div>
            )}

            {/* Integrations Panel - CRM & Campaign Linking */}
            {activePanel === 'integrations' && (
              <div className="space-y-4">
                <h3 className="font-mono font-bold text-sm uppercase">CRM & Campaigns</h3>
                
                {loadingIntegrations ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="animate-pulse">Loading...</span>
                  </div>
                ) : (
                  <>
                    {/* Link to Campaign */}
                    <div className="space-y-2">
                      <label className="block font-mono text-sm font-semibold">📣 Link to Campaign</label>
                      <p className="text-xs text-gray-500 mb-2">
                        Submissions will be tracked under this campaign
                      </p>
                      <Select
                        id="integrations-campaign"
                        options={[
                          { value: '', label: 'No campaign' },
                          ...campaigns.map(c => ({
                            value: c.id,
                            label: `${c.name} ${c.status === 'active' ? '🟢' : c.status === 'completed' ? '✅' : '⏸️'}`,
                          })),
                        ]}
                        value={selectedCampaignId}
                        onChange={(e) => {
                          setSelectedCampaignId(e.target.value);
                          setState(prev => ({ ...prev, isDirty: true }));
                        }}
                      />
                      {campaigns.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No campaigns found. Create one in Marketing tab.</p>
                      )}
                    </div>

                    <hr className="border-gray-200" />

                    {/* Auto-create Contact */}
                    <div className="space-y-3">
                      <label className="block font-mono text-sm font-semibold">👤 Contact Settings</label>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="integrations-auto-create"
                          checked={autoCreateContact}
                          onChange={(e) => {
                            setAutoCreateContact(e.target.checked);
                            setState(prev => ({ ...prev, isDirty: true }));
                          }}
                        />
                        <label htmlFor="integrations-auto-create" className="text-sm">
                          Auto-create contact on submission
                        </label>
                      </div>

                      {autoCreateContact && (
                        <Select
                          id="integrations-contact-type"
                          label="Default Contact Type"
                          options={[
                            { value: 'customer', label: '🛒 Customer' },
                            { value: 'investor', label: '💰 Investor' },
                            { value: 'partner', label: '🤝 Partner' },
                          ]}
                          value={defaultCrmType}
                          onChange={(e) => {
                            setDefaultCrmType(e.target.value);
                            setState(prev => ({ ...prev, isDirty: true }));
                          }}
                        />
                      )}
                    </div>

                    <hr className="border-gray-200" />

                    {/* Field-to-CRM Mapping Info */}
                    <div className="space-y-2">
                      <label className="block font-mono text-sm font-semibold">🔗 Field Mapping</label>
                      <p className="text-xs text-gray-500">
                        Map form fields to CRM contact fields by selecting a field and setting its CRM mapping in the Field panel.
                      </p>
                      <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs space-y-1">
                        <p className="font-semibold text-gray-700">Available mappings:</p>
                        <ul className="text-gray-600 space-y-0.5">
                          <li>• <code className="bg-gray-200 px-1 rounded">name</code> → Contact name</li>
                          <li>• <code className="bg-gray-200 px-1 rounded">email</code> → Email address</li>
                          <li>• <code className="bg-gray-200 px-1 rounded">phone</code> → Phone number</li>
                          <li>• <code className="bg-gray-200 px-1 rounded">company</code> → Company name</li>
                        </ul>
                      </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Webhook */}
                    <div className="space-y-2">
                      <label className="block font-mono text-sm font-semibold">🔌 Webhook</label>
                      <Input
                        value={state.form.settings?.webhookUrl || ''}
                        onChange={(e) => updateForm({ settings: { ...state.form.settings!, webhookUrl: e.target.value } })}
                        placeholder="https://your-webhook-url.com"
                      />
                      <p className="text-xs text-gray-500">
                        Receive submission data via POST request
                      </p>
                    </div>

                    {/* Notification Emails */}
                    <div className="space-y-2">
                      <label className="block font-mono text-sm font-semibold">📧 Notification Emails</label>
                      <Input
                        value={(state.form.settings?.notificationEmails || []).join(', ')}
                        onChange={(e) => {
                          const emails = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          updateForm({ settings: { ...state.form.settings!, notificationEmails: emails } });
                        }}
                        placeholder="email1@example.com, email2@example.com"
                      />
                      <p className="text-xs text-gray-500">
                        Comma-separated list of emails to notify on submission
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
