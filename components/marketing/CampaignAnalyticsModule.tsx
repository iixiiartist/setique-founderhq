import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, AppActions } from '../../types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Eye, MousePointer, Users, DollarSign, Target } from 'lucide-react';
import * as MarketingService from '../../lib/services/marketingService';

interface CampaignAnalyticsModuleProps {
  data: DashboardData;
  actions: AppActions;
  workspaceId: string;
}

const CHANNEL_COLORS: { [key: string]: string } = {
  email: '#3b82f6',
  social: '#8b5cf6',
  paid_ads: '#ef4444',
  content: '#10b981',
  events: '#f59e0b',
  other: '#6b7280',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

function CampaignAnalyticsModule({
  data,
  actions,
  workspaceId,
}: CampaignAnalyticsModuleProps) {
  const marketingItems = data?.marketing || [];
  const marketingAnalytics = data?.marketingAnalytics || [];
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [campaignMetrics, setCampaignMetrics] = useState<{ [key: string]: any }>({});

  // Load campaign-specific metrics
  useEffect(() => {
    if (marketingItems.length === 0) {
      setCampaignMetrics({});
      return;
    }

    let isCancelled = false;

    const loadCampaignMetrics = async () => {
      try {
        const metricsEntries = await Promise.all(
          marketingItems.map(async campaign => {
            const [summary, roi] = await Promise.all([
              MarketingService.getCampaignAnalyticsSummary(campaign.id),
              MarketingService.calculateCampaignROI(campaign.id),
            ]);

            return [campaign.id, { ...summary, ...roi }] as const;
          })
        );

        if (!isCancelled) {
          setCampaignMetrics(Object.fromEntries(metricsEntries));
        }
      } catch (error) {
        console.error('Failed to load campaign metrics', error);
        if (!isCancelled) {
          setCampaignMetrics({});
        }
      }
    };

    loadCampaignMetrics();

    return () => {
      isCancelled = true;
    };
  }, [marketingItems]);

  useEffect(() => {
    if (selectedCampaign !== 'all' && !marketingItems.some(campaign => campaign.id === selectedCampaign)) {
      setSelectedCampaign('all');
    }
  }, [marketingItems, selectedCampaign]);

  // Filter analytics by time range
  const filteredAnalytics = useMemo(() => {
    const daysAgo = parseInt(timeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let analytics = marketingAnalytics.filter(a => a.analyticsDate >= cutoffStr);

    if (selectedCampaign !== 'all') {
      analytics = analytics.filter(a => a.marketingItemId === selectedCampaign);
    }

    return analytics;
  }, [marketingAnalytics, timeRange, selectedCampaign]);

  // Aggregate metrics
  const aggregateMetrics = useMemo(() => {
    const totals = filteredAnalytics.reduce(
      (acc, analytics) => ({
        impressions: acc.impressions + (analytics.impressions || 0),
        clicks: acc.clicks + (analytics.clicks || 0),
        engagements: acc.engagements + (analytics.engagements || 0),
        conversions: acc.conversions + (analytics.conversions || 0),
        leads: acc.leads + (analytics.leadsGenerated || 0),
        revenue: acc.revenue + (analytics.revenueGenerated || 0),
        spend: acc.spend + (analytics.adSpend || 0),
      }),
      { impressions: 0, clicks: 0, engagements: 0, conversions: 0, leads: 0, revenue: 0, spend: 0 }
    );

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
    const roi = totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0;
    const costPerLead = totals.leads > 0 ? totals.spend / totals.leads : 0;
    const costPerConversion = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

    return {
      ...totals,
      ctr,
      conversionRate,
      roi,
      costPerLead,
      costPerConversion,
    };
  }, [filteredAnalytics]);

  // Channel performance data
  const channelData = useMemo(() => {
    const channels: { [key: string]: any } = {};

    filteredAnalytics.forEach(analytics => {
      const channel = analytics.channel || 'other';
      if (!channels[channel]) {
        channels[channel] = {
          channel,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          spend: 0,
        };
      }

      channels[channel].impressions += analytics.impressions || 0;
      channels[channel].clicks += analytics.clicks || 0;
      channels[channel].conversions += analytics.conversions || 0;
      channels[channel].revenue += analytics.revenueGenerated || 0;
      channels[channel].spend += analytics.adSpend || 0;
    });

    return Object.values(channels).map((ch: any) => ({
      ...ch,
      ctr: ch.impressions > 0 ? (ch.clicks / ch.impressions) * 100 : 0,
      roi: ch.spend > 0 ? ((ch.revenue - ch.spend) / ch.spend) * 100 : 0,
    }));
  }, [filteredAnalytics]);

  // Daily trend data
  const trendData = useMemo(() => {
    const dailyData: { [key: string]: any } = {};

    filteredAnalytics.forEach(analytics => {
      const date = analytics.analyticsDate;
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        };
      }

      dailyData[date].impressions += analytics.impressions || 0;
      dailyData[date].clicks += analytics.clicks || 0;
      dailyData[date].conversions += analytics.conversions || 0;
      dailyData[date].revenue += analytics.revenueGenerated || 0;
    });

    return Object.values(dailyData)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((d: any) => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
  }, [filteredAnalytics]);

  // Campaign performance comparison
  const campaignComparison = useMemo(() => {
    return marketingItems.map(campaign => {
      const metrics = campaignMetrics[campaign.id] || {};
      return {
        name: campaign.title.length > 20 ? campaign.title.substring(0, 20) + '...' : campaign.title,
        spend: campaign.actualSpend || 0,
        revenue: metrics.totalRevenue || 0,
        roi: metrics.roiPercentage || 0,
        conversions: metrics.totalConversions || 0,
      };
    });
  }, [marketingItems, campaignMetrics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Campaign Analytics</h2>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Campaigns</option>
            {marketingItems.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7' | '30' | '90')}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-600" />
            <div className="text-xs text-gray-600">Impressions</div>
          </div>
          <div className="text-xl font-bold text-blue-700">{formatNumber(aggregateMetrics.impressions)}</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MousePointer className="w-4 h-4 text-purple-600" />
            <div className="text-xs text-gray-600">Clicks</div>
          </div>
          <div className="text-xl font-bold text-purple-700">{formatNumber(aggregateMetrics.clicks)}</div>
          <div className="text-xs text-gray-500">CTR: {aggregateMetrics.ctr.toFixed(2)}%</div>
        </div>

        <div className="bg-green-50 p-4 rounded-2xl border border-green-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-green-600" />
            <div className="text-xs text-gray-600">Leads</div>
          </div>
          <div className="text-xl font-bold text-green-700">{formatNumber(aggregateMetrics.leads)}</div>
        </div>

        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-orange-600" />
            <div className="text-xs text-gray-600">Conversions</div>
          </div>
          <div className="text-xl font-bold text-orange-700">{formatNumber(aggregateMetrics.conversions)}</div>
          <div className="text-xs text-gray-500">Rate: {aggregateMetrics.conversionRate.toFixed(2)}%</div>
        </div>

        <div className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-red-600" />
            <div className="text-xs text-gray-600">Spend</div>
          </div>
          <div className="text-xl font-bold text-red-700">{formatCurrency(aggregateMetrics.spend)}</div>
          <div className="text-xs text-gray-500">CPL: {formatCurrency(aggregateMetrics.costPerLead)}</div>
        </div>

        <div className="bg-teal-50 p-4 rounded-2xl border border-teal-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <div className="text-xs text-gray-600">ROI</div>
          </div>
          <div className={`text-xl font-bold ${aggregateMetrics.roi >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
            {aggregateMetrics.roi >= 0 ? '+' : ''}{aggregateMetrics.roi.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Revenue: {formatCurrency(aggregateMetrics.revenue)}</div>
        </div>
      </div>

      {/* Performance Trend */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Performance Trend</h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#374151" />
              <YAxis tick={{ fontSize: 12 }} stroke="#374151" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid black',
                  borderRadius: 0,
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} name="Impressions" />
              <Line type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} name="Clicks" />
              <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No analytics data available for this period</p>
          </div>
        )}
      </div>

      {/* Channel Performance & Campaign Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Performance */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-4">Channel Performance</h3>
          {channelData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={channelData}
                    dataKey="spend"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.channel] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {channelData.map((channel, index) => (
                  <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded border border-gray-200"
                        style={{ backgroundColor: CHANNEL_COLORS[channel.channel] || '#6b7280' }}
                      />
                      <span className="font-semibold capitalize">{channel.channel.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs">{formatCurrency(channel.spend)}</div>
                      <div className={`text-xs ${channel.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ROI: {channel.roi.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No channel data available</p>
            </div>
          )}
        </div>

        {/* Campaign Comparison */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-4">Campaign Comparison</h3>
          {campaignComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#374151" angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} stroke="#374151" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'ROI') return `${value}%`;
                    if (name === 'Spend' || name === 'Revenue') return formatCurrency(value);
                    return value;
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid black',
                    borderRadius: 0,
                  }}
                />
                <Legend />
                <Bar dataKey="spend" fill="#ef4444" name="Spend" />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No campaigns to compare</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Campaign Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 px-3 font-semibold">Campaign</th>
                <th className="text-right py-2 px-3 font-semibold">Budget</th>
                <th className="text-right py-2 px-3 font-semibold">Spend</th>
                <th className="text-right py-2 px-3 font-semibold">Leads</th>
                <th className="text-right py-2 px-3 font-semibold">Conv.</th>
                <th className="text-right py-2 px-3 font-semibold">Revenue</th>
                <th className="text-right py-2 px-3 font-semibold">ROI</th>
              </tr>
            </thead>
            <tbody>
              {marketingItems.map((campaign) => {
                const metrics = campaignMetrics[campaign.id] || {};
                return (
                  <tr key={campaign.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2 px-3 font-semibold">{campaign.title}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(campaign.campaignBudget || 0)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(campaign.actualSpend || 0)}</td>
                    <td className="text-right py-2 px-3">{metrics.totalLeads || 0}</td>
                    <td className="text-right py-2 px-3">{metrics.totalConversions || 0}</td>
                    <td className="text-right py-2 px-3 text-green-700">
                      {formatCurrency(metrics.totalRevenue || 0)}
                    </td>
                    <td className={`text-right py-2 px-3 font-semibold ${(metrics.roiPercentage || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {(metrics.roiPercentage || 0) >= 0 ? '+' : ''}{(metrics.roiPercentage || 0).toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CampaignAnalyticsModule;
