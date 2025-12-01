import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { logger } from '../../lib/logger';
import {
  calculateRunway,
  predictRevenue,
  forecastCashFlow,
  type RunwayData,
  type RevenueProjection,
  type CashFlowForecast,
} from '../../lib/services/financialForecastService';

export const FinancialForecastingModule: React.FC = () => {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [runwayData, setRunwayData] = useState<RunwayData | null>(null);
  const [revenueProjections, setRevenueProjections] = useState<RevenueProjection[]>([]);
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowForecast[]>([]);
  const [activeTab, setActiveTab] = useState<'runway' | 'revenue' | 'cashflow'>('runway');

  useEffect(() => {
    if (workspace) {
      loadForecastData();
    }
  }, [workspace]);

  const loadForecastData = async () => {
    if (!workspace) return;
    
    setLoading(true);
    try {
      const [runway, projections, forecast] = await Promise.all([
        calculateRunway(workspace.id),
        predictRevenue(workspace.id, 6),
        forecastCashFlow(workspace.id, 6),
      ]);

      setRunwayData(runway);
      setRevenueProjections(projections);
      setCashFlowForecast(forecast);
    } catch (error) {
      logger.error('Failed to load forecast data:', error);
    } finally {
      setLoading(false);
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
    }).format(date);
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
          <TrendingUp className="w-6 h-6" />
          <h2 className="text-2xl font-semibold text-slate-900">Financial Forecasting</h2>
        </div>
        <p className="text-gray-600">Predict your financial future with data-driven insights</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('runway')}
          className={`px-4 py-2 font-medium rounded-t-xl transition-all ${
            activeTab === 'runway'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
        >
          Cash Runway
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`px-4 py-2 font-medium rounded-t-xl transition-all ${
            activeTab === 'revenue'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
        >
          Revenue Forecast
        </button>
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`px-4 py-2 font-medium rounded-t-xl transition-all ${
            activeTab === 'cashflow'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
        >
          Cash Flow
        </button>
      </div>

      {/* Runway Tab */}
      {activeTab === 'runway' && runwayData && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-600">Current Cash</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(runwayData.currentCash)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <h3 className="font-medium text-gray-600">Monthly Burn Rate</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(runwayData.monthlyBurnRate)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-600">Runway</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {runwayData.runwayMonths === Infinity
                  ? '∞'
                  : `${runwayData.runwayMonths.toFixed(1)} months`}
              </p>
              {runwayData.runwayMonths !== Infinity && (
                <p className="text-sm text-gray-600 mt-2">
                  Until {formatDate(runwayData.runoutDate)}
                </p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="text-xl font-semibold text-slate-900">Recommendations</h3>
            </div>
            <ul className="space-y-3">
              {runwayData.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 p-3 bg-gray-50 border-l-4 border-blue-500">
                  <span className="text-lg">{rec.split(' ')[0]}</span>
                  <span className="flex-1">{rec.substring(rec.indexOf(' ') + 1)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Revenue Forecast Tab */}
      {activeTab === 'revenue' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Revenue Projections (6 Months)</h3>
          <div className="overflow-x-auto">
            <table className="w-full rounded-xl overflow-hidden border border-gray-200">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-3 text-left">Month</th>
                  <th className="p-3 text-right">Projected Revenue</th>
                  <th className="p-3 text-right">Actual Revenue</th>
                  <th className="p-3 text-center">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {revenueProjections.map((projection, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="p-3 font-medium text-slate-900">{projection.month}</td>
                    <td className="p-3 text-right font-mono">
                      {formatCurrency(projection.projectedRevenue)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {projection.actualRevenue
                        ? formatCurrency(projection.actualRevenue)
                        : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          projection.confidence === 'high'
                            ? 'bg-green-100 text-green-800'
                            : projection.confidence === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {projection.confidence.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cash Flow Forecast Tab */}
      {activeTab === 'cashflow' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Cash Flow Forecast (6 Months)</h3>
          <div className="overflow-x-auto">
            <table className="w-full rounded-xl overflow-hidden border border-gray-200">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-3 text-left">Month</th>
                  <th className="p-3 text-right">Opening</th>
                  <th className="p-3 text-right text-green-300">+ Income</th>
                  <th className="p-3 text-right text-red-300">− Expenses</th>
                  <th className="p-3 text-right font-bold">Closing</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowForecast.map((forecast, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="p-3 font-medium text-slate-900">{forecast.month}</td>
                    <td className="p-3 text-right font-mono">
                      {formatCurrency(forecast.openingBalance)}
                    </td>
                    <td className="p-3 text-right font-mono text-green-600">
                      {formatCurrency(forecast.income)}
                    </td>
                    <td className="p-3 text-right font-mono text-red-600">
                      {formatCurrency(forecast.expenses)}
                    </td>
                    <td className={`p-3 text-right font-semibold ${
                      forecast.closingBalance < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(forecast.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadForecastData}
          disabled={loading}
          className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh Forecast'}
        </button>
      </div>
    </div>
  );
};

export default FinancialForecastingModule;
