// components/settings/ApiBalanceSettings.tsx
// Settings component for managing API credit balance

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ============================================
// TYPES
// ============================================

interface ApiBalanceSettingsProps {
  workspaceId: string;
}

interface BalanceSummary {
  balance_cents: number;
  balance_dollars: number;
  estimated_calls_remaining: number;
  total_topped_up_cents: number;
  total_used_cents: number;
  calls_this_month: number;
  last_topup_at: string | null;
  last_usage_at: string | null;
}

interface BalanceTransaction {
  id: string;
  type: 'topup' | 'api_usage' | 'refund' | 'adjustment' | 'bonus';
  amount_cents: number;
  balance_after: number;
  description: string | null;
  created_at: string;
  api_request_count: number | null;
}

// Preset amounts for top-up
const TOPUP_AMOUNTS = [
  { cents: 500, label: '$5', calls: '5,000 calls' },
  { cents: 1000, label: '$10', calls: '10,000 calls' },
  { cents: 2500, label: '$25', calls: '25,000 calls' },
  { cents: 5000, label: '$50', calls: '50,000 calls' },
  { cents: 10000, label: '$100', calls: '100,000 calls' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export const ApiBalanceSettings: React.FC<ApiBalanceSettingsProps> = ({ workspaceId }) => {
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTopup, setLoadingTopup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [customAmountDollars, setCustomAmountDollars] = useState('');

  // Fetch balance summary
  const fetchSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_api_balance_summary', {
        p_workspace_id: workspaceId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setSummary(data[0]);
      } else {
        // Default empty state
        setSummary({
          balance_cents: 0,
          balance_dollars: 0,
          estimated_calls_remaining: 0,
          total_topped_up_cents: 0,
          total_used_cents: 0,
          calls_this_month: 0,
          last_topup_at: null,
          last_usage_at: null,
        });
      }
    } catch (err) {
      console.error('Error fetching balance summary:', err);
      setError('Failed to load balance');
    }
  }, [workspaceId]);

  // Fetch recent transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('api_balance_transactions')
        .select('id, type, amount_cents, balance_after, description, created_at, api_request_count')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, [workspaceId]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchTransactions()]);
      setLoading(false);
    };
    load();
  }, [fetchSummary, fetchTransactions]);

  // Handle top-up
  const handleTopup = async (amountCents: number) => {
    setLoadingTopup(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-balance-topup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            workspaceId,
            amountCents,
            successUrl: `${window.location.origin}/settings?tab=api&balance_added=true`,
            cancelUrl: `${window.location.origin}/settings?tab=api&balance_cancelled=true`,
            customerEmail: session?.user?.email,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Top-up error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate top-up');
    } finally {
      setLoadingTopup(false);
    }
  };

  // Handle custom amount top-up
  const handleCustomTopup = () => {
    const dollars = parseFloat(customAmountDollars);
    if (isNaN(dollars) || dollars < 5) {
      setError('Minimum top-up amount is $5');
      return;
    }
    if (dollars > 1000) {
      setError('Maximum top-up amount is $1000');
      return;
    }
    handleTopup(Math.round(dollars * 100));
  };

  // Check for success/cancel query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('balance_added') === 'true') {
      // Refresh data after successful top-up
      fetchSummary();
      fetchTransactions();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=api');
    }
  }, [fetchSummary, fetchTransactions]);

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format transaction type
  const formatType = (type: string) => {
    switch (type) {
      case 'topup': return '💳 Top-up';
      case 'api_usage': return '📡 API Usage';
      case 'refund': return '↩️ Refund';
      case 'adjustment': return '⚙️ Adjustment';
      case 'bonus': return '🎁 Bonus';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading balance information...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="p-6 border-2 border-black bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Current Balance</h3>
            <div className="text-4xl font-bold font-mono mt-1">
              ${summary?.balance_dollars?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              ≈ {summary?.estimated_calls_remaining?.toLocaleString() || 0} API calls remaining
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Rate: <span className="font-mono font-bold">$0.001/call</span></div>
            <div className="text-xs mt-1">1,000 calls = $1</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200">
          <div>
            <div className="text-xs text-gray-500">This Month</div>
            <div className="font-bold font-mono">{summary?.calls_this_month?.toLocaleString() || 0} calls</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Added</div>
            <div className="font-bold font-mono">${((summary?.total_topped_up_cents || 0) / 100).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Used</div>
            <div className="font-bold font-mono">${((summary?.total_used_cents || 0) / 100).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-300 text-red-800 text-sm">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add Balance Section */}
      <div className="p-4 border-2 border-black">
        <h4 className="font-bold mb-4">💰 Add Balance</h4>
        
        {/* Preset Amounts */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          {TOPUP_AMOUNTS.map(amount => (
            <button
              key={amount.cents}
              onClick={() => handleTopup(amount.cents)}
              disabled={loadingTopup}
              className="p-3 border-2 border-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="font-bold text-lg">{amount.label}</div>
              <div className="text-xs text-gray-500">{amount.calls}</div>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        {showCustomAmount ? (
          <div className="flex gap-2 items-center">
            <span className="font-bold">$</span>
            <input
              type="number"
              value={customAmountDollars}
              onChange={(e) => setCustomAmountDollars(e.target.value)}
              placeholder="Enter amount"
              min="5"
              max="1000"
              step="1"
              className="flex-1 border-2 border-black px-3 py-2 font-mono"
            />
            <button
              onClick={handleCustomTopup}
              disabled={loadingTopup}
              className="bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 disabled:opacity-50"
            >
              {loadingTopup ? 'Processing...' : 'Add Funds'}
            </button>
            <button
              onClick={() => setShowCustomAmount(false)}
              className="px-3 py-2 border-2 border-black hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomAmount(true)}
            className="text-sm text-gray-600 hover:text-black underline"
          >
            Enter custom amount
          </button>
        )}

        <p className="text-xs text-gray-500 mt-3">
          Secure payment via Stripe. Minimum: $5, Maximum: $1,000
        </p>
      </div>

      {/* Low Balance Warning */}
      {summary && summary.balance_cents < 500 && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-400">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-bold text-yellow-800">Low Balance Warning</div>
              <div className="text-sm text-yellow-700">
                Your balance is running low. API calls will fail with a 402 error when balance reaches $0.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="p-4 border-2 border-black">
        <h4 className="font-bold mb-4">📜 Recent Transactions</h4>
        
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No transactions yet
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.map(txn => (
              <div
                key={txn.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 border border-gray-200 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs">{formatType(txn.type)}</span>
                  <span className="text-gray-600 truncate max-w-[200px]">
                    {txn.description || (txn.api_request_count ? `${txn.api_request_count} API call(s)` : '')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-mono font-bold ${txn.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {txn.amount_cents >= 0 ? '+' : ''}${(txn.amount_cents / 100).toFixed(3)}
                  </span>
                  <span className="text-xs text-gray-400 w-28 text-right">
                    {formatDate(txn.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Info */}
      <div className="p-4 bg-blue-50 border-2 border-blue-300">
        <h4 className="font-bold text-blue-800 mb-2">ℹ️ How Billing Works</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Each API call costs <strong>$0.001</strong> (one tenth of a cent)</li>
          <li>• Balance is deducted only for <strong>successful</strong> requests (2xx responses)</li>
          <li>• Failed requests (4xx, 5xx errors) are <strong>free</strong></li>
          <li>• When balance reaches $0, API calls return <strong>402 Payment Required</strong></li>
          <li>• Balance never expires</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiBalanceSettings;
