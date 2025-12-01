import React, { useState, useEffect } from 'react';
import { X, Building2, User, Search, Mail, FileText, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DatabaseService } from '../../lib/services/database';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { showSuccess, showError } from '../../lib/utils/toast';
import { fixEmailEncoding, fixHtmlEncoding } from '../../lib/utils/textDecoder';

interface CrmItem {
  id: string;
  company: string;
  type: 'investor' | 'customer' | 'partner';
}

interface Contact {
  id: string;
  name: string;
  email: string;
  crm_item_id: string | null;
}

interface SaveEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: {
    id: string;
    subject: string;
    from_address: string;
    to_addresses?: string[];
    received_at: string;
    snippet: string;
    body?: { html?: string; text?: string };
  };
  onSaved?: () => void;
}

export const SaveEmailModal: React.FC<SaveEmailModalProps> = ({
  isOpen,
  onClose,
  email,
  onSaved
}) => {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  
  const [accounts, setAccounts] = useState<CrmItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  
  // Load accounts and contacts
  useEffect(() => {
    if (!isOpen || !workspace?.id) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load CRM items (accounts)
        const { data: crmData } = await supabase
          .from('crm_items')
          .select('id, company, type')
          .eq('workspace_id', workspace.id)
          .order('company');
        
        // Load contacts
        const { data: contactData } = await supabase
          .from('contacts')
          .select('id, name, email, crm_item_id')
          .eq('workspace_id', workspace.id)
          .order('name');
        
        setAccounts(crmData || []);
        setContacts(contactData || []);
        
        // Auto-select account/contact if email matches
        if (contactData) {
          const emailAddress = email.from_address.match(/<(.+)>/)?.[1] || email.from_address;
          const matchingContact = contactData.find(c => 
            c.email?.toLowerCase() === emailAddress.toLowerCase()
          );
          if (matchingContact) {
            setSelectedContactId(matchingContact.id);
            if (matchingContact.crm_item_id) {
              setSelectedAccountId(matchingContact.crm_item_id);
            }
          }
        }
      } catch (err) {
        console.error('[SaveEmailModal] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [isOpen, workspace?.id, email.from_address]);
  
  // Filter accounts by search
  const filteredAccounts = accounts.filter(a =>
    a.company.toLowerCase().includes(accountSearch.toLowerCase())
  );
  
  // Filter contacts by search and optionally by selected account
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                         c.email?.toLowerCase().includes(contactSearch.toLowerCase());
    const matchesAccount = !selectedAccountId || c.crm_item_id === selectedAccountId;
    return matchesSearch && matchesAccount;
  });
  
  // Get selected account and contact names for display
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const selectedContact = contacts.find(c => c.id === selectedContactId);
  
  const handleSave = async () => {
    if (!user || !workspace) {
      showError('Please ensure you are logged in');
      return;
    }
    
    setSaving(true);
    try {
      // Build HTML content for the email snapshot
      const emailDate = new Date(email.received_at).toLocaleString();
      const fromDisplay = email.from_address.replace(/<.*>/, '').trim() || email.from_address;
      const toDisplay = email.to_addresses?.join(', ') || 'Unknown';
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
    .email-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .email-header { padding: 24px; border-bottom: 1px solid #e5e7eb; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .email-subject { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
    .email-meta { font-size: 13px; opacity: 0.9; }
    .email-meta-row { margin-bottom: 6px; }
    .email-meta-label { font-weight: 500; margin-right: 8px; }
    .email-body { padding: 24px; }
    .email-body-content { line-height: 1.6; color: #374151; }
    .email-footer { padding: 16px 24px; background: #f3f4f6; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 500; margin-right: 8px; }
    .badge-account { background: #dbeafe; color: #1e40af; }
    .badge-contact { background: #fce7f3; color: #9d174d; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-subject">📧 ${fixEmailEncoding(email.subject) || '(No Subject)'}</div>
      <div class="email-meta">
        <div class="email-meta-row"><span class="email-meta-label">From:</span>${fixEmailEncoding(fromDisplay)}</div>
        <div class="email-meta-row"><span class="email-meta-label">To:</span>${fixEmailEncoding(toDisplay)}</div>
        <div class="email-meta-row"><span class="email-meta-label">Date:</span>${emailDate}</div>
      </div>
    </div>
    <div class="email-body">
      <div class="email-body-content">
        ${email.body?.html ? fixHtmlEncoding(email.body.html) : `<pre style="white-space: pre-wrap; font-family: inherit;">${fixEmailEncoding(email.body?.text || email.snippet)}</pre>`}
      </div>
    </div>
    <div class="email-footer">
      <div style="margin-bottom: 8px;">
        ${selectedAccount ? `<span class="badge badge-account">🏢 ${selectedAccount.company}</span>` : ''}
        ${selectedContact ? `<span class="badge badge-contact">👤 ${selectedContact.name}</span>` : ''}
      </div>
      <div>Saved from FounderHQ Communications on ${new Date().toLocaleString()}</div>
    </div>
  </div>
</body>
</html>`;

      // Create the document in file library
      const docName = `📧 ${fixEmailEncoding(email.subject) || 'Email'} - ${fromDisplay}.html`;
      
      const { data: newDoc, error } = await DatabaseService.createDocument(user.id, workspace.id, {
        name: docName,
        content: btoa(unescape(encodeURIComponent(htmlContent))), // base64 encode
        mime_type: 'text/html',
        module: 'communications',
        company_id: selectedAccountId,
        contact_id: selectedContactId,
        notes: JSON.stringify({
          source: 'email_snapshot',
          tags: ['saved-email', 'email-snapshot'],
          original_email_id: email.id,
          from_address: email.from_address,
          received_at: email.received_at,
          saved_at: new Date().toISOString(),
          linked_account: selectedAccount?.company || null,
          linked_contact: selectedContact?.name || null
        })
      });
      
      if (error) throw error;
      
      showSuccess(`Email saved to File Library${selectedAccount ? ` and linked to ${selectedAccount.company}` : ''}`);
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('[SaveEmailModal] Save error:', err);
      showError(`Failed to save email: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-900">
          <div className="flex items-center gap-3 text-white">
            <Mail className="w-5 h-5" />
            <h2 className="font-semibold">Save Email to File Library</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Email Preview */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-900 truncate mb-1">
            {fixEmailEncoding(email.subject) || '(No Subject)'}
          </div>
          <div className="text-xs text-gray-500">
            From: {email.from_address.replace(/<.*>/, '').trim()}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1.5" />
                  Link to Account (optional)
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {selectedAccountId && (
                    <button
                      onClick={() => {
                        setSelectedAccountId(null);
                        setSelectedContactId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                    >
                      ✕ Clear selection
                    </button>
                  )}
                  {filteredAccounts.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      No accounts found
                    </div>
                  ) : (
                    filteredAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setSelectedAccountId(account.id);
                          // Clear contact if it doesn't belong to this account
                          if (selectedContactId) {
                            const contact = contacts.find(c => c.id === selectedContactId);
                            if (contact?.crm_item_id !== account.id) {
                              setSelectedContactId(null);
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 transition-colors
                          ${selectedAccountId === account.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            account.type === 'investor' ? 'bg-purple-100 text-purple-700' :
                            account.type === 'customer' ? 'bg-green-100 text-green-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {account.type.charAt(0).toUpperCase()}
                          </span>
                          {account.company}
                        </span>
                        {selectedAccountId === account.id && <Check className="w-4 h-4" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              {/* Contact Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1.5" />
                  Link to Contact (optional)
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {selectedContactId && (
                    <button
                      onClick={() => setSelectedContactId(null)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                    >
                      ✕ Clear selection
                    </button>
                  )}
                  {filteredContacts.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      {selectedAccountId ? 'No contacts for this account' : 'No contacts found'}
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setSelectedContactId(contact.id);
                          // Auto-select the account if contact has one
                          if (contact.crm_item_id && !selectedAccountId) {
                            setSelectedAccountId(contact.crm_item_id);
                          }
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors
                          ${selectedContactId === contact.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-xs text-gray-500">{contact.email}</div>
                          </div>
                          {selectedContactId === contact.id && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              {/* Selection Summary */}
              {(selectedAccountId || selectedContactId) && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-800 mb-1">Email will be linked to:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAccount && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                        <Building2 className="w-3 h-3" />
                        {selectedAccount.company}
                      </span>
                    )}
                    {selectedContact && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                        <User className="w-3 h-3" />
                        {selectedContact.name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Save Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveEmailModal;
