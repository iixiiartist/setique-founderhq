import React, { useState, useMemo } from 'react';
import { DashboardData, AppActions } from '../../types';
import { Link2, TrendingUp, DollarSign, Users, Filter } from 'lucide-react';

interface AttributionModuleProps {
  data: DashboardData;
  actions: AppActions;
  workspaceId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatDate = (date: string | number) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function AttributionModule({
  data,
  actions,
  workspaceId,
}: AttributionModuleProps) {
  const campaignAttributions = data?.campaignAttributions || [];
  const marketingItems = data?.marketing || [];
  const crmItems = [...(data?.investors || []), ...(data?.customers || []), ...(data?.partners || [])];
  const contacts = crmItems.flatMap(item => item.contacts || []);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    marketingItemId: '',
    crmItemId: '',
    contactId: '',
    attributionType: 'first_touch' as 'first_touch' | 'last_touch' | 'multi_touch',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
  });

  // Filter attributions
  const filteredAttributions = useMemo(() => {
    let filtered = campaignAttributions;

    if (filterType !== 'all') {
      filtered = filtered.filter(attr => attr.attributionType === filterType);
    }

    if (filterCampaign !== 'all') {
      filtered = filtered.filter(attr => attr.marketingItemId === filterCampaign);
    }

    return filtered.sort((a, b) => 
      new Date(b.interactionDate).getTime() - new Date(a.interactionDate).getTime()
    );
  }, [campaignAttributions, filterType, filterCampaign]);

  // Calculate attribution metrics
  const metrics = useMemo(() => {
    const totalAttributed = filteredAttributions.reduce((sum, attr) => sum + (attr.revenueAttributed || 0), 0);
    const totalConversions = filteredAttributions.filter(attr => attr.conversionDate).length;
    const avgRevenuePerAttribution = filteredAttributions.length > 0 ? totalAttributed / filteredAttributions.length : 0;

    // Attribution by type
    const byType = {
      first_touch: filteredAttributions.filter(a => a.attributionType === 'first_touch').length,
      last_touch: filteredAttributions.filter(a => a.attributionType === 'last_touch').length,
      multi_touch: filteredAttributions.filter(a => a.attributionType === 'multi_touch').length,
    };

    // Top performing campaigns
    const campaignRevenue: { [key: string]: number } = {};
    filteredAttributions.forEach(attr => {
      if (!campaignRevenue[attr.marketingItemId]) {
        campaignRevenue[attr.marketingItemId] = 0;
      }
      campaignRevenue[attr.marketingItemId] += attr.revenueAttributed || 0;
    });

    return {
      totalAttributed,
      totalConversions,
      avgRevenuePerAttribution,
      byType,
      campaignRevenue,
    };
  }, [filteredAttributions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.marketingItemId || !formData.crmItemId) {
      alert('Please select both a campaign and a CRM deal');
      return;
    }

    if (!workspaceId) {
      alert('Workspace ID not available');
      return;
    }

    await actions.createCampaignAttribution({
      workspaceId: workspaceId,
      marketingItemId: formData.marketingItemId,
      crmItemId: formData.crmItemId,
      contactId: formData.contactId || undefined,
      attributionType: formData.attributionType,
      attributionWeight: 1.0, // Default weight
      interactionDate: Date.now(),
      revenueAttributed: 0, // Will be calculated later
      utmSource: formData.utmSource || undefined,
      utmMedium: formData.utmMedium || undefined,
      utmCampaign: formData.utmCampaign || undefined,
    });

    // Reset form
    setFormData({
      marketingItemId: '',
      crmItemId: '',
      contactId: '',
      attributionType: 'first_touch',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Campaign Attribution</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 border-2 border-black shadow-neo-btn hover:bg-purple-700 transition-colors font-semibold"
        >
          <Link2 className="w-4 h-4" />
          Link Deal to Campaign
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 border-2 border-green-600 shadow-neo">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div className="text-sm text-gray-600">Total Attributed Revenue</div>
          </div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(metrics.totalAttributed)}</div>
        </div>

        <div className="bg-blue-50 p-4 border-2 border-blue-600 shadow-neo">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <div className="text-sm text-gray-600">Conversions</div>
          </div>
          <div className="text-2xl font-bold text-blue-700">{metrics.totalConversions}</div>
        </div>

        <div className="bg-purple-50 p-4 border-2 border-purple-600 shadow-neo">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-600" />
            <div className="text-sm text-gray-600">Total Attributions</div>
          </div>
          <div className="text-2xl font-bold text-purple-700">{filteredAttributions.length}</div>
        </div>

        <div className="bg-orange-50 p-4 border-2 border-orange-600 shadow-neo">
          <div className="text-sm text-gray-600 mb-1">Avg Revenue / Attribution</div>
          <div className="text-2xl font-bold text-orange-700">
            {formatCurrency(metrics.avgRevenuePerAttribution)}
          </div>
        </div>
      </div>

      {/* Attribution Type Breakdown */}
      <div className="bg-white p-6 border-2 border-black shadow-neo">
        <h3 className="text-lg font-semibold mb-4">Attribution Model Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 border-2 border-blue-300">
            <div className="text-sm text-gray-600 mb-1">First Touch</div>
            <div className="text-3xl font-bold text-blue-700">{metrics.byType.first_touch}</div>
          </div>
          <div className="text-center p-4 bg-purple-50 border-2 border-purple-300">
            <div className="text-sm text-gray-600 mb-1">Last Touch</div>
            <div className="text-3xl font-bold text-purple-700">{metrics.byType.last_touch}</div>
          </div>
          <div className="text-center p-4 bg-green-50 border-2 border-green-300">
            <div className="text-sm text-gray-600 mb-1">Multi Touch</div>
            <div className="text-3xl font-bold text-green-700">{metrics.byType.multi_touch}</div>
          </div>
        </div>
      </div>

      {/* Attribution Form */}
      {showForm && (
        <div className="bg-white p-6 border-2 border-black shadow-neo">
          <h3 className="text-xl font-semibold mb-4">Create Attribution Link</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Marketing Campaign *</label>
                <select
                  value={formData.marketingItemId}
                  onChange={(e) => setFormData({ ...formData, marketingItemId: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select a campaign...</option>
                  {marketingItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">CRM Deal *</label>
                <select
                  value={formData.crmItemId}
                  onChange={(e) => setFormData({ ...formData, crmItemId: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select a deal...</option>
                  {crmItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.company} - {'dealValue' in item && item.dealValue ? formatCurrency(item.dealValue) : 'No value'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Contact (Optional)</label>
                <select
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a contact...</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.email ? `(${contact.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Attribution Type</label>
                <select
                  value={formData.attributionType}
                  onChange={(e) => setFormData({ ...formData, attributionType: e.target.value as any })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  <option value="first_touch">First Touch</option>
                  <option value="last_touch">Last Touch</option>
                  <option value="multi_touch">Multi Touch</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="utm-source" className="block text-sm font-semibold mb-1">UTM Source</label>
                <input
                  id="utm-source"
                  name="utm-source"
                  type="text"
                  value={formData.utmSource}
                  onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="google"
                />
              </div>
              <div>
                <label htmlFor="utm-medium" className="block text-sm font-semibold mb-1">UTM Medium</label>
                <input
                  id="utm-medium"
                  name="utm-medium"
                  type="text"
                  value={formData.utmMedium}
                  onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="cpc"
                />
              </div>
              <div>
                <label htmlFor="utm-campaign" className="block text-sm font-semibold mb-1">UTM Campaign</label>
                <input
                  id="utm-campaign"
                  name="utm-campaign"
                  type="text"
                  value={formData.utmCampaign}
                  onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="summer_sale_2024"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border-2 border-black bg-purple-600 text-white hover:bg-purple-700 font-semibold shadow-neo-btn"
              >
                Create Attribution
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 border-2 border-black shadow-neo">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-semibold">Filters:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 border-2 border-black text-sm font-mono focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="first_touch">First Touch</option>
            <option value="last_touch">Last Touch</option>
            <option value="multi_touch">Multi Touch</option>
          </select>
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="px-3 py-1 border-2 border-black text-sm font-mono focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Campaigns</option>
            {marketingItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attributions List */}
      <div className="bg-white p-6 border-2 border-black shadow-neo">
        <h3 className="text-xl font-semibold mb-4">Attribution History</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {filteredAttributions.length > 0 ? (
            filteredAttributions.map((attribution) => {
              const campaign = marketingItems.find(m => m.id === attribution.marketingItemId);
              const deal = crmItems.find(c => c.id === attribution.crmItemId);
              const contact = attribution.contactId ? contacts.find(c => c.id === attribution.contactId) : null;

              return (
                <div key={attribution.id} className="p-4 border-2 border-black shadow-neo hover:shadow-neo-hover transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-400">
                          {attribution.attributionType.replace('_', ' ').toUpperCase()}
                        </span>
                        {attribution.conversionDate && (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 border border-green-400">
                            ✓ CONVERTED
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="text-xs text-gray-500">Campaign</div>
                          <div className="font-semibold">{campaign?.title || 'Unknown'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Deal</div>
                          <div className="font-semibold">{deal?.company || 'Unknown'}</div>
                        </div>
                      </div>

                      {contact && (
                        <div className="mb-2">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-400">
                            👤 {contact.name}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                        <span>Interaction: {formatDate(attribution.interactionDate)}</span>
                        {attribution.conversionDate && (
                          <span>Conversion: {formatDate(attribution.conversionDate)}</span>
                        )}
                        {attribution.revenueAttributed > 0 && (
                          <span className="font-semibold text-green-700">
                            Revenue: {formatCurrency(attribution.revenueAttributed)}
                          </span>
                        )}
                      </div>

                      {(attribution.utmSource || attribution.utmMedium || attribution.utmCampaign) && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {attribution.utmSource && (
                            <span className="px-2 py-1 bg-gray-100 border border-gray-300 font-mono">
                              source: {attribution.utmSource}
                            </span>
                          )}
                          {attribution.utmMedium && (
                            <span className="px-2 py-1 bg-gray-100 border border-gray-300 font-mono">
                              medium: {attribution.utmMedium}
                            </span>
                          )}
                          {attribution.utmCampaign && (
                            <span className="px-2 py-1 bg-gray-100 border border-gray-300 font-mono">
                              campaign: {attribution.utmCampaign}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => actions.deleteCampaignAttribution(attribution.id)}
                      className="px-3 py-1 text-xs bg-white text-red-600 border border-black hover:bg-red-50 font-semibold ml-4"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No attributions yet</p>
              <p className="text-xs mt-1">Link deals to campaigns to track attribution</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
