// components/settings/WebhooksSettings.tsx
// Settings component for managing outbound webhooks

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// CONSTANTS
// ============================================

const AVAILABLE_EVENTS = [
  { value: 'contact.created', label: 'Contact Created', category: 'Contacts' },
  { value: 'contact.updated', label: 'Contact Updated', category: 'Contacts' },
  { value: 'contact.deleted', label: 'Contact Deleted', category: 'Contacts' },
  { value: 'task.created', label: 'Task Created', category: 'Tasks' },
  { value: 'task.updated', label: 'Task Updated', category: 'Tasks' },
  { value: 'task.completed', label: 'Task Completed', category: 'Tasks' },
  { value: 'task.deleted', label: 'Task Deleted', category: 'Tasks' },
  { value: 'deal.created', label: 'Deal Created', category: 'Deals' },
  { value: 'deal.updated', label: 'Deal Updated', category: 'Deals' },
  { value: 'deal.stage_changed', label: 'Deal Stage Changed', category: 'Deals' },
  { value: 'deal.won', label: 'Deal Won', category: 'Deals' },
  { value: 'deal.lost', label: 'Deal Lost', category: 'Deals' },
  { value: 'deal.deleted', label: 'Deal Deleted', category: 'Deals' },
  { value: 'document.created', label: 'Document Created', category: 'Documents' },
  { value: 'document.updated', label: 'Document Updated', category: 'Documents' },
  { value: 'document.deleted', label: 'Document Deleted', category: 'Documents' },
  { value: 'crm.created', label: 'CRM Item Created', category: 'CRM' },
  { value: 'crm.updated', label: 'CRM Item Updated', category: 'CRM' },
  { value: 'crm.stage_changed', label: 'CRM Stage Changed', category: 'CRM' },
  { value: 'crm.deleted', label: 'CRM Item Deleted', category: 'CRM' },
  { value: 'financial.created', label: 'Financial Created', category: 'Financials' },
  { value: 'financial.updated', label: 'Financial Updated', category: 'Financials' },
  { value: 'financial.deleted', label: 'Financial Deleted', category: 'Financials' },
  { value: 'marketing.created', label: 'Marketing Created', category: 'Marketing' },
  { value: 'marketing.updated', label: 'Marketing Updated', category: 'Marketing' },
  { value: 'marketing.deleted', label: 'Marketing Deleted', category: 'Marketing' },
  { value: 'product.created', label: 'Product Created', category: 'Products' },
  { value: 'product.updated', label: 'Product Updated', category: 'Products' },
  { value: 'product.deleted', label: 'Product Deleted', category: 'Products' },
  { value: 'calendar.created', label: 'Event Created', category: 'Calendar' },
  { value: 'calendar.updated', label: 'Event Updated', category: 'Calendar' },
  { value: 'calendar.deleted', label: 'Event Deleted', category: 'Calendar' },
  { value: 'agent.run_completed', label: 'Agent Run Completed', category: 'Agents' },
  { value: 'agent.run_failed', label: 'Agent Run Failed', category: 'Agents' },
];

const EVENT_CATEGORIES = ['Contacts', 'Tasks', 'Deals', 'Documents', 'CRM', 'Financials', 'Marketing', 'Products', 'Calendar', 'Agents'];

// ============================================
// TYPES
// ============================================

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  consecutive_failures: number;
  last_error: string | null;
  created_at: string;
}

interface WebhooksSettingsProps {
  workspaceId: string;
}

// ============================================
// CREATE WEBHOOK MODAL
// ============================================

interface CreateWebhookModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreate: () => void;
}

const CreateWebhookModal: React.FC<CreateWebhookModalProps> = ({ workspaceId, onClose, onCreate }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEvent = (event: string) => {
    setEvents(prev => 
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const toggleCategory = (category: string) => {
    const categoryEvents = AVAILABLE_EVENTS
      .filter(e => e.category === category)
      .map(e => e.value);
    
    const allSelected = categoryEvents.every(e => events.includes(e));
    
    if (allSelected) {
      setEvents(prev => prev.filter(e => !categoryEvents.includes(e)));
    } else {
      setEvents(prev => [...new Set([...prev, ...categoryEvents])]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!url.trim()) {
      setError('URL is required');
      return;
    }
    if (!url.startsWith('https://')) {
      setError('URL must use HTTPS');
      return;
    }
    if (events.length === 0) {
      setError('Select at least one event');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Generate a secret for HMAC signing
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { error: insertError } = await supabase
        .from('api_webhooks')
        .insert({
          workspace_id: workspaceId,
          created_by: user?.id,
          name: name.trim(),
          url: url.trim(),
          secret,
          events,
          is_active: true,
        });

      if (insertError) throw insertError;

      onCreate();
      onClose();
    } catch (err) {
      console.error('[WebhooksSettings] Create error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black p-6 max-w-lg w-full mx-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold font-mono mb-4">Create Webhook</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Zapier Integration"
            className="w-full border-2 border-black px-3 py-2 font-mono"
          />
        </div>

        {/* URL */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Endpoint URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-endpoint.com/webhook"
            className="w-full border-2 border-black px-3 py-2 font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">Must use HTTPS for security</p>
        </div>

        {/* Events */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Events</label>
          {EVENT_CATEGORIES.map(category => {
            const categoryEvents = AVAILABLE_EVENTS.filter(e => e.category === category);
            const allSelected = categoryEvents.every(e => events.includes(e.value));
            const someSelected = categoryEvents.some(e => events.includes(e.value));
            
            return (
              <div key={category} className="mb-3">
                <label className="flex items-center gap-2 font-bold text-sm mb-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={() => toggleCategory(category)}
                  />
                  {category}
                </label>
                <div className="ml-6 grid grid-cols-2 gap-1">
                  {categoryEvents.map(event => (
                    <label
                      key={event.value}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={events.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                      />
                      {event.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Webhook'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-black font-bold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// WEBHOOK ROW
// ============================================

interface WebhookRowProps {
  webhook: Webhook;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<void>;
}

const WebhookRow: React.FC<WebhookRowProps> = ({ webhook, onToggle, onDelete, onTest }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await onTest(webhook.id);
      setTestResult({ success: true, message: 'Test event sent!' });
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className={`p-4 border-2 ${webhook.is_active ? 'border-black' : 'border-gray-300 bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold font-mono truncate">{webhook.name}</span>
            {!webhook.is_active && (
              <span className="px-2 py-0.5 text-xs font-bold bg-gray-200 text-gray-600 border border-gray-300">
                DISABLED
              </span>
            )}
            {webhook.consecutive_failures > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                {webhook.consecutive_failures} failures
              </span>
            )}
          </div>
          
          <div className="font-mono text-sm text-gray-600 mb-2 truncate">
            {webhook.url}
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {webhook.events.slice(0, 5).map(event => (
              <span
                key={event}
                className="px-2 py-0.5 text-xs font-mono bg-purple-100 text-purple-800 border border-purple-300"
              >
                {event}
              </span>
            ))}
            {webhook.events.length > 5 && (
              <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 border border-gray-300">
                +{webhook.events.length - 5} more
              </span>
            )}
          </div>

          <div className="text-xs text-gray-500 space-x-3">
            <span>Created: {formatDate(webhook.created_at)}</span>
            <span>Last triggered: {formatDate(webhook.last_triggered_at)}</span>
          </div>

          {webhook.last_error && (
            <div className="mt-2 text-xs text-red-600 font-mono truncate">
              Error: {webhook.last_error}
            </div>
          )}

          {testResult && (
            <div className={`mt-2 text-xs font-mono ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.message}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onToggle(webhook.id, !webhook.is_active)}
            className={`px-3 py-1 text-sm font-bold border-2 ${
              webhook.is_active 
                ? 'border-yellow-500 text-yellow-700 hover:bg-yellow-50' 
                : 'border-green-500 text-green-700 hover:bg-green-50'
            }`}
          >
            {webhook.is_active ? 'Disable' : 'Enable'}
          </button>
          
          <button
            onClick={handleTest}
            disabled={!webhook.is_active || isTesting}
            className="px-3 py-1 text-sm font-bold border-2 border-blue-500 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test'}
          </button>
          
          {showConfirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  onDelete(webhook.id);
                  setShowConfirmDelete(false);
                }}
                className="px-2 py-1 text-xs font-bold bg-red-600 text-white hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-2 py-1 text-xs font-bold border-2 border-black hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="px-3 py-1 text-sm font-bold border-2 border-red-500 text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const WebhooksSettings: React.FC<WebhooksSettingsProps> = ({ workspaceId }) => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('api_webhooks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWebhooks(data || []);
    } catch (err) {
      console.error('[WebhooksSettings] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('api_webhooks')
        .update({ is_active: isActive })
        .eq('id', id);

      if (updateError) throw updateError;
      
      setWebhooks(prev => prev.map(w => 
        w.id === id ? { ...w, is_active: isActive } : w
      ));
    } catch (err) {
      console.error('[WebhooksSettings] Toggle error:', err);
      alert('Failed to update webhook');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('api_webhooks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('[WebhooksSettings] Delete error:', err);
      alert('Failed to delete webhook');
    }
  };

  const handleTest = async (id: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/webhook-delivery?action=test`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ webhookId: id }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Test failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold font-mono">Webhooks</h3>
          <p className="text-sm text-gray-600 mt-1">
            Send real-time events to external services when data changes.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 transition-colors"
        >
          + Create Webhook
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-300 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-purple-50 border-2 border-purple-300">
        <h4 className="font-bold text-purple-800 mb-2">📡 How Webhooks Work</h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Events are sent via POST with JSON payload</li>
          <li>• Includes HMAC signature in <code className="bg-purple-100 px-1">X-Webhook-Signature</code> header</li>
          <li>• Failed deliveries retry up to 5 times with exponential backoff</li>
          <li>• Webhooks auto-disable after 10 consecutive failures</li>
        </ul>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading webhooks...
        </div>
      )}

      {/* Empty State */}
      {!loading && webhooks.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No webhooks configured yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 transition-colors"
          >
            Create Your First Webhook
          </button>
        </div>
      )}

      {/* Webhooks List */}
      {!loading && webhooks.length > 0 && (
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <WebhookRow
              key={webhook.id}
              webhook={webhook}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onTest={handleTest}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWebhookModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateModal(false)}
          onCreate={fetchWebhooks}
        />
      )}
    </div>
  );
};

export default WebhooksSettings;
