/**
 * FormFieldToolbox.tsx
 * 
 * Extracted from FormBuilder.tsx for better maintainability.
 * Provides a palette of draggable/clickable field types to add to forms.
 */

import React from 'react';
import { FORM_FIELD_TYPES, FormFieldType } from '../../types/forms';

// Icon mapping helper
const getFieldIcon = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    'Type': '✏️',
    'Mail': '📧',
    'Phone': '📱',
    'Hash': '#️⃣',
    'AlignLeft': '📝',
    'ChevronDown': '⬇️',
    'ListChecks': '☑️',
    'Circle': '🔘',
    'CheckSquare': '✅',
    'Calendar': '📅',
    'Clock': '🕐',
    'Upload': '📤',
    'Star': '⭐',
    'BarChart2': '📊',
    'Heading': '🔠',
    'FileText': '📄',
    'Minus': '➖',
    'Image': '🖼️',
  };
  return iconMap[iconName] || '📋';
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  input: 'Input Fields',
  choice: 'Choice Fields',
  advanced: 'Advanced',
  layout: 'Layout',
};

export interface FormFieldToolboxProps {
  onAddField: (fieldType: FormFieldType) => void;
}

export const FormFieldToolbox: React.FC<FormFieldToolboxProps> = ({
  onAddField,
}) => {
  const categories = ['input', 'choice', 'advanced', 'layout'] as const;

  return (
    <div className="w-64 flex-shrink-0 border-r-2 border-black bg-white overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-mono font-bold text-black mb-3 uppercase tracking-wider">Add Fields</h3>
        
        {categories.map(category => (
          <div key={category} className="mb-4">
            <p className="text-xs font-mono text-gray-500 uppercase mb-2">
              {CATEGORY_LABELS[category]}
            </p>
            <div className="space-y-1">
              {FORM_FIELD_TYPES.filter(f => f.category === category).map(fieldType => (
                <button
                  key={fieldType.type}
                  onClick={() => onAddField(fieldType.type)}
                  className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-yellow-100 hover:text-black transition-colors text-left border border-transparent hover:border-black"
                  title={fieldType.description}
                >
                  <span className="text-base">{getFieldIcon(fieldType.icon)}</span>
                  <span className="truncate">{fieldType.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormFieldToolbox;
