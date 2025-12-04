import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteConfirm } from '../../hooks';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { showSuccess, showError } from '../../lib/utils/toast';
import { EmailThread } from './EmailThread';
import { EmailComposer } from './EmailComposerWrapper';
import { EmailSidebar } from './EmailSidebar';
import { EmailToolbar } from './EmailToolbar';
import { EmailList } from './EmailList';
import { EmailEmptyState } from './EmailEmptyState';
import { EmailMessage, EmailFolder, EditingDraft } from './types';

export const EmailInbox: React.FC = () => {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  
  // State
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
  
  const deleteDraftConfirm = useDeleteConfirm<EmailMessage>('draft');

  const fetchDefaultAccount = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('integrated_accounts')
        .select('id, status, email_address')
        .eq('workspace_id', workspace!.id)
        .eq('user_id', user!.id)
        .eq('provider', 'gmail')
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setDefaultAccountId(data.id);
      }
    } catch (err) {
      // No default email account found - user needs to connect one
    }
  }, [workspace?.id, user?.id]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('email_messages')
        .select(`*, integrated_accounts!inner(workspace_id, user_id)`)
        .eq('integrated_accounts.workspace_id', workspace!.id)
        .eq('integrated_accounts.user_id', user!.id)
        .order('received_at', { ascending: false })
        .limit(50);

      if (activeFolder === 'sent') {
        query = query.ilike('folder_id', '%SENT%');
      } else if (activeFolder === 'drafts') {
        query = query.ilike('folder_id', '%DRAFT%');
      }

      if (searchQuery) {
        query = query.or(`subject.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%,from_address.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, user?.id, activeFolder, searchQuery]);

  useEffect(() => {
    if (workspace?.id && user?.id) {
      fetchMessages();
      fetchDefaultAccount();
    }
  }, [workspace?.id, user?.id, activeFolder, fetchMessages, fetchDefaultAccount]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (workspace?.id) fetchMessages();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, workspace?.id, fetchMessages]);

  const handleRefresh = useCallback(async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        showError('Please sign in again to sync emails');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspaceId: workspace?.id })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Sync failed');
      }

      showSuccess('Emails synced successfully!');
      await fetchMessages();
    } catch (err: any) {
      showError(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }, [syncing, workspace?.id, fetchMessages]);

  const handleComposeClick = useCallback(() => {
    if (!defaultAccountId) {
      showError('Please connect a Gmail account first in Settings');
      return;
    }
    setEditingDraft(null);
    setIsComposerOpen(true);
  }, [defaultAccountId]);

  const handleMessageClick = useCallback(async (msg: EmailMessage) => {
    if (activeFolder === 'drafts') {
      const { data: fullDraft, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', msg.id)
        .single();
      
      if (error) {
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
      setSelectedMessageId(msg.id);
    }
  }, [activeFolder]);

  const handleDeleteDraft = useCallback((e: React.MouseEvent, msg: EmailMessage) => {
    e.stopPropagation();
    
    deleteDraftConfirm.requestConfirm(msg, async (draft) => {
      try {
        const { error } = await supabase
          .from('email_messages')
          .delete()
          .eq('id', draft.id);
        
        if (error) throw error;
        
        showSuccess('Draft deleted');
        fetchMessages();
      } catch (err: any) {
        showError(`Failed to delete draft: ${err.message}`);
      }
    });
  }, [fetchMessages, deleteDraftConfirm]);

  const handleComposerClose = useCallback(() => {
    setIsComposerOpen(false);
    setEditingDraft(null);
    if (activeFolder === 'drafts') {
      fetchMessages();
    }
  }, [activeFolder, fetchMessages]);

  const handleFolderChange = useCallback((folder: EmailFolder) => {
    setActiveFolder(folder);
    setSelectedMessageId(null);
  }, []);

  if (loading && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 border-2 border-black animate-spin" style={{ animationDuration: '1.2s' }} />
            <div className="absolute inset-1 border border-gray-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
          </div>
          <div className="text-sm text-black font-mono">Loading inbox...</div>
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
      <EmailSidebar
        activeFolder={activeFolder}
        onFolderChange={handleFolderChange}
        onCompose={handleComposeClick}
      />

      {/* List Panel */}
      <div className={`flex flex-col border-r border-gray-200 bg-white h-full ${selectedMessageId ? 'w-full md:w-96 hidden md:flex' : 'flex-1 lg:w-96 lg:flex-none'}`}>
        <EmailToolbar
          activeFolder={activeFolder}
          searchQuery={searchQuery}
          syncing={syncing}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          onCompose={handleComposeClick}
          onFolderChange={handleFolderChange}
        />

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <EmailList
            messages={messages}
            activeFolder={activeFolder}
            selectedMessageId={selectedMessageId}
            onMessageClick={handleMessageClick}
            onDeleteDraft={handleDeleteDraft}
          />
        </div>
      </div>

      {/* Thread View Panel */}
      {selectedMessageId ? (
        <div className="flex-1 h-full min-h-0 bg-white overflow-hidden flex flex-col">
          <EmailThread 
            messageId={selectedMessageId} 
            onClose={() => setSelectedMessageId(null)} 
          />
        </div>
      ) : (
        <EmailEmptyState />
      )}

      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={isComposerOpen}
        onClose={handleComposerClose}
        defaultAccountId={defaultAccountId || undefined}
        editDraft={editingDraft || undefined}
        onDraftDeleted={fetchMessages}
        workspaceId={workspace?.id}
      />

      {/* Delete Draft Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDraftConfirm.isOpen}
        onClose={deleteDraftConfirm.cancel}
        onConfirm={deleteDraftConfirm.confirm}
        title={deleteDraftConfirm.title}
        message={deleteDraftConfirm.message}
        confirmLabel={deleteDraftConfirm.confirmLabel}
        cancelLabel={deleteDraftConfirm.cancelLabel}
        variant={deleteDraftConfirm.variant}
        isLoading={deleteDraftConfirm.isProcessing}
      />
    </div>
  );
};
