import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteConfirm } from '../../hooks';
import { ConfirmDialog } from '../shared/ConfirmDialog';

interface IntegratedAccount {
  id: string;
  provider: 'gmail' | 'outlook';
  email_address: string;
  status: 'active' | 'disconnected' | 'error';
  last_synced_at: string;
  error_message?: string;
}

export const IntegrationsSettings: React.FC = () => {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<IntegratedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  const disconnectConfirm = useDeleteConfirm<{ id: string }>('account');

  useEffect(() => {
    if (workspace?.id && user?.id) {
      fetchAccounts();
    }
  }, [workspace?.id, user?.id]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('integrated_accounts')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .eq('user_id', user!.id);

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: 'gmail' | 'outlook') => {
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-auth`;
      const params = new URLSearchParams({
        action: 'authorize',
        provider,
        workspace_id: workspace!.id,
        user_id: user!.id
      });
      
      const res = await fetch(`${functionUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to authorize');
      }

      if (json.url) {
        window.location.href = json.url;
      } else {
        throw new Error('No redirect URL returned');
      }

    } catch (err: any) {
      console.error('Error initiating connection:', err);
      alert(`Failed to start connection process: ${err.message}`);
    }
  };

  const handleDisconnect = (accountId: string) => {
    disconnectConfirm.requestConfirm({ id: accountId, name: 'account' }, async (data) => {
      try {
        const { error } = await supabase
          .from('integrated_accounts')
          .delete()
          .eq('id', data.id);

        if (error) throw error;
        fetchAccounts();
      } catch (err) {
        console.error('Error disconnecting:', err);
        alert('Failed to disconnect account');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-xl font-bold font-mono mb-4">Email Integrations</h3>
        <p className="text-gray-600 mb-6">
          Connect your email accounts to sync messages, draft replies with AI, and trigger automations.
        </p>

        <div className="grid gap-4">
          {/* Gmail */}
          <div className="flex items-center justify-between p-4 border-2 border-black bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📧</div>
              <div>
                <h4 className="font-bold">Gmail</h4>
                <p className="text-sm text-gray-500">Connect your Google Workspace or Gmail account</p>
              </div>
            </div>
            {accounts.find(a => a.provider === 'gmail') ? (
               <div className="flex items-center gap-3">
                 <span className="text-green-600 font-bold text-sm">
                   ● Connected as {accounts.find(a => a.provider === 'gmail')?.email_address}
                 </span>
                 <button 
                   onClick={() => handleDisconnect(accounts.find(a => a.provider === 'gmail')!.id)}
                   className="text-red-600 hover:underline text-sm font-bold"
                 >
                   Disconnect
                 </button>
               </div>
            ) : (
              <button
                onClick={() => handleConnect('gmail')}
                className="bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 transition-colors"
              >
                Connect Gmail
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={disconnectConfirm.isOpen}
        onClose={disconnectConfirm.cancel}
        onConfirm={disconnectConfirm.confirm}
        title="Disconnect Account"
        message="Are you sure you want to disconnect this account?"
        confirmLabel="Disconnect"
        cancelLabel={disconnectConfirm.cancelLabel}
        variant="warning"
        isLoading={disconnectConfirm.isProcessing}
      />
    </div>
  );
};
