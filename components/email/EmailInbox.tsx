import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { EmailThread } from './EmailThread';
import { EmailComposer } from './EmailComposer';
import { fixEmailEncoding } from '../../lib/utils/textDecoder';
import { showSuccess, showError } from '../../lib/utils/toast';
import { RefreshCw, Plus, Search, Mail, Inbox, PenSquare, Send, FileEdit, Trash2 } from 'lucide-react';

type EmailFolder = 'inbox' | 'sent' | 'drafts';

interface EmailMessage {
  id: string;
  provider_message_id: string;
  subject: string;
  snippet: string;
  from_address: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  received_at: string;
  is_read: boolean;
  has_attachments: boolean;
  account_id: string;
  folder_id?: string;
  body?: { html?: string; text?: string; attachments?: any[] };
}

interface EditingDraft {
  id: string;
  provider_message_id: string;
  subject?: string;
  body?: { html?: string; text?: string; attachments?: any[] };
  to_addresses?: string[];
  cc_addresses?: string[];
}

export const EmailInbox: React.FC = () => {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<EmailFolder>('inbox');
  const [editingDraft, setEditingDraft] = useState<EditingDraft | null>(null);

  useEffect(() => {
    if (workspace?.id && user?.id) {
      fetchMessages();
      fetchDefaultAccount();
    }
  }, [workspace?.id, user?.id, activeFolder]);

  const fetchDefaultAccount = async () => {
    try {
      // Fetch Gmail account for the CURRENT USER in this workspace
      let { data, error } = await supabase
        .from('integrated_accounts')
        .select('id, status, email_address')
        .eq('workspace_id', workspace!.id)
        .eq('user_id', user!.id)
        .eq('provider', 'gmail')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.log('Error fetching email account:', error.message);
        return;
      }
      
      if (data) {
        console.log('Found Gmail account for user:', data.email_address);
        setDefaultAccountId(data.id);
      } else {
        console.log('No Gmail account found for current user in workspace');
      }
    } catch (err) {
      console.log('No default email account found');
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch emails only from accounts owned by the CURRENT USER
      let query = supabase
        .from('email_messages')
        .select(`
          *,
          integrated_accounts!inner(workspace_id, user_id)
        `)
        .eq('integrated_accounts.workspace_id', workspace!.id)
        .eq('integrated_accounts.user_id', user!.id)
        .order('received_at', { ascending: false })
        .limit(50);

      // Filter by folder - Gmail uses label IDs stored in folder_id
      // For inbox, show all emails (or those with INBOX label, or NULL folder_id)
      // For sent/drafts, filter specifically
      if (activeFolder === 'sent') {
        query = query.ilike('folder_id', '%SENT%');
      } else if (activeFolder === 'drafts') {
        query = query.ilike('folder_id', '%DRAFT%');
      }
      // For inbox, don't filter - show all emails (most emails are inbox)

      if (searchQuery) {
        query = query.or(`subject.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%,from_address.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      console.log('[EmailInbox] Fetched messages:', data?.length || 0, 'for folder:', activeFolder);

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching emails:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (workspace?.id) fetchMessages();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRefresh = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      // Get the user's session token for proper auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        showError('Please sign in again to sync emails');
        return;
      }

      // Trigger the sync function with proper auth
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace?.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Sync failed');
      }

      showSuccess('Emails synced successfully!');
      // Re-fetch messages after sync
      await fetchMessages();
    } catch (err: any) {
      console.error("Sync failed", err);
      showError(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleComposeClick = () => {
    if (!defaultAccountId) {
      showError('Please connect a Gmail account first in Settings');
      return;
    }
    setEditingDraft(null);
    setIsComposerOpen(true);
  };

  const handleMessageClick = async (msg: EmailMessage) => {
    // If this is a draft, open it in the composer for editing
    if (activeFolder === 'drafts') {
      // Fetch full draft data including body
      const { data: fullDraft, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', msg.id)
        .single();
      
      if (error) {
        console.error('Error fetching draft:', error);
        showError('Failed to open draft');
        return;
      }
      
      setEditingDraft({
        id: fullDraft.id,
        provider_message_id: fullDraft.provider_message_id,
        subject: fullDraft.subject,
        body: fullDraft.body,
        to_addresses: fullDraft.to_addresses,
        cc_addresses: fullDraft.cc_addresses,
      });
      setIsComposerOpen(true);
    } else {
      // For inbox/sent, show thread view
      setSelectedMessageId(msg.id);
    }
  };

  const handleDraftDeleted = () => {
    // Refresh the drafts list when a draft is deleted (after send or manual delete)
    fetchMessages();
  };

  const handleComposerClose = () => {
    setIsComposerOpen(false);
    setEditingDraft(null);
    // Refresh drafts when closing composer in case a new draft was saved
    if (activeFolder === 'drafts') {
      fetchMessages();
    }
  };

  const handleDeleteDraft = async (e: React.MouseEvent, msg: EmailMessage) => {
    e.stopPropagation(); // Prevent opening the draft
    
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      const { error } = await supabase
        .from('email_messages')
        .delete()
        .eq('id', msg.id);
      
      if (error) throw error;
      
      showSuccess('Draft deleted');
      fetchMessages();
    } catch (err: any) {
      console.error('Error deleting draft:', err);
      showError(`Failed to delete draft: ${err.message}`);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-gray-500">Loading inbox...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-2 border-red-500 text-red-700 font-mono">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex overflow-hidden">
      {/* Sidebar with Folders */}
      <div className="w-48 border-r border-gray-200 bg-gray-50/50 flex-shrink-0 hidden lg:flex flex-col">
        <div className="p-4">
          <button
            onClick={handleComposeClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PenSquare size={16} />
            <span>Compose</span>
          </button>
        </div>
        <nav className="flex-1 px-2">
          <button
            onClick={() => { setActiveFolder('inbox'); setSelectedMessageId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1
              ${activeFolder === 'inbox' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Inbox size={18} />
            <span>Inbox</span>
          </button>
          <button
            onClick={() => { setActiveFolder('sent'); setSelectedMessageId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1
              ${activeFolder === 'sent' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Send size={18} />
            <span>Sent</span>
          </button>
          <button
            onClick={() => { setActiveFolder('drafts'); setSelectedMessageId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1
              ${activeFolder === 'drafts' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <FileEdit size={18} />
            <span>Drafts</span>
          </button>
        </nav>
      </div>

      {/* List Panel */}
      <div className={`flex flex-col border-r border-gray-200 bg-white ${selectedMessageId ? 'w-full md:w-96 hidden md:flex' : 'flex-1 lg:w-96 lg:flex-none'}`}>
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col gap-3 bg-white">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 capitalize">{activeFolder}</h2>
            <div className="flex items-center gap-2">
              {/* Compose Button - Mobile/Tablet */}
              <button
                onClick={handleComposeClick}
                className="lg:hidden flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                title="Compose new email"
              >
                <PenSquare size={16} />
                <span className="hidden sm:inline">Compose</span>
              </button>
              {/* Refresh Button */}
              <button 
                onClick={handleRefresh}
                disabled={syncing}
                className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Sync emails"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          {/* Mobile Folder Tabs */}
          <div className="flex lg:hidden border-t border-gray-100 pt-3 -mx-4 px-4">
            <button
              onClick={() => { setActiveFolder('inbox'); setSelectedMessageId(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors
                ${activeFolder === 'inbox' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Inbox size={14} />
              <span>Inbox</span>
            </button>
            <button
              onClick={() => { setActiveFolder('sent'); setSelectedMessageId(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors
                ${activeFolder === 'sent' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Send size={14} />
              <span>Sent</span>
            </button>
            <button
              onClick={() => { setActiveFolder('drafts'); setSelectedMessageId(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors
                ${activeFolder === 'drafts' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <FileEdit size={14} />
              <span>Drafts</span>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 p-8 text-center text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                {activeFolder === 'inbox' && <Inbox className="w-6 h-6 text-gray-400" />}
                {activeFolder === 'sent' && <Send className="w-6 h-6 text-gray-400" />}
                {activeFolder === 'drafts' && <FileEdit className="w-6 h-6 text-gray-400" />}
              </div>
              <p className="text-sm font-medium">
                {activeFolder === 'inbox' && 'No emails in inbox'}
                {activeFolder === 'sent' && 'No sent emails'}
                {activeFolder === 'drafts' && 'No draft emails'}
              </p>
              <p className="text-xs mt-1">
                {activeFolder === 'inbox' && 'Your inbox is empty or sync is needed.'}
                {activeFolder === 'sent' && 'Emails you send will appear here.'}
                {activeFolder === 'drafts' && 'Saved drafts will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messages.map((msg) => {
                // For sent emails, show recipient instead of sender
                const displayAddress = activeFolder === 'sent' && msg.to_addresses?.length
                  ? `To: ${msg.to_addresses[0].replace(/<.*>/, '').trim()}`
                  : msg.from_address.replace(/<.*>/, '').trim() || msg.from_address;
                
                return (
                  <div 
                    key={msg.id} 
                    onClick={() => handleMessageClick(msg)}
                    className={`p-4 cursor-pointer transition-all hover:bg-gray-50 group
                      ${selectedMessageId === msg.id ? 'bg-blue-50/50 border-l-4 border-blue-500 pl-[12px]' : 'border-l-4 border-transparent pl-[12px]'}
                      ${!msg.is_read ? 'bg-white' : 'bg-white/50'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm truncate pr-2 ${!msg.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {displayAddress}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(new Date(msg.received_at), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className={`text-sm mb-1 truncate ${!msg.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {fixEmailEncoding(msg.subject) || '(No Subject)'}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {fixEmailEncoding(msg.snippet)}
                    </p>
                    {activeFolder === 'drafts' && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Draft</span>
                        <button
                          onClick={(e) => handleDeleteDraft(e, msg)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete draft"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Thread View Panel */}
      {selectedMessageId ? (
        <div className="flex-1 h-full bg-white overflow-hidden flex flex-col">
          <EmailThread 
            messageId={selectedMessageId} 
            onClose={() => setSelectedMessageId(null)} 
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50/50">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Select an email to read</p>
            <p className="text-xs text-gray-400 mt-1">Or compose a new message</p>
          </div>
        </div>
      )}

      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={isComposerOpen}
        onClose={handleComposerClose}
        defaultAccountId={defaultAccountId || undefined}
        editDraft={editingDraft || undefined}
        onDraftDeleted={handleDraftDeleted}
      />
    </div>
  );
};
