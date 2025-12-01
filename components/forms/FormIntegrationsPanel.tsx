import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Form } from '../../types/forms';

interface Campaign {
  id: string;
  name: string;
  status: string;
  channel?: string;
}

interface FormIntegrationsPanelProps {
  form: Partial<Form>;
  onUpdateForm: (updates: Partial<Form>) => void;
  campaigns: Campaign[];
  selectedCampaignId: string;
  onCampaignChange: (campaignId: string) => void;
  autoCreateContact: boolean;
  onAutoCreateContactChange: (value: boolean) => void;
  defaultCrmType: string;
  onDefaultCrmTypeChange: (value: string) => void;
  loadingIntegrations: boolean;
  onMarkDirty: () => void;
}

/**
 * FormIntegrationsPanel - CRM, campaigns, webhooks, and notification settings
 * Extracted from FormBuilder.tsx (~150 lines)
 */
export const FormIntegrationsPanel: React.FC<FormIntegrationsPanelProps> = ({
  form,
  onUpdateForm,
  campaigns,
  selectedCampaignId,
  onCampaignChange,
  autoCreateContact,
  onAutoCreateContactChange,
  defaultCrmType,
  onDefaultCrmTypeChange,
  loadingIntegrations,
  onMarkDirty,
}) => {
  if (loadingIntegrations) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-mono font-bold text-sm uppercase">CRM & Campaigns</h3>
      
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
            onCampaignChange(e.target.value);
            onMarkDirty();
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
              onAutoCreateContactChange(e.target.checked);
              onMarkDirty();
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
              onDefaultCrmTypeChange(e.target.value);
              onMarkDirty();
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
          value={form.settings?.webhookUrl || ''}
          onChange={(e) => onUpdateForm({ settings: { ...form.settings!, webhookUrl: e.target.value } })}
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
          value={(form.settings?.notificationEmails || []).join(', ')}
          onChange={(e) => {
            const emails = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onUpdateForm({ settings: { ...form.settings!, notificationEmails: emails } });
          }}
          placeholder="email1@example.com, email2@example.com"
        />
        <p className="text-xs text-gray-500">
          Comma-separated list of emails to notify on submission
        </p>
      </div>
    </div>
  );
};

export default FormIntegrationsPanel;
