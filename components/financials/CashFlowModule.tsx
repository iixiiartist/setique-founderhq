import React, { useMemo, useState } from 'react';
import { DashboardData } from '../../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

interface CashFlowModuleProps {
  data: DashboardData;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function CashFlowModule({
  data,
}: CashFlowModuleProps) {
  const revenueTransactions = data?.revenueTransactions || [];
  const expenses = data?.expenses || [];
  
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Calculate monthly cash flow data
  const cashFlowData = useMemo(() => {
    const monthlyData: { [key: string]: { revenue: number; expenses: number; netCashFlow: number } } = {};

    // Process revenue
    revenueTransactions
      .filter(tx => tx.status === 'paid')
      .forEach(tx => {
        const month = tx.transactionDate.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, expenses: 0, netCashFlow: 0 };
        }
        monthlyData[month].revenue += tx.amount;
      });

    // Process expenses
    expenses.forEach(exp => {
      const month = exp.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0, netCashFlow: 0 };
      }
      monthlyData[month].expenses += exp.amount;
    });

    // Calculate net cash flow and format for chart
    const chartData = Object.keys(monthlyData)
      .sort()
      .map(month => {
        const data = monthlyData[month];
        const netCashFlow = data.revenue - data.expenses;
        return {
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          monthKey: month,
          revenue: data.revenue,
          expenses: data.expenses,
          netCashFlow,
        };
      });

    // Group by quarter if needed
    if (viewMode === 'quarterly') {
      const quarterlyData: { [key: string]: { revenue: number; expenses: number; netCashFlow: number } } = {};
      
      chartData.forEach(item => {
        const date = new Date(item.monthKey + '-01');
        const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
        
        if (!quarterlyData[quarter]) {
          quarterlyData[quarter] = { revenue: 0, expenses: 0, netCashFlow: 0 };
        }
        
        quarterlyData[quarter].revenue += item.revenue;
        quarterlyData[quarter].expenses += item.expenses;
        quarterlyData[quarter].netCashFlow += item.netCashFlow;
      });

      return Object.keys(quarterlyData).map(quarter => ({
        month: quarter,
        monthKey: quarter,
        ...quarterlyData[quarter],
      }));
    }

    return chartData;
  }, [revenueTransactions, expenses, viewMode]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const last3Months = cashFlowData.slice(-3);
    const last6Months = cashFlowData.slice(-6);

    const totalRevenue = last3Months.reduce((sum, d) => sum + d.revenue, 0);
    const totalExpenses = last3Months.reduce((sum, d) => sum + d.expenses, 0);
    const netCashFlow = totalRevenue - totalExpenses;

    const avgMonthlyRevenue = totalRevenue / Math.max(last3Months.length, 1);
    const avgMonthlyExpenses = totalExpenses / Math.max(last3Months.length, 1);

    // Calculate burn rate (average monthly expenses)
    const burnRate = avgMonthlyExpenses;

    // Calculate runway (assuming constant burn and no revenue)
    // This is a simplified calculation - real apps would use actual cash balance
    const estimatedCashBalance = netCashFlow * 3; // Placeholder
    const runway = burnRate > 0 ? estimatedCashBalance / burnRate : Infinity;

    // Calculate growth rate
    let revenueGrowthRate = 0;
    if (last3Months.length >= 2) {
      const firstMonth = last3Months[0].revenue;
      const lastMonth = last3Months[last3Months.length - 1].revenue;
      revenueGrowthRate = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
    }

    return {
      totalRevenue,
      totalExpenses,
      netCashFlow,
      avgMonthlyRevenue,
      avgMonthlyExpenses,
      burnRate,
      runway,
      revenueGrowthRate,
    };
  }, [cashFlowData]);

  const ChartComponent = chartType === 'line' ? LineChart : BarChart;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Cash Flow Analysis</h2>
        </div>
        <div className="flex gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'monthly' | 'quarterly')}
            className="px-3 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
            className="px-3 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Net Cash Flow (3mo)</div>
            {metrics.netCashFlow >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className={`text-2xl font-bold ${metrics.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(metrics.netCashFlow)}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Avg Monthly Revenue</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(metrics.avgMonthlyRevenue)}</div>
        </div>

        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Burn Rate</div>
          <div className="text-2xl font-bold text-orange-700">{formatCurrency(metrics.burnRate)}/mo</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Runway
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {metrics.runway === Infinity ? '∞' : `${Math.floor(metrics.runway)} mo`}
          </div>
        </div>
      </div>

      {/* Revenue Growth */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-600">Revenue Growth (3mo)</div>
          <div className="flex items-center gap-2">
            {metrics.revenueGrowthRate >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-xl font-bold ${metrics.revenueGrowthRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {metrics.revenueGrowthRate >= 0 ? '+' : ''}{metrics.revenueGrowthRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Cash Flow Trend</h3>
        {cashFlowData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <ChartComponent data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                stroke="#374151"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#374151"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid black',
                  borderRadius: 0,
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="square"
              />
              {chartType === 'line' ? (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Revenue"
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    name="Expenses"
                    dot={{ fill: '#ef4444', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="netCashFlow" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Net Cash Flow"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                </>
              ) : (
                <>
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  <Bar dataKey="netCashFlow" fill="#3b82f6" name="Net Cash Flow" />
                </>
              )}
            </ChartComponent>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No cash flow data available</p>
            <p className="text-xs mt-1">Add revenue and expenses to see cash flow analysis</p>
          </div>
        )}
      </div>

      {/* Summary Table */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Period Summary (Last 3 Months)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 px-3 font-semibold">Period</th>
                <th className="text-right py-2 px-3 font-semibold">Revenue</th>
                <th className="text-right py-2 px-3 font-semibold">Expenses</th>
                <th className="text-right py-2 px-3 font-semibold">Net Cash Flow</th>
                <th className="text-right py-2 px-3 font-semibold">Margin</th>
              </tr>
            </thead>
            <tbody>
              {cashFlowData.slice(-3).map((data, index) => {
                const margin = data.revenue > 0 ? ((data.netCashFlow / data.revenue) * 100) : 0;
                return (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-sm">{data.month}</td>
                    <td className="text-right py-2 px-3 text-green-700 font-semibold">
                      {formatCurrency(data.revenue)}
                    </td>
                    <td className="text-right py-2 px-3 text-red-700 font-semibold">
                      {formatCurrency(data.expenses)}
                    </td>
                    <td className={`text-right py-2 px-3 font-bold ${data.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(data.netCashFlow)}
                    </td>
                    <td className={`text-right py-2 px-3 font-semibold ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td className="py-2 px-3">Total</td>
                <td className="text-right py-2 px-3 text-green-700">
                  {formatCurrency(metrics.totalRevenue)}
                </td>
                <td className="text-right py-2 px-3 text-red-700">
                  {formatCurrency(metrics.totalExpenses)}
                </td>
                <td className={`text-right py-2 px-3 ${metrics.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(metrics.netCashFlow)}
                </td>
                <td className="text-right py-2 px-3">
                  {metrics.totalRevenue > 0 ? ((metrics.netCashFlow / metrics.totalRevenue) * 100).toFixed(1) : '0'}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CashFlowModule;
