import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Calendar, BarChart3, PieChart } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

interface RevenueMetrics {
  totalRevenue: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  averageDealSize: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  churnRate: number;
  growthRate: number;
}

interface RevenueByProduct {
  productId: string;
  productName: string;
  revenue: number;
  deals: number;
  percentage: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export const RevenueAnalyticsDashboard: React.FC = () => {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [revenueByProduct, setRevenueByProduct] = useState<RevenueByProduct[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'trends'>('overview');

  useEffect(() => {
    if (workspace) {
      loadRevenueData();
    }
  }, [workspace]);

  const loadRevenueData = async () => {
    if (!workspace) return;
    
    setLoading(true);
    try {
      await Promise.all([
        calculateMetrics(),
        calculateRevenueByProduct(),
        calculateMonthlyTrends(),
      ]);
    } catch (error) {
      logger.error('Failed to load revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async () => {
    if (!workspace) return;

    try {
      // Get all revenue transactions
      const { data: transactions, error: transError } = await supabase
        .from('revenue_transactions')
        .select('amount, transaction_type, transaction_date, created_at')
        .eq('workspace_id', workspace.id)
        .order('transaction_date', { ascending: false });

      if (transError) throw transError;

      // Calculate total revenue
      const totalRevenue = (transactions || [])
        .filter(t => t.transaction_type === 'revenue')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Get all deals
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('value, stage, created_at, actual_close_date')
        .eq('workspace_id', workspace.id);

      if (dealsError) throw dealsError;

      // Calculate MRR/ARR (assuming recurring deals have 'subscription' category)
      const wonDeals = (deals || []).filter(d => d.stage === 'closed_won');
      const averageDealSize = wonDeals.length > 0
        ? wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length
        : 0;

      // Estimate MRR (simplified: total revenue / 12 months)
      const mrr = totalRevenue / 12;
      const arr = mrr * 12;

      // Get unique customers (contacts with won deals)
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, created_at')
        .eq('workspace_id', workspace.id);

      if (contactsError) throw contactsError;

      const totalCustomers = contacts?.length || 0;

      // New customers this month
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      const newCustomersThisMonth = (contacts || []).filter(c =>
        new Date(c.created_at) >= thisMonthStart
      ).length;

      // Calculate churn rate (simplified)
      const lastMonthStart = new Date();
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      
      const customersLastMonth = (contacts || []).filter(c =>
        new Date(c.created_at) < lastMonthStart
      ).length;

      const churnRate = customersLastMonth > 0
        ? ((customersLastMonth - totalCustomers) / customersLastMonth) * 100
        : 0;

      // Calculate growth rate (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const recentRevenue = (transactions || [])
        .filter(t => t.transaction_type === 'revenue' && new Date(t.transaction_date) >= threeMonthsAgo)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const previousRevenue = (transactions || [])
        .filter(t => {
          const date = new Date(t.transaction_date);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return t.transaction_type === 'revenue' && date >= sixMonthsAgo && date < threeMonthsAgo;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const growthRate = previousRevenue > 0
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

      setMetrics({
        totalRevenue,
        mrr,
        arr,
        averageDealSize,
        totalCustomers,
        newCustomersThisMonth,
        churnRate: Math.max(0, churnRate),
        growthRate,
      });
    } catch (error) {
      logger.error('Error calculating metrics:', error);
    }
  };

  const calculateRevenueByProduct = async () => {
    if (!workspace) return;

    try {
      // Get all won deals with product info
      const { data: deals, error } = await supabase
        .from('deals')
        .select('value, product_service_id, product_service_name, stage')
        .eq('workspace_id', workspace.id)
        .eq('stage', 'closed_won');

      if (error) throw error;

      // Group by product
      const productMap: { [key: string]: { name: string, revenue: number, count: number } } = {};
      
      (deals || []).forEach(deal => {
        const productId = deal.product_service_id || 'other';
        const productName = deal.product_service_name || 'Other';
        
        if (!productMap[productId]) {
          productMap[productId] = { name: productName, revenue: 0, count: 0 };
        }
        
        productMap[productId].revenue += deal.value || 0;
        productMap[productId].count += 1;
      });

      const totalRevenue = Object.values(productMap).reduce((sum, p) => sum + p.revenue, 0);

      const productRevenue: RevenueByProduct[] = Object.entries(productMap)
        .map(([id, data]) => ({
          productId: id,
          productName: data.name,
          revenue: data.revenue,
          deals: data.count,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setRevenueByProduct(productRevenue);
    } catch (error) {
      logger.error('Error calculating revenue by product:', error);
    }
  };

  const calculateMonthlyTrends = async () => {
    if (!workspace) return;

    try {
      // Get transactions for last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data: transactions, error } = await supabase
        .from('revenue_transactions')
        .select('amount, transaction_type, transaction_date')
        .eq('workspace_id', workspace.id)
        .gte('transaction_date', twelveMonthsAgo.toISOString())
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyMap: { [key: string]: { revenue: number, expenses: number } } = {};
      
      (transactions || []).forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { revenue: 0, expenses: 0 };
        }
        
        if (transaction.transaction_type === 'revenue') {
          monthlyMap[monthKey].revenue += transaction.amount || 0;
        } else if (transaction.transaction_type === 'expense') {
          monthlyMap[monthKey].expenses += transaction.amount || 0;
        }
      });

      const monthlyTrends: MonthlyRevenue[] = Object.entries(monthlyMap)
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      setMonthlyData(monthlyTrends);
    } catch (error) {
      logger.error('Error calculating monthly trends:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Revenue Analytics</h2>
        </div>
        <p className="text-gray-600">Track revenue, growth, and customer metrics</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-semibold rounded-t-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white -mb-px'
              : 'bg-white text-slate-700 hover:bg-gray-50'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-semibold rounded-t-xl transition-all ${
            activeTab === 'products'
              ? 'bg-slate-900 text-white -mb-px'
              : 'bg-white text-slate-700 hover:bg-gray-50'
          }`}
        >
          By Product
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-2 font-semibold rounded-t-xl transition-all ${
            activeTab === 'trends'
              ? 'bg-slate-900 text-white -mb-px'
              : 'bg-white text-slate-700 hover:bg-gray-50'
          }`}
        >
          Monthly Trends
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-600">Total Revenue</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(metrics.totalRevenue)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-600">MRR / ARR</h3>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</p>
              <p className="text-sm text-gray-600 mt-1">
                ARR: {formatCurrency(metrics.arr)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-600">Customers</h3>
              </div>
              <p className="text-3xl font-bold">{metrics.totalCustomers}</p>
              <p className="text-sm text-gray-600 mt-1">
                +{metrics.newCustomersThisMonth} this month
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-gray-600">Growth Rate</h3>
              </div>
              <p className={`text-3xl font-bold ${
                metrics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(metrics.growthRate)}
              </p>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Average Deal Size</h3>
              <p className="text-4xl font-bold text-blue-600">
                {formatCurrency(metrics.averageDealSize)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Churn Rate</h3>
              <p className={`text-4xl font-bold ${
                metrics.churnRate < 5 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(metrics.churnRate)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {metrics.churnRate < 5 ? '✅ Healthy' : '⚠️ Needs attention'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5" />
            <h3 className="text-xl font-semibold">Revenue by Product/Service</h3>
          </div>

          {revenueByProduct.length === 0 ? (
            <p className="text-gray-500 italic">No product revenue data available. Close deals with product assignments to see breakdown.</p>
          ) : (
            <div className="space-y-4">
              {revenueByProduct.map((product, index) => (
                <div key={index} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{product.productName}</h4>
                      <p className="text-sm text-gray-600">{product.deals} deals closed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(product.revenue)}
                      </p>
                      <p className="text-sm text-gray-600">{formatPercent(product.percentage)}</p>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                      style={{ width: `${product.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-6">Monthly Revenue Trends (Last 12 Months)</h3>

          {monthlyData.length === 0 ? (
            <p className="text-gray-500 italic">No monthly data available. Add revenue transactions to see trends.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full rounded-xl overflow-hidden">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-3 text-left">Month</th>
                    <th className="p-3 text-right text-green-300">Revenue</th>
                    <th className="p-3 text-right text-red-300">Expenses</th>
                    <th className="p-3 text-right font-bold">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((data, index) => (
                    <tr key={index} className="border-t-2 border-black hover:bg-gray-50">
                      <td className="p-3 font-semibold">{data.month}</td>
                      <td className="p-3 text-right font-mono text-green-600">
                        {formatCurrency(data.revenue)}
                      </td>
                      <td className="p-3 text-right font-mono text-red-600">
                        {formatCurrency(data.expenses)}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        data.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(data.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadRevenueData}
          disabled={loading}
          className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl shadow-sm hover:bg-slate-800 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh Analytics'}
        </button>
      </div>
    </div>
  );
};

export default RevenueAnalyticsDashboard;
