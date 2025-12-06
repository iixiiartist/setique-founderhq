// components/settings/ApiKeysSettings.tsx
// Settings component for managing Premium API keys

import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useCopyToClipboard } from '../../hooks';
import { useApiKeys, type CreateApiKeyInput } from '../../hooks/useApiKeys';
import { useAuth } from '../../contexts/AuthContext';
import { ApiScope, ApiKey } from '../../lib/services/apiKeyService';
import { CheckCircle2, AlertTriangle, Copy, Check, Link2, Plus, Key } from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const AVAILABLE_SCOPES: { value: ApiScope; label: string; description: string }[] = [
  { value: 'contacts:read', label: 'Contacts (Read)', description: 'View contacts' },
  { value: 'contacts:write', label: 'Contacts (Write)', description: 'Create, update, delete contacts' },
  { value: 'tasks:read', label: 'Tasks (Read)', description: 'View tasks' },
  { value: 'tasks:write', label: 'Tasks (Write)', description: 'Create, update, delete tasks' },
  { value: 'deals:read', label: 'Deals (Read)', description: 'View deals and pipeline' },
  { value: 'deals:write', label: 'Deals (Write)', description: 'Create, update, delete deals' },
  { value: 'documents:read', label: 'Documents (Read)', description: 'View documents and files' },
  { value: 'documents:write', label: 'Documents (Write)', description: 'Create, update, delete documents' },
  { value: 'crm:read', label: 'CRM (Read)', description: 'View CRM items (accounts, leads)' },
  { value: 'crm:write', label: 'CRM (Write)', description: 'Create, update, delete CRM items' },
  { value: 'financials:read', label: 'Financials (Read)', description: 'View financial logs and metrics' },
  { value: 'financials:write', label: 'Financials (Write)', description: 'Create, update, delete financials' },
  { value: 'marketing:read', label: 'Marketing (Read)', description: 'View marketing items and campaigns' },
  { value: 'marketing:write', label: 'Marketing (Write)', description: 'Create, update, delete marketing' },
  { value: 'products:read', label: 'Products (Read)', description: 'View products and services' },
  { value: 'products:write', label: 'Products (Write)', description: 'Create, update, delete products' },
  { value: 'calendar:read', label: 'Calendar (Read)', description: 'View calendar events' },
  { value: 'calendar:write', label: 'Calendar (Write)', description: 'Create, update, delete events' },
  { value: 'agents:run', label: 'AI Agents', description: 'Run AI agent queries' },
];

// ============================================
// TYPES
// ============================================

interface ApiKeysSettingsProps {
  workspaceId: string;
}

// ============================================
// CREATE KEY MODAL
// ============================================

interface CreateKeyModalProps {
  onClose: () => void;
  onCreate: (input: CreateApiKeyInput) => Promise<{ apiKey: ApiKey; rawKey: string } | null>;
  isCreating: boolean;
}

const CreateKeyModal: React.FC<CreateKeyModalProps> = ({ onClose, onCreate, isCreating }) => {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiScope[]>(['contacts:read', 'tasks:read', 'deals:read']);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const { isCopied: copied, copy } = useCopyToClipboard();

  const toggleScope = (scope: ApiScope) => {
    setScopes(prev => 
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }
    if (scopes.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    const result = await onCreate({
      name: name.trim(),
      scopes,
      expiresInDays,
    });

    if (result) {
      setNewKey(result.rawKey);
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      await copy(newKey);
    }
  };

  const handleClose = () => {
    if (newKey) {
      const confirmed = confirm(
        'Have you copied your API key? It will not be shown again after closing this dialog.'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  // Show the new key screen after creation
  if (newKey) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-lg w-full mx-4 shadow-2xl">
          <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> API Key Created</h3>
          
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-4">
            <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Copy your API key now! It will not be shown again.
            </p>
          </div>

          <div className="bg-gray-100 border border-gray-200 p-3 rounded-xl text-sm break-all mb-4">
            {newKey}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Create API Key</h3>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production Integration"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
        </div>

        {/* Scopes */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Permissions</label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SCOPES.map(scope => (
              <label
                key={scope.value}
                className={`flex items-center p-2 border-2 cursor-pointer transition-colors ${
                  scopes.includes(scope.value)
                    ? 'border-black bg-gray-100'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={scopes.includes(scope.value)}
                  onChange={() => toggleScope(scope.value)}
                  className="mr-2"
                />
                <div>
                  <span className="text-sm font-bold">{scope.label}</span>
                  <p className="text-xs text-gray-500">{scope.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Expiration */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Expiration</label>
          <select
            value={expiresInDays ?? ''}
            onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="">Never expires</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create API Key'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// API KEY ROW
// ============================================

interface ApiKeyRowProps {
  apiKey: ApiKey;
  onRevoke: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  isUpdating: boolean;
}

const ApiKeyRow: React.FC<ApiKeyRowProps> = ({ apiKey, onRevoke, onDelete, isUpdating }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  const handleDelete = async () => {
    const success = await onDelete(apiKey.id);
    if (success) {
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${apiKey.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900 truncate">{apiKey.name}</span>
            {!apiKey.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                REVOKED
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-600 mb-2">
            {apiKey.keyPrefix}...
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {apiKey.scopes.map(scope => (
              <span
                key={scope}
                className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
              >
                {scope}
              </span>
            ))}
          </div>

          <div className="text-xs text-gray-500 space-x-3">
            <span>Created: {formatDate(apiKey.createdAt)}</span>
            <span>Last used: {formatDate(apiKey.lastUsedAt)}</span>
            {apiKey.expiresAt && <span>Expires: {formatDate(apiKey.expiresAt)}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          {apiKey.isActive && (
            <button
              onClick={() => onRevoke(apiKey.id)}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Revoke
            </button>
          )}
          
          {showConfirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={handleDelete}
                disabled={isUpdating}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-400 text-red-700 hover:bg-red-50 transition-colors"
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

export const ApiKeysSettings: React.FC<ApiKeysSettingsProps> = ({ workspaceId }) => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    apiKeys,
    loading,
    creating,
    updating,
    error,
    create,
    revoke,
    remove,
  } = useApiKeys({ workspaceId });

  const handleCreate = useCallback(async (input: CreateApiKeyInput) => {
    return create(input);
  }, [create]);

  // Use branded API URL for display (proxied via Netlify to Supabase)
  const apiBaseUrl = 'https://founderhq.setique.com/api/v1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Key className="w-5 h-5" /> API Keys</h3>
          <p className="text-sm text-slate-600 mt-1">
            Manage API keys for programmatic access to your workspace data.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create API Key
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* API Docs Reference */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><Link2 className="w-4 h-4" /> API Endpoints</h4>
        <div className="text-sm text-slate-700 space-y-1 font-mono">
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/contacts</p>
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/tasks</p>
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/deals</p>
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/documents</p>
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/crm</p>
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/financials</p>
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/marketing</p>
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/products</p>
          <p><span className="text-slate-500">GET/POST</span> {apiBaseUrl}/calendar</p>
          <p><span className="text-slate-500">POST</span> {apiBaseUrl}/agents/run</p>
        </div>
        <p className="text-xs text-slate-600 mt-2">
          Use <code className="bg-slate-200 px-1 rounded">Authorization: Bearer fhq_live_...</code> header
        </p>
        <a 
          href="/api-docs" 
          className="inline-block mt-2 text-xs text-blue-700 hover:text-blue-900 underline"
        >
          View full API documentation →
        </a>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading API keys...
        </div>
      )}

      {/* Empty State */}
      {!loading && apiKeys.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No API keys created yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 transition-colors"
          >
            Create Your First API Key
          </button>
        </div>
      )}

      {/* Keys List */}
      {!loading && apiKeys.length > 0 && (
        <div className="space-y-3">
          {apiKeys.map(key => (
            <ApiKeyRow
              key={key.id}
              apiKey={key}
              onRevoke={revoke}
              onDelete={remove}
              isUpdating={updating}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          isCreating={creating}
        />
      )}
    </div>
  );
};

export default ApiKeysSettings;
