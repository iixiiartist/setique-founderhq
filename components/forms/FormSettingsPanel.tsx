import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Form, DEFAULT_FORM_SETTINGS } from '../../types/forms';

interface FormSettingsPanelProps {
  form: Partial<Form>;
  onUpdateForm: (updates: Partial<Form>) => void;
}

/**
 * FormSettingsPanel - Form behavior and settings configuration
 * Extracted from FormBuilder.tsx (~120 lines)
 */
export const FormSettingsPanel: React.FC<FormSettingsPanelProps> = ({
  form,
  onUpdateForm,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-mono font-bold text-sm uppercase">Form Settings</h3>
      
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="settings-progress"
          checked={form.settings?.showProgressBar ?? true}
          onChange={(e) => onUpdateForm({ 
            settings: { 
              ...DEFAULT_FORM_SETTINGS, 
              ...form.settings, 
              showProgressBar: e.target.checked 
            } 
          })}
        />
        <label htmlFor="settings-progress" className="text-sm">Show progress bar</label>
      </div>

      {/* Question Numbers */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="settings-numbers"
          checked={form.settings?.showQuestionNumbers ?? false}
          onChange={(e) => onUpdateForm({ 
            settings: { 
              ...DEFAULT_FORM_SETTINGS, 
              ...form.settings, 
              showQuestionNumbers: e.target.checked 
            } 
          })}
        />
        <label htmlFor="settings-numbers" className="text-sm">Show question numbers</label>
      </div>

      {/* Multiple Submissions */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="settings-multiple"
          checked={form.settings?.allowMultipleSubmissions ?? true}
          onChange={(e) => onUpdateForm({ 
            settings: { 
              ...DEFAULT_FORM_SETTINGS, 
              ...form.settings, 
              allowMultipleSubmissions: e.target.checked 
            } 
          })}
        />
        <label htmlFor="settings-multiple" className="text-sm">Allow multiple submissions</label>
      </div>

      {/* Shuffle Questions */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="settings-shuffle"
          checked={form.settings?.shuffleQuestions ?? false}
          onChange={(e) => onUpdateForm({ 
            settings: { 
              ...DEFAULT_FORM_SETTINGS, 
              ...form.settings, 
              shuffleQuestions: e.target.checked 
            } 
          })}
        />
        <label htmlFor="settings-shuffle" className="text-sm">Shuffle questions</label>
      </div>

      {/* CAPTCHA */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="settings-captcha"
          checked={form.settings?.captchaEnabled ?? false}
          onChange={(e) => onUpdateForm({ 
            settings: { 
              ...DEFAULT_FORM_SETTINGS, 
              ...form.settings, 
              captchaEnabled: e.target.checked 
            } 
          })}
        />
        <label htmlFor="settings-captcha" className="text-sm">Enable CAPTCHA</label>
      </div>

      {/* Confirmation Message */}
      <Input
        id="settings-confirmation"
        label="Confirmation Message"
        value={form.settings?.confirmationMessage || ''}
        onChange={(e) => onUpdateForm({ 
          settings: { 
            ...DEFAULT_FORM_SETTINGS, 
            ...form.settings, 
            confirmationMessage: e.target.value 
          } 
        })}
      />

      {/* Redirect URL */}
      <Input
        id="settings-redirect"
        label="Redirect URL (optional)"
        value={form.settings?.redirectUrl || ''}
        onChange={(e) => onUpdateForm({ 
          settings: { 
            ...DEFAULT_FORM_SETTINGS, 
            ...form.settings, 
            redirectUrl: e.target.value 
          } 
        })}
        placeholder="https://..."
      />

      {/* Visibility */}
      <Select
        id="settings-visibility"
        label="Visibility"
        options={[
          { value: 'public', label: 'Public' },
          { value: 'private', label: 'Private (link only)' },
          { value: 'password_protected', label: 'Password Protected' },
        ]}
        value={form.visibility || 'public'}
        onChange={(e) => onUpdateForm({ visibility: e.target.value as any })}
      />

      {/* Password (conditional) */}
      {form.visibility === 'password_protected' && (
        <Input
          id="settings-password"
          label="Access Password"
          type="password"
          value={form.access_password || ''}
          onChange={(e) => onUpdateForm({ access_password: e.target.value })}
          placeholder="Enter password"
        />
      )}

      <hr className="border-gray-200 my-4" />

      <h4 className="font-mono font-bold text-sm uppercase">Limits</h4>

      {/* Response Limit */}
      <Input
        id="settings-response-limit"
        label="Response Limit (optional)"
        type="number"
        value={form.response_limit?.toString() || ''}
        onChange={(e) => onUpdateForm({ 
          response_limit: e.target.value ? parseInt(e.target.value) : undefined 
        })}
        placeholder="Unlimited"
      />

      {/* Expires At */}
      <Input
        id="settings-expires"
        label="Expires At (optional)"
        type="datetime-local"
        value={form.expires_at ? form.expires_at.substring(0, 16) : ''}
        onChange={(e) => onUpdateForm({ 
          expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined 
        })}
      />
    </div>
  );
};

export default FormSettingsPanel;
