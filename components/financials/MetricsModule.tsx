import React, { useMemo, useState, useEffect } from 'react';
import { DashboardData } from '../../types';
import { TrendingUp, Users, DollarSign, Target, Clock, AlertTriangle } from 'lucide-react';
import * as FinancialService from '../../lib/services/financialService';

interface MetricsModuleProps {
  data: DashboardData;
  workspaceId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

function MetricsModule({
  data,
  workspaceId,
}: MetricsModuleProps) {
  const revenueTransactions = data?.revenueTransactions || [];
  const expenses = data?.expenses || [];
  const crmItems = [...(data?.investors || []), ...(data?.customers || []), ...(data?.partners || [])];
  
  const [timeRange, setTimeRange] = useState<'30' | '90' | '180'>('90');
  const [metrics, setMetrics] = useState({
    mrr: 0,
    arr: 0,
    cac: 0,
    ltv: 0,
    burnRate: 0,
    runway: 0,
    cashBalance: 0,
  });
  const [loading, setLoading] = useState(false);

  // Calculate advanced metrics
  useEffect(() => {
    const calculateMetrics = async () => {
      setLoading(true);
      try {
        const currentMonth = new Date().toISOString().slice(0, 10).substring(0, 7) + '-01';
        
        // Calculate date range
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
        const startDateStr = startDate.toISOString().split('T')[0];

        // Calculate MRR and ARR
        const mrr = await FinancialService.calculateMRR(workspaceId, currentMonth);
        const arr = await FinancialService.calculateARR(workspaceId, currentMonth);

        // Calculate CAC
        const cac = await FinancialService.calculateCAC(workspaceId, startDateStr, endDate);

        // Calculate LTV
        const ltv = await FinancialService.calculateLTV(workspaceId);

        // Calculate Burn Rate
        const burnRate = await FinancialService.calculateBurnRate(workspaceId, currentMonth);

        // Calculate estimated cash balance (simplified)
        const totalRevenue = revenueTransactions
          .filter(tx => tx.status === 'paid')
          .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const cashBalance = Math.max(totalRevenue - totalExpenses, 0);

        // Calculate Runway
        const runway = await FinancialService.calculateRunway(workspaceId, cashBalance);

        setMetrics({
          mrr,
          arr,
          cac,
          ltv,
          burnRate,
          runway,
          cashBalance,
        });
      } catch (error) {
        console.error('Error calculating metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateMetrics();
  }, [workspaceId, timeRange, revenueTransactions, expenses]);

  // Calculate additional insights
  const insights = useMemo(() => {
    const ltvCacRatio = metrics.cac > 0 ? metrics.ltv / metrics.cac : 0;
    const monthsToRecoverCac = metrics.mrr > 0 ? metrics.cac / metrics.mrr : 0;
    
    // Calculate CAC Payback Period
    const cacPaybackPeriod = monthsToRecoverCac;

    // Growth metrics
    const last3MonthsRevenue = revenueTransactions
      .filter(tx => {
        const txDate = new Date(tx.transactionDate);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return tx.status === 'paid' && txDate >= threeMonthsAgo;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const previous3MonthsRevenue = revenueTransactions
      .filter(tx => {
        const txDate = new Date(tx.transactionDate);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return tx.status === 'paid' && txDate >= sixMonthsAgo && txDate < threeMonthsAgo;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const revenueGrowthRate = previous3MonthsRevenue > 0
      ? ((last3MonthsRevenue - previous3MonthsRevenue) / previous3MonthsRevenue) * 100
      : 0;

    // Customer metrics
    const totalCustomers = new Set(
      revenueTransactions
        .filter(tx => tx.crmItemId)
        .map(tx => tx.crmItemId)
    ).size;

    const activeCustomers = new Set(
      revenueTransactions
        .filter(tx => {
          const txDate = new Date(tx.transactionDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return tx.status === 'paid' && txDate >= thirtyDaysAgo && tx.crmItemId;
        })
        .map(tx => tx.crmItemId)
    ).size;

    return {
      ltvCacRatio,
      cacPaybackPeriod,
      revenueGrowthRate,
      totalCustomers,
      activeCustomers,
    };
  }, [metrics, revenueTransactions]);

  // Health indicators
  const getHealthStatus = () => {
    const warnings: string[] = [];
    const successes: string[] = [];

    if (metrics.runway < 3 && metrics.runway > 0) {
      warnings.push(`Low runway: Only ${Math.floor(metrics.runway)} months remaining`);
    } else if (metrics.runway >= 12) {
      successes.push(`Healthy runway: ${Math.floor(metrics.runway)} months`);
    }

    if (insights.ltvCacRatio >= 3) {
      successes.push(`Strong LTV:CAC ratio: ${insights.ltvCacRatio.toFixed(1)}x`);
    } else if (insights.ltvCacRatio < 3 && insights.ltvCacRatio > 0) {
      warnings.push(`LTV:CAC ratio below 3x (currently ${insights.ltvCacRatio.toFixed(1)}x)`);
    }

    if (insights.cacPaybackPeriod > 12) {
      warnings.push(`Long CAC payback: ${Math.floor(insights.cacPaybackPeriod)} months`);
    } else if (insights.cacPaybackPeriod <= 12 && insights.cacPaybackPeriod > 0) {
      successes.push(`Good CAC payback: ${Math.floor(insights.cacPaybackPeriod)} months`);
    }

    if (insights.revenueGrowthRate > 20) {
      successes.push(`Strong growth: ${insights.revenueGrowthRate.toFixed(1)}% QoQ`);
    } else if (insights.revenueGrowthRate < 0) {
      warnings.push(`Negative growth: ${insights.revenueGrowthRate.toFixed(1)}% QoQ`);
    }

    return { warnings, successes };
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Key Metrics Dashboard</h2>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '30' | '90' | '180')}
          className="px-3 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="180">Last 180 Days</option>
        </select>
      </div>

      {/* Health Status */}
      {(health.warnings.length > 0 || health.successes.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {health.warnings.length > 0 && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Action Required</h3>
              </div>
              <ul className="space-y-1 text-sm text-red-800">
                {health.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          {health.successes.length > 0 && (
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Healthy Metrics</h3>
              </div>
              <ul className="space-y-1 text-sm text-green-800">
                {health.successes.map((success, i) => (
                  <li key={i}>• {success}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <div className="text-sm text-gray-600">MRR</div>
          </div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(metrics.mrr)}</div>
          <div className="text-xs text-gray-600 mt-1">Monthly Recurring Revenue</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-600" />
            <div className="text-sm text-gray-600">ARR</div>
          </div>
          <div className="text-2xl font-bold text-purple-700">{formatCurrency(metrics.arr)}</div>
          <div className="text-xs text-gray-600 mt-1">Annual Recurring Revenue</div>
        </div>

        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-orange-600" />
            <div className="text-sm text-gray-600">CAC</div>
          </div>
          <div className="text-2xl font-bold text-orange-700">{formatCurrency(metrics.cac)}</div>
          <div className="text-xs text-gray-600 mt-1">Customer Acquisition Cost</div>
        </div>

        <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-green-600" />
            <div className="text-sm text-gray-600">LTV</div>
          </div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(metrics.ltv)}</div>
          <div className="text-xs text-gray-600 mt-1">Lifetime Value</div>
        </div>
      </div>

      {/* Financial Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <div className="text-sm text-gray-600">Cash Runway</div>
          </div>
          <div className="text-2xl font-bold">
            {metrics.runway === Infinity ? '∞' : `${Math.floor(metrics.runway)} mo`}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Balance: {formatCurrency(metrics.cashBalance)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Burn Rate</div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.burnRate)}</div>
          <div className="text-xs text-gray-500 mt-1">per month</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">LTV:CAC Ratio</div>
          <div className={`text-2xl font-bold ${insights.ltvCacRatio >= 3 ? 'text-green-700' : 'text-orange-700'}`}>
            {insights.ltvCacRatio > 0 ? `${insights.ltvCacRatio.toFixed(1)}x` : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target: 3x or higher
          </div>
        </div>
      </div>

      {/* Growth & Customer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Growth Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Revenue Growth (QoQ)</span>
              <span className={`text-lg font-bold ${insights.revenueGrowthRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {insights.revenueGrowthRate >= 0 ? '+' : ''}{insights.revenueGrowthRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">CAC Payback Period</span>
              <span className="text-lg font-bold">
                {insights.cacPaybackPeriod > 0 ? `${Math.floor(insights.cacPaybackPeriod)} mo` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Active Customers</span>
              <span className="text-lg font-bold">{insights.activeCustomers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Customers</span>
              <span className="text-lg font-bold">{insights.totalCustomers}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Unit Economics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Avg Revenue Per Customer</span>
              <span className="text-lg font-bold">
                {insights.totalCustomers > 0
                  ? formatCurrency(
                      revenueTransactions
                        .filter(tx => tx.status === 'paid')
                        .reduce((sum, tx) => sum + tx.amount, 0) / insights.totalCustomers
                    )
                  : '$0'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Gross Margin</span>
              <span className="text-lg font-bold">
                {revenueTransactions.length > 0
                  ? `${(
                      ((revenueTransactions
                        .filter(tx => tx.status === 'paid')
                        .reduce((sum, tx) => sum + tx.amount, 0) -
                        expenses.reduce((sum, exp) => sum + exp.amount, 0)) /
                        revenueTransactions
                          .filter(tx => tx.status === 'paid')
                          .reduce((sum, tx) => sum + tx.amount, 0)) *
                      100
                    ).toFixed(1)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Magic Number</span>
              <span className="text-lg font-bold">
                {metrics.cac > 0 && metrics.mrr > 0
                  ? formatNumber(metrics.mrr / metrics.cac)
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rule of 40</span>
              <span className={`text-lg font-bold ${insights.revenueGrowthRate + 20 >= 40 ? 'text-green-700' : 'text-orange-700'}`}>
                {(insights.revenueGrowthRate + 20).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Definitions */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold mb-3">Metric Definitions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
          <div>
            <strong>MRR:</strong> Monthly recurring revenue from subscription-based transactions
          </div>
          <div>
            <strong>CAC:</strong> Total sales & marketing expenses divided by new customers acquired
          </div>
          <div>
            <strong>LTV:</strong> Average revenue per customer over their lifetime
          </div>
          <div>
            <strong>Burn Rate:</strong> Average monthly operating expenses
          </div>
          <div>
            <strong>LTV:CAC Ratio:</strong> Lifetime value divided by acquisition cost (target: 3x+)
          </div>
          <div>
            <strong>CAC Payback:</strong> Months to recover customer acquisition cost
          </div>
          <div>
            <strong>Magic Number:</strong> Net new MRR divided by sales & marketing spend
          </div>
          <div>
            <strong>Rule of 40:</strong> Growth rate + profit margin (target: 40%+)
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetricsModule;
