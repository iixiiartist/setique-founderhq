/**
 * FormPreview.tsx
 * 
 * Extracted from FormBuilder.tsx for better maintainability.
 * Provides a live preview of the form with theme/branding applied.
 */

import React from 'react';
import { Button } from '../ui/Button';
import { Form, FormField, FormTheme, FormBranding, FormSettings } from '../../types/forms';

export interface FormPreviewProps {
  form: Partial<Form>;
  fields: FormField[];
  onClosePreview: () => void;
}

// Get input styles based on theme
const getInputStyles = (theme?: FormTheme): React.CSSProperties => ({
  borderColor: theme?.borderColor || '#E5E7EB',
  borderRadius: theme?.borderRadius || '8px',
  backgroundColor: theme?.inputBackground || '#F9FAFB',
});

// Get button styles based on theme
const getButtonStyles = (theme?: FormTheme): React.CSSProperties => ({
  backgroundColor: theme?.buttonStyle === 'filled' ? (theme?.primaryColor || '#8B5CF6') : 'transparent',
  color: theme?.buttonStyle === 'filled' ? '#FFFFFF' : (theme?.primaryColor || '#8B5CF6'),
  borderColor: theme?.primaryColor || '#8B5CF6',
  borderRadius: theme?.borderRadius || '8px',
});

export const FormPreview: React.FC<FormPreviewProps> = ({
  form,
  fields,
  onClosePreview,
}) => {
  const theme = form.theme;
  const branding = form.branding;
  const settings = form.settings;
  const inputStyles = getInputStyles(theme);

  const getSpacingClass = () => {
    switch (theme?.spacing) {
      case 'compact': return 'space-y-4';
      case 'relaxed': return 'space-y-8';
      default: return 'space-y-6';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: theme?.backgroundColor || '#F3F4F6' }}>
      <div 
        className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-lg p-8"
        style={{ 
          fontFamily: theme?.fontFamily || 'Inter, system-ui, sans-serif',
          borderRadius: theme?.borderRadius || '8px',
        }}
      >
        {/* Logo */}
        {branding?.logoUrl && branding?.logoPosition !== 'hidden' && (
          <div className={`mb-6 ${
            branding.logoPosition === 'center' ? 'text-center' : 
            branding.logoPosition === 'right' ? 'text-right' : 'text-left'
          }`}>
            <img
              src={branding.logoUrl}
              alt="Logo"
              className={`inline-block ${
                branding.logoSize === 'small' ? 'h-8' : 
                branding.logoSize === 'large' ? 'h-16' : 'h-12'
              }`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        
        {/* Progress Bar */}
        {settings?.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 border border-gray-300" style={{ borderRadius: theme?.borderRadius || '8px' }}>
              <div
                className="h-full transition-all duration-300"
                style={{ 
                  width: '33%', 
                  backgroundColor: theme?.primaryColor || '#8B5CF6',
                  borderRadius: theme?.borderRadius || '8px',
                }}
              />
            </div>
          </div>
        )}
        
        {/* Form Title */}
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ color: theme?.textColor || '#1F2937' }}
        >
          {form.name}
        </h1>
        
        {/* Form Description */}
        {form.description && (
          <p 
            className="mb-6"
            style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}
          >
            {form.description}
          </p>
        )}
        
        {/* Form Fields */}
        <div className={getSpacingClass()}>
          {fields.map((field, index) => (
            <FormPreviewField
              key={field.id}
              field={field}
              index={index}
              theme={theme}
              settings={settings}
              inputStyles={inputStyles}
            />
          ))}
        </div>
        
        {/* Submit Button */}
        <div className="mt-8">
          <button
            className={`w-full py-3 font-semibold transition-colors ${
              theme?.buttonStyle === 'outlined' 
                ? 'bg-transparent border-2' 
                : theme?.buttonStyle === 'ghost'
                ? 'bg-transparent'
                : 'text-white'
            }`}
            style={getButtonStyles(theme)}
          >
            Submit
          </button>
        </div>
      </div>
      
      {/* Close Preview Button */}
      <div className="text-center mt-4">
        <Button variant="ghost" onClick={onClosePreview}>
          ✕ Close Preview
        </Button>
      </div>
    </div>
  );
};

// Individual field preview component
interface FormPreviewFieldProps {
  field: FormField;
  index: number;
  theme?: FormTheme;
  settings?: FormSettings;
  inputStyles: React.CSSProperties;
}

const FormPreviewField: React.FC<FormPreviewFieldProps> = ({
  field,
  index,
  theme,
  settings,
  inputStyles,
}) => {
  const textColor = theme?.textColor || '#1F2937';
  const mutedColor = theme?.textColor || '#6B7280';
  const errorColor = theme?.errorColor || '#EF4444';
  const primaryColor = theme?.primaryColor || '#8B5CF6';
  const borderColor = theme?.borderColor || '#E5E7EB';
  const borderRadius = theme?.borderRadius || '8px';

  // Layout fields (heading, paragraph, divider)
  if (field.type === 'heading') {
    return (
      <div className="space-y-2">
        <h2 
          className="text-xl font-bold mt-4"
          style={{ color: textColor }}
        >
          {field.label}
        </h2>
      </div>
    );
  }

  if (field.type === 'paragraph') {
    return (
      <div className="space-y-2">
        <p style={{ color: mutedColor }}>
          {field.description || field.label}
        </p>
      </div>
    );
  }

  if (field.type === 'divider') {
    return <hr className="border-2 border-gray-200 my-4" />;
  }

  // Regular fields with labels
  return (
    <div className="space-y-2">
      <label 
        className="block font-mono text-sm font-semibold"
        style={{ color: textColor }}
      >
        {settings?.showQuestionNumbers && `${index + 1}. `}
        {field.label}
        {field.required && <span style={{ color: errorColor }} className="ml-1">*</span>}
      </label>
      
      {/* Text inputs */}
      {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number') && (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
          placeholder={field.placeholder || ''}
          className="w-full p-3 border-2"
          style={inputStyles}
        />
      )}
      
      {/* Textarea */}
      {field.type === 'textarea' && (
        <textarea
          placeholder={field.placeholder || ''}
          className="w-full p-3 border-2"
          rows={4}
          style={inputStyles}
        />
      )}
      
      {/* Select dropdown */}
      {field.type === 'select' && (
        <select
          className="w-full p-3 border-2"
          style={inputStyles}
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
                borderColor,
                borderRadius,
              }}
            >
              <input type="radio" name={field.id} value={opt.value} className="w-4 h-4" />
              <span style={{ color: textColor }}>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
      
      {/* Checkboxes */}
      {(field.type === 'checkbox' || field.type === 'multi_select') && (
        <div className="space-y-2">
          {field.options?.map(opt => (
            <label
              key={opt.id}
              className="flex items-center gap-3 p-3 border-2 cursor-pointer transition-colors hover:border-gray-400"
              style={{ 
                borderColor,
                borderRadius,
              }}
            >
              <input type="checkbox" value={opt.value} className="w-4 h-4" />
              <span style={{ color: textColor }}>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
      
      {/* Date */}
      {field.type === 'date' && (
        <input
          type="date"
          className="w-full p-3 border-2"
          style={inputStyles}
        />
      )}
      
      {/* Time */}
      {field.type === 'time' && (
        <input
          type="time"
          className="w-full p-3 border-2"
          style={inputStyles}
        />
      )}
      
      {/* DateTime */}
      {field.type === 'datetime' && (
        <input
          type="datetime-local"
          className="w-full p-3 border-2"
          style={inputStyles}
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
              style={{ color: primaryColor }}
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
                  borderColor,
                  borderRadius,
                  backgroundColor: n <= 6 ? '#FEF2F2' : n <= 8 ? '#FEF9C3' : '#DCFCE7',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: mutedColor, opacity: 0.6 }}>
            <span>Not likely at all</span>
            <span>Extremely likely</span>
          </div>
        </div>
      )}
      
      {/* Scale (e.g., 1-7) */}
      {field.type === 'scale' && (
        <div>
          <div className="flex gap-2 items-center justify-between">
            <span className="text-sm" style={{ color: mutedColor }}>
              {(field as any).scale_min_label || 'Strongly Disagree'}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: (field as any).scale_max || 7 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  className="w-10 h-10 border-2 flex items-center justify-center text-sm transition-all hover:border-gray-400"
                  style={{ 
                    borderColor,
                    borderRadius,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-sm" style={{ color: mutedColor }}>
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
            borderColor,
            borderRadius,
          }}
        >
          <span className="text-4xl block mb-2">📤</span>
          <p style={{ color: mutedColor }}>
            Drag & drop or click to upload
          </p>
        </div>
      )}
      
      {/* Signature */}
      {field.type === 'signature' && (
        <div 
          className="border-2 p-4 text-center h-32 flex items-center justify-center"
          style={{ 
            borderColor,
            borderRadius,
            backgroundColor: inputStyles.backgroundColor,
          }}
        >
          <div>
            <span className="text-3xl block mb-2">✍️</span>
            <p className="text-sm" style={{ color: mutedColor }}>
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
            style={inputStyles}
          />
          <input
            type="text"
            placeholder="Address Line 2"
            className="w-full p-3 border-2"
            style={inputStyles}
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="City"
              className="p-3 border-2"
              style={inputStyles}
            />
            <input
              type="text"
              placeholder="State"
              className="p-3 border-2"
              style={inputStyles}
            />
            <input
              type="text"
              placeholder="ZIP"
              className="p-3 border-2"
              style={inputStyles}
            />
          </div>
        </div>
      )}
      
      {/* Image Block */}
      {field.type === 'image' && (
        <div 
          className="border-2 border-dashed p-8 text-center"
          style={{ 
            borderColor,
            borderRadius,
          }}
        >
          <span className="text-4xl block mb-2">🖼️</span>
          <p style={{ color: mutedColor }}>
            Drag & drop or click to upload image
          </p>
        </div>
      )}
      
      {/* Help text */}
      {field.help_text && (
        <p 
          className="text-xs"
          style={{ color: mutedColor, opacity: 0.6 }}
        >
          {field.help_text}
        </p>
      )}
    </div>
  );
};

export default FormPreview;
