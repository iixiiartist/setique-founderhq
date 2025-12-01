import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Target, Users } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { logger } from '../../lib/logger';
import {
  calculateCampaignROI,
  analyzeChannelPerformance,
  getConversionFunnel,
  type CampaignAttribution,
  type ChannelPerformance,
} from '../../lib/services/marketingAttributionService';

export const MarketingAttributionDashboard: React.FC = () => {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignAttribution[]>([]);
  const [channels, setChannels] = useState<ChannelPerformance[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'channels' | 'funnel'>('campaigns');

  useEffect(() => {
    if (workspace) {
      loadAttributionData();
    }
  }, [workspace]);

  const loadAttributionData = async () => {
    if (!workspace) return;
    
    setLoading(true);
    try {
      const [campaignData, channelData, funnelData] = await Promise.all([
        calculateCampaignROI(workspace.id).catch(() => []),
        analyzeChannelPerformance(workspace.id).catch(() => []),
        getConversionFunnel(workspace.id).catch(() => null),
      ]);

      setCampaigns(campaignData);
      setChannels(channelData);
      setFunnel(funnelData);
    } catch (error) {
      // Silently handle errors - marketing tables may not exist yet
      setCampaigns([]);
      setChannels([]);
      setFunnel(null);
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
          <Target className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Marketing Attribution</h2>
        </div>
        <p className="text-gray-600">Track campaign ROI and channel performance</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 font-semibold rounded-t-xl transition-all ${
            activeTab === 'campaigns'
              ? 'bg-slate-900 text-white -mb-px'
              : 'bg-white text-slate-700 hover:bg-gray-50'
          }`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-4 py-2 font-semibold rounded-t-xl transition-all ${
            activeTab === 'channels'
              ? 'bg-slate-900 text-white -mb-px'
              : 'bg-white text-slate-700 hover:bg-gray-50'
          }`}
        >
          Channels
        </button>
        <button
          onClick={() => setActiveTab('funnel')}
          className={`px-4 py-2 font-semibold rounded-t-xl transition-all ${
            activeTab === 'funnel'
              ? 'bg-slate-900 text-white -mb-px'
              : 'bg-white text-slate-700 hover:bg-gray-50'
          }`}
        >
          Conversion Funnel
        </button>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-4">Campaign ROI Analysis</h3>
          {campaigns.length === 0 ? (
            <p className="text-gray-500 italic">No campaigns found. Create your first marketing campaign to start tracking ROI.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full rounded-xl overflow-hidden">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-3 text-left">Campaign</th>
                    <th className="p-3 text-left">Channel</th>
                    <th className="p-3 text-right">Spent</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">ROI</th>
                    <th className="p-3 text-right">Leads</th>
                    <th className="p-3 text-right">Conversions</th>
                    <th className="p-3 text-right">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign, index) => (
                    <tr key={index} className="border-t-2 border-black hover:bg-gray-50">
                      <td className="p-3 font-semibold">{campaign.campaignName}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                          {campaign.channel}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{formatCurrency(campaign.spent)}</td>
                      <td className="p-3 text-right font-mono text-green-600">
                        {formatCurrency(campaign.revenue)}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        campaign.roi >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercent(campaign.roi)}
                      </td>
                      <td className="p-3 text-right">{campaign.leads}</td>
                      <td className="p-3 text-right">{campaign.conversions}</td>
                      <td className="p-3 text-right">{formatPercent(campaign.conversionRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-600">Total Leads</h3>
              </div>
              <p className="text-3xl font-bold">
                {channels.reduce((sum, ch) => sum + ch.leads, 0)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-600">Total Revenue</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(channels.reduce((sum, ch) => sum + ch.revenue, 0))}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-600">Avg Deal Size</h3>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(
                  channels.reduce((sum, ch) => sum + ch.averageDealSize, 0) / Math.max(channels.length, 1)
                )}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Channel Performance</h3>
            {channels.length === 0 ? (
              <p className="text-gray-500 italic">No channel data available. Add contacts with source attribution to see insights.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full rounded-xl overflow-hidden">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-3 text-left">Channel</th>
                      <th className="p-3 text-right">Leads</th>
                      <th className="p-3 text-right">Deals Won</th>
                      <th className="p-3 text-right">Revenue</th>
                      <th className="p-3 text-right">Avg Deal Size</th>
                      <th className="p-3 text-right">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((channel, index) => (
                      <tr key={index} className="border-t-2 border-black hover:bg-gray-50">
                        <td className="p-3 font-semibold">{channel.channel}</td>
                        <td className="p-3 text-right">{channel.leads}</td>
                        <td className="p-3 text-right">{channel.deals}</td>
                        <td className="p-3 text-right font-mono text-green-600">
                          {formatCurrency(channel.revenue)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(channel.averageDealSize)}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {formatPercent(channel.conversionRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversion Funnel Tab */}
      {activeTab === 'funnel' && funnel && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-6">Conversion Funnel</h3>
          
          {/* Overall Conversion Rate */}
          <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-center">
              <p className="text-gray-600 mb-1">Overall Conversion Rate</p>
              <p className="text-4xl font-bold text-blue-600">
                {formatPercent(funnel.overallConversionRate)}
              </p>
            </div>
          </div>

          {/* Funnel Stages */}
          <div className="space-y-4">
            {funnel.stages.map((stage: any, index: number) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{stage.stage}</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold">{stage.count}</span>
                    <span className="text-gray-600 ml-2">({formatPercent(stage.percentage)})</span>
                  </div>
                </div>
                <div className="h-12 bg-gray-100 rounded-lg relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                    style={{ width: `${stage.percentage}%` }}
                  >
                    <div className="flex items-center justify-center h-full text-white font-semibold">
                      {stage.percentage >= 15 && formatPercent(stage.percentage)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadAttributionData}
          disabled={loading}
          className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl shadow-sm hover:bg-slate-800 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
};

export default MarketingAttributionDashboard;
