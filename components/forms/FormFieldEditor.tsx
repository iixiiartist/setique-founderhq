import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { FormField } from '../../types/forms';

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

interface FormFieldEditorProps {
  selectedField: FormField | null;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  onDeleteField: (id: string) => void;
}

/**
 * FormFieldEditor - Field settings panel for editing individual form fields
 * Extracted from FormBuilder.tsx (~150 lines)
 */
export const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  selectedField,
  onUpdateField,
  onDeleteField,
}) => {
  if (!selectedField) {
    return (
      <div className="text-center text-gray-500 py-8">
        <span className="text-4xl mb-4 block">⚙️</span>
        <p>Select a field to edit its properties</p>
      </div>
    );
  }

  const isLayoutField = ['heading', 'paragraph', 'divider', 'image'].includes(selectedField.type);
  const hasOptions = ['select', 'radio', 'checkbox', 'multi_select'].includes(selectedField.type);
  const hasCrmMapping = ['text', 'email', 'phone', 'textarea'].includes(selectedField.type);

  return (
    <div className="space-y-4">
      <h3 className="font-mono font-bold text-sm uppercase">Field Settings</h3>
      
      {/* Label */}
      <Input
        id="field-label"
        label="Label"
        value={selectedField.label}
        onChange={(e) => onUpdateField(selectedField.id, { label: e.target.value })}
      />
      
      {/* Description for paragraph/heading */}
      {(selectedField.type === 'paragraph' || selectedField.type === 'heading') && (
        <div className="space-y-1">
          <label htmlFor="field-description" className="block font-mono text-sm font-semibold">Content</label>
          <textarea
            id="field-description"
            value={selectedField.description || ''}
            onChange={(e) => onUpdateField(selectedField.id, { description: e.target.value })}
            className="w-full p-2 border-2 border-black text-sm resize-none"
            rows={4}
            placeholder={selectedField.type === 'heading' ? 'Heading text...' : 'Paragraph text...'}
          />
        </div>
      )}
      
      {/* Placeholder for input fields */}
      {!isLayoutField && (
        <Input
          id="field-placeholder"
          label="Placeholder"
          value={selectedField.placeholder || ''}
          onChange={(e) => onUpdateField(selectedField.id, { placeholder: e.target.value })}
        />
      )}
      
      {/* Help text for interactive fields */}
      {!isLayoutField && (
        <Input
          id="field-help-text"
          label="Help Text"
          value={selectedField.help_text || ''}
          onChange={(e) => onUpdateField(selectedField.id, { help_text: e.target.value })}
        />
      )}

      {/* Required toggle - only for interactive fields */}
      {!isLayoutField && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="field-required"
            checked={selectedField.required}
            onChange={(e) => onUpdateField(selectedField.id, { required: e.target.checked })}
          />
          <label htmlFor="field-required" className="text-sm font-mono font-semibold">Required field</label>
        </div>
      )}

      {/* Options for select/radio/checkbox/multi_select */}
      {hasOptions && (
        <div className="space-y-2">
          <label className="block font-mono text-sm font-semibold">Options</label>
          {selectedField.options?.map((opt, idx) => (
            <div key={opt.id} className="flex gap-2">
              <input
                id={`option-${opt.id}`}
                value={opt.label}
                onChange={(e) => {
                  const newOptions = [...(selectedField.options || [])];
                  newOptions[idx] = { 
                    ...opt, 
                    label: e.target.value, 
                    value: e.target.value.toLowerCase().replace(/\s+/g, '_') 
                  };
                  onUpdateField(selectedField.id, { options: newOptions });
                }}
                className="flex-1 p-2 border-2 border-black text-sm"
                placeholder={`Option ${idx + 1}`}
              />
              <button
                onClick={() => {
                  const newOptions = selectedField.options?.filter((_, i) => i !== idx);
                  onUpdateField(selectedField.id, { options: newOptions });
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
                { 
                  id: uuidv4(), 
                  label: `Option ${(selectedField.options?.length || 0) + 1}`, 
                  value: `option_${(selectedField.options?.length || 0) + 1}` 
                }
              ];
              onUpdateField(selectedField.id, { options: newOptions });
            }}
          >
            + Add Option
          </Button>
        </div>
      )}

      {/* CRM Field Mapping */}
      {hasCrmMapping && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <label className="block font-mono text-sm font-semibold">🔗 CRM Field Mapping</label>
          <Select
            id="field-crm-mapping"
            options={CRM_FIELD_MAPPINGS}
            value={(selectedField as any).crm_field_mapping || ''}
            onChange={(e) => onUpdateField(selectedField.id, { crm_field_mapping: e.target.value } as any)}
          />
          <p className="text-xs text-gray-500">
            Map this field to a CRM contact property
          </p>
        </div>
      )}

      {/* Delete Button */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          variant="danger"
          size="sm"
          onClick={() => onDeleteField(selectedField.id)}
        >
          🗑️ Delete Field
        </Button>
      </div>
    </div>
  );
};

export default FormFieldEditor;
