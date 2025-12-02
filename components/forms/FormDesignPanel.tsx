import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Form, DEFAULT_FORM_THEME, DEFAULT_FORM_BRANDING } from '../../types/forms';

interface FormDesignPanelProps {
  form: Partial<Form>;
  onUpdateForm: (updates: Partial<Form>) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingLogo: boolean;
}

/**
 * FormDesignPanel - Visual styling and branding for forms
 * Extracted from FormBuilder.tsx (~250 lines)
 */
export const FormDesignPanel: React.FC<FormDesignPanelProps> = ({
  form,
  onUpdateForm,
  onLogoUpload,
  uploadingLogo,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-slate-700">Form Design</h3>
      
      {/* Primary Color */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={form.theme?.primaryColor || '#8B5CF6'}
            onChange={(e) => onUpdateForm({ 
              theme: { 
                ...DEFAULT_FORM_THEME,
                ...form.theme, 
                primaryColor: e.target.value 
              } 
            })}
            className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0"
          />
          <Input
            value={form.theme?.primaryColor || '#8B5CF6'}
            onChange={(e) => onUpdateForm({ 
              theme: { 
                ...DEFAULT_FORM_THEME,
                ...form.theme, 
                primaryColor: e.target.value 
              } 
            })}
            placeholder="#8B5CF6"
          />
        </div>
      </div>

      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Background Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={form.theme?.backgroundColor || '#FFFFFF'}
            onChange={(e) => onUpdateForm({ 
              theme: { 
                ...DEFAULT_FORM_THEME,
                ...form.theme, 
                backgroundColor: e.target.value 
              } 
            })}
            className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0"
          />
          <Input
            value={form.theme?.backgroundColor || '#FFFFFF'}
            onChange={(e) => onUpdateForm({ 
              theme: { 
                ...DEFAULT_FORM_THEME,
                ...form.theme, 
                backgroundColor: e.target.value 
              } 
            })}
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      {/* Text Color */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Text Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={form.theme?.textColor || '#1F2937'}
            onChange={(e) => onUpdateForm({ 
              theme: { 
                ...DEFAULT_FORM_THEME,
                ...form.theme, 
                textColor: e.target.value 
              } 
            })}
            className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0"
          />
          <Input
            value={form.theme?.textColor || '#1F2937'}
            onChange={(e) => onUpdateForm({ 
              theme: { 
                ...DEFAULT_FORM_THEME,
                ...form.theme, 
                textColor: e.target.value 
              } 
            })}
            placeholder="#1F2937"
          />
        </div>
      </div>

      {/* Input Background */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Input Background</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={form.theme?.inputBackground || '#F9FAFB'}
            onChange={(e) => onUpdateForm({ 
              theme: { 
                ...DEFAULT_FORM_THEME,
                ...form.theme, 
                inputBackground: e.target.value 
              } 
            })}
            className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0"
          />
          <Input
            value={form.theme?.inputBackground || '#F9FAFB'}
            onChange={(e) => onUpdateForm({ 
              theme: { 
                ...DEFAULT_FORM_THEME,
                ...form.theme, 
                inputBackground: e.target.value 
              } 
            })}
            placeholder="#F9FAFB"
          />
        </div>
      </div>

      {/* Font Family */}
      <Select
        label="Font Family"
        id="design-font-family"
        options={[
          { value: 'Inter, system-ui, sans-serif', label: 'Inter (Modern)' },
          { value: 'Georgia, serif', label: 'Georgia (Classic)' },
          { value: 'monospace', label: 'Monospace (Technical)' },
          { value: 'Arial, sans-serif', label: 'Arial (Clean)' },
        ]}
        value={form.theme?.fontFamily || 'Inter, system-ui, sans-serif'}
        onChange={(e) => onUpdateForm({ 
          theme: { 
            ...DEFAULT_FORM_THEME,
            ...form.theme, 
            fontFamily: e.target.value 
          } 
        })}
      />

      {/* Spacing */}
      <Select
        label="Spacing"
        id="design-spacing"
        options={[
          { value: 'compact', label: 'Compact' },
          { value: 'normal', label: 'Normal' },
          { value: 'relaxed', label: 'Relaxed' },
        ]}
        value={form.theme?.spacing || 'normal'}
        onChange={(e) => onUpdateForm({ 
          theme: { 
            ...DEFAULT_FORM_THEME,
            ...form.theme, 
            spacing: e.target.value as any 
          } 
        })}
      />

      {/* Border Radius */}
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
        value={form.theme?.borderRadius || '8px'}
        onChange={(e) => onUpdateForm({ 
          theme: { 
            ...DEFAULT_FORM_THEME,
            ...form.theme, 
            borderRadius: e.target.value 
          } 
        })}
      />

      <hr className="border-gray-200 my-4" />

      <h4 className="font-semibold text-sm text-slate-700">Branding</h4>

      {/* Logo Upload/URL */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
        {form.branding?.logoUrl && (
          <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2">
            <img 
              src={form.branding.logoUrl} 
              alt="Logo preview" 
              className="max-h-16 max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="flex-1">
              <p className="text-xs text-green-600 font-medium">✓ Logo uploaded</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateForm({ 
                branding: { 
                  ...DEFAULT_FORM_BRANDING,
                  ...form.branding, 
                  logoUrl: '' 
                } 
              })}
            >
              Remove
            </Button>
          </div>
        )}
        
        {/* File Upload Option - only show if no logo */}
        {!form.branding?.logoUrl && (
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
                  onChange={onLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">or enter URL</span>
            </div>
            
            <Input
              id="design-logo-url"
              value=""
              onChange={(e) => onUpdateForm({ 
                branding: { 
                  ...DEFAULT_FORM_BRANDING,
                  ...form.branding, 
                  logoUrl: e.target.value 
                } 
              })}
              placeholder="https://your-logo-url.com/logo.png"
            />
            <p className="text-xs text-gray-500">
              Upload an image or enter a URL (PNG, JPG, SVG, WebP • Max 2MB)
            </p>
          </div>
        )}
      </div>

      {/* Logo Position */}
      <Select
        label="Logo Position"
        id="design-logo-position"
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
          { value: 'hidden', label: 'Hidden' },
        ]}
        value={form.branding?.logoPosition || 'left'}
        onChange={(e) => onUpdateForm({ 
          branding: { 
            ...DEFAULT_FORM_BRANDING,
            ...form.branding, 
            logoPosition: e.target.value as any 
          } 
        })}
      />

      {/* Logo Size */}
      <Select
        label="Logo Size"
        id="design-logo-size"
        options={[
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ]}
        value={form.branding?.logoSize || 'medium'}
        onChange={(e) => onUpdateForm({ 
          branding: { 
            ...DEFAULT_FORM_BRANDING,
            ...form.branding, 
            logoSize: e.target.value as any 
          } 
        })}
      />

      {/* Theme Preview */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Preview</label>
        <div 
          className="p-4 rounded-xl border border-gray-200"
          style={{ 
            backgroundColor: form.theme?.backgroundColor || '#FFFFFF',
            fontFamily: form.theme?.fontFamily || 'Inter, system-ui, sans-serif',
            borderRadius: form.theme?.borderRadius || '8px',
          }}
        >
          <p 
            className="text-sm font-semibold mb-2"
            style={{ color: form.theme?.textColor || '#1F2937' }}
          >
            Sample Question
          </p>
          <div 
            className="h-8 border mb-2"
            style={{ 
              borderColor: form.theme?.primaryColor || '#8B5CF6',
              backgroundColor: form.theme?.inputBackground || '#F9FAFB',
              borderRadius: form.theme?.borderRadius || '8px',
            }}
          />
          <button
            className="px-4 py-2 text-sm font-semibold text-white"
            style={{ 
              backgroundColor: form.theme?.primaryColor || '#8B5CF6',
              borderRadius: form.theme?.borderRadius || '8px',
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormDesignPanel;
