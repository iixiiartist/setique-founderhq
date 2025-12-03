// components/settings/ApiBalanceSettings.tsx
// Settings component for managing API credit balance

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { createBalanceTopup, manageAutoReload } from '../../lib/services/apiClient';

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

interface AutoReloadSettings {
  id: string;
  is_enabled: boolean;
  threshold_cents: number;
  reload_amount_cents: number;
  stripe_payment_method_id: string | null;
  last_reload_at: string | null;
  last_reload_error: string | null;
  consecutive_failures: number;
}

// Preset amounts for top-up
const TOPUP_AMOUNTS = [
  { cents: 500, label: '$5', calls: '5,000 calls' },
  { cents: 1000, label: '$10', calls: '10,000 calls' },
  { cents: 2500, label: '$25', calls: '25,000 calls' },
  { cents: 5000, label: '$50', calls: '50,000 calls' },
  { cents: 10000, label: '$100', calls: '100,000 calls' },
];

// Auto-reload threshold options
const THRESHOLD_OPTIONS = [
  { cents: 100, label: '$1' },
  { cents: 500, label: '$5' },
  { cents: 1000, label: '$10' },
  { cents: 2500, label: '$25' },
];

// Auto-reload amount options
const RELOAD_AMOUNT_OPTIONS = [
  { cents: 1000, label: '$10' },
  { cents: 2500, label: '$25' },
  { cents: 5000, label: '$50' },
  { cents: 10000, label: '$100' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export const ApiBalanceSettings: React.FC<ApiBalanceSettingsProps> = ({ workspaceId }) => {
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [autoReload, setAutoReload] = useState<AutoReloadSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTopup, setLoadingTopup] = useState(false);
  const [loadingAutoReload, setLoadingAutoReload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [customAmountDollars, setCustomAmountDollars] = useState('');
  const [showAutoReloadSetup, setShowAutoReloadSetup] = useState(false);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState(500);
  const [autoReloadAmount, setAutoReloadAmount] = useState(2500);

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

  // Fetch auto-reload settings
  const fetchAutoReload = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('api_balance_auto_reload')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setAutoReload(data);
        setAutoReloadThreshold(data.threshold_cents);
        setAutoReloadAmount(data.reload_amount_cents);
      }
    } catch (err) {
      console.error('Error fetching auto-reload settings:', err);
    }
  }, [workspaceId]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchTransactions(), fetchAutoReload()]);
      setLoading(false);
    };
    load();
  }, [fetchSummary, fetchTransactions, fetchAutoReload]);

  // Handle top-up
  const handleTopup = async (amountCents: number) => {
    setLoadingTopup(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await createBalanceTopup({
        workspaceId,
        amountCents,
        successUrl: `${window.location.origin}/settings?tab=api&balance_added=true`,
        cancelUrl: `${window.location.origin}/settings?tab=api&balance_cancelled=true`,
        customerEmail: session?.user?.email,
      });

      if (error) {
        throw new Error(error);
      }

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Top-up error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add balance');
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

  // Setup auto-reload with Stripe SetupIntent
  const handleSetupAutoReload = async () => {
    setLoadingAutoReload(true);
    setError(null);

    try {
      const { data, error } = await manageAutoReload({
        action: 'setup',
        workspaceId,
        thresholdCents: autoReloadThreshold,
        reloadAmountCents: autoReloadAmount,
        successUrl: `${window.location.origin}/settings?tab=api&auto_reload_setup=true`,
        cancelUrl: `${window.location.origin}/settings?tab=api&auto_reload_cancelled=true`,
      });

      if (error) {
        throw new Error(error);
      }

      // Redirect to Stripe to add payment method
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Auto-reload setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup auto-reload');
    } finally {
      setLoadingAutoReload(false);
    }
  };

  // Toggle auto-reload on/off
  const handleToggleAutoReload = async (enabled: boolean) => {
    setLoadingAutoReload(true);
    setError(null);

    try {
      const { error } = await manageAutoReload({
        action: 'toggle',
        workspaceId,
        enabled,
      });

      if (error) {
        throw new Error(error);
      }

      // Refresh auto-reload settings
      await fetchAutoReload();
    } catch (err) {
      console.error('Auto-reload toggle error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update auto-reload');
    } finally {
      setLoadingAutoReload(false);
    }
  };

  // Update auto-reload settings
  const handleUpdateAutoReloadSettings = async () => {
    setLoadingAutoReload(true);
    setError(null);

    try {
      const { error } = await manageAutoReload({
        action: 'update',
        workspaceId,
        thresholdCents: autoReloadThreshold,
        reloadAmountCents: autoReloadAmount,
      });

      if (error) {
        throw new Error(error);
      }

      // Refresh auto-reload settings
      await fetchAutoReload();
      setShowAutoReloadSetup(false);
    } catch (err) {
      console.error('Auto-reload update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoadingAutoReload(false);
    }
  };

  // Remove payment method
  const handleRemovePaymentMethod = async () => {
    if (!confirm('Remove your saved payment method? Auto-reload will be disabled.')) {
      return;
    }

    setLoadingAutoReload(true);
    setError(null);

    try {
      const { error } = await manageAutoReload({
        action: 'remove',
        workspaceId,
      });

      if (error) {
        throw new Error(error);
      }

      // Refresh auto-reload settings
      setAutoReload(null);
    } catch (err) {
      console.error('Remove payment method error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
    } finally {
      setLoadingAutoReload(false);
    }
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
    if (params.get('auto_reload_setup') === 'true') {
      // Refresh auto-reload settings after setup
      fetchAutoReload();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=api');
    }
  }, [fetchSummary, fetchTransactions, fetchAutoReload]);

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
      <div className="p-6 rounded-2xl border border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Current Balance</h3>
            <div className="text-4xl font-bold mt-1 text-slate-900">
              ${summary?.balance_dollars?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              ≈ {summary?.estimated_calls_remaining?.toLocaleString() || 0} API calls remaining
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Rate: <span className="font-semibold">$0.001/call</span></div>
            <div className="text-xs mt-1">1,000 calls = $1</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200">
          <div>
            <div className="text-xs text-gray-500">This Month</div>
            <div className="font-semibold text-slate-900">{summary?.calls_this_month?.toLocaleString() || 0} calls</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Added</div>
            <div className="font-semibold text-slate-900">${((summary?.total_topped_up_cents || 0) / 100).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Used</div>
            <div className="font-semibold text-slate-900">${((summary?.total_used_cents || 0) / 100).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-800 text-sm">
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
      <div className="p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h4 className="font-semibold text-slate-900 mb-4">💰 Add Balance</h4>
        
        {/* Preset Amounts */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          {TOPUP_AMOUNTS.map(amount => (
            <button
              key={amount.cents}
              onClick={() => handleTopup(amount.cents)}
              disabled={loadingTopup}
              className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <div className="font-semibold text-lg text-slate-900">{amount.label}</div>
              <div className="text-xs text-gray-500">{amount.calls}</div>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        {showCustomAmount ? (
          <div className="flex gap-2 items-center">
            <span className="font-semibold text-slate-900">$</span>
            <input
              type="number"
              value={customAmountDollars}
              onChange={(e) => setCustomAmountDollars(e.target.value)}
              placeholder="Enter amount"
              min="5"
              max="1000"
              step="1"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <button
              onClick={handleCustomTopup}
              disabled={loadingTopup}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loadingTopup ? 'Processing...' : 'Add Funds'}
            </button>
            <button
              onClick={() => setShowCustomAmount(false)}
              className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
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
      {summary && summary.balance_cents < 500 && !autoReload?.is_enabled && (
        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-semibold text-yellow-800">Low Balance Warning</div>
              <div className="text-sm text-yellow-700">
                Your balance is running low. API calls will fail with a 402 error when balance reaches $0.
                <button 
                  onClick={() => setShowAutoReloadSetup(true)}
                  className="ml-1 underline hover:no-underline"
                >
                  Set up auto-reload →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Reload Section */}
      <div className="p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-900">🔄 Auto-Reload</h4>
          {autoReload?.stripe_payment_method_id && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoReload?.is_enabled || false}
                onChange={(e) => handleToggleAutoReload(e.target.checked)}
                disabled={loadingAutoReload}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium">
                {autoReload?.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          )}
        </div>

        {/* No payment method saved yet */}
        {!autoReload?.stripe_payment_method_id && !showAutoReloadSetup && (
          <div className="text-center py-6 rounded-xl border border-dashed border-gray-300 bg-gray-50">
            <p className="text-gray-600 mb-3">
              Never run out of API balance! Set up automatic reloading.
            </p>
            <button
              onClick={() => setShowAutoReloadSetup(true)}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              Set Up Auto-Reload
            </button>
          </div>
        )}

        {/* Auto-reload setup form */}
        {showAutoReloadSetup && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reload when balance drops below:
              </label>
              <div className="flex gap-2 flex-wrap">
                {THRESHOLD_OPTIONS.map(opt => (
                  <button
                    key={opt.cents}
                    onClick={() => setAutoReloadThreshold(opt.cents)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      autoReloadThreshold === opt.cents
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reload amount:
              </label>
              <div className="flex gap-2 flex-wrap">
                {RELOAD_AMOUNT_OPTIONS.map(opt => (
                  <button
                    key={opt.cents}
                    onClick={() => setAutoReloadAmount(opt.cents)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      autoReloadAmount === opt.cents
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              {autoReload?.stripe_payment_method_id ? (
                // Already has payment method - just update settings
                <button
                  onClick={handleUpdateAutoReloadSettings}
                  disabled={loadingAutoReload}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {loadingAutoReload ? 'Saving...' : 'Save Settings'}
                </button>
              ) : (
                // Need to add payment method
                <button
                  onClick={handleSetupAutoReload}
                  disabled={loadingAutoReload}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {loadingAutoReload ? 'Processing...' : 'Add Payment Method'}
                </button>
              )}
              <button
                onClick={() => setShowAutoReloadSetup(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active auto-reload display */}
        {autoReload?.stripe_payment_method_id && !showAutoReloadSetup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-600">Payment Method</span>
              <span className="text-sm font-medium text-slate-900">•••• Card on file</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-600">Reload when below</span>
              <span className="font-semibold text-slate-900">${(autoReload.threshold_cents / 100).toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-600">Reload amount</span>
              <span className="font-semibold text-slate-900">${(autoReload.reload_amount_cents / 100).toFixed(0)}</span>
            </div>
            {autoReload.last_reload_at && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-sm text-gray-600">Last reload</span>
                <span className="text-sm">{formatDate(autoReload.last_reload_at)}</span>
              </div>
            )}
            {autoReload.last_reload_error && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
                <strong>Last error:</strong> {autoReload.last_reload_error}
                {autoReload.consecutive_failures > 0 && (
                  <span className="ml-2">({autoReload.consecutive_failures} failures)</span>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAutoReloadSetup(true)}
                className="text-sm text-gray-600 hover:text-black underline"
              >
                Edit settings
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleRemovePaymentMethod}
                disabled={loadingAutoReload}
                className="text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
              >
                Remove payment method
              </button>
            </div>
          </div>
        )}

        {/* Info about auto-reload */}
        {!autoReload?.stripe_payment_method_id && !showAutoReloadSetup && (
          <p className="text-xs text-gray-500 mt-3">
            Your card will be charged automatically when your balance drops below the threshold.
          </p>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h4 className="font-semibold text-slate-900 mb-4">📜 Recent Transactions</h4>
        
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No transactions yet
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.map(txn => (
              <div
                key={txn.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl border border-gray-200 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs">{formatType(txn.type)}</span>
                  <span className="text-gray-600 truncate max-w-[200px]">
                    {txn.description || (txn.api_request_count ? `${txn.api_request_count} API call(s)` : '')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-semibold ${txn.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">ℹ️ How Billing Works</h4>
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
