import { supabase } from '../supabase';
import type {
  CampaignAttribution,
  MarketingAnalytics,
  MarketingCalendarLink,
  MarketingItem,
} from '../../types';

// ============================================================================
// CAMPAIGN ATTRIBUTION
// ============================================================================

export async function createCampaignAttribution(
  attribution: Omit<CampaignAttribution, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CampaignAttribution | null> {
  try {
    const { data, error } = await supabase
      .from('campaign_attribution')
      .insert([attribution])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating campaign attribution:', error);
    return null;
  }
}

export async function updateCampaignAttribution(
  id: string,
  updates: Partial<Omit<CampaignAttribution, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<CampaignAttribution | null> {
  try {
    const { data, error } = await supabase
      .from('campaign_attribution')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating campaign attribution:', error);
    return null;
  }
}

export async function deleteCampaignAttribution(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('campaign_attribution')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting campaign attribution:', error);
    return false;
  }
}

export async function getCampaignAttributions(
  workspaceId: string,
  filters?: {
    marketingItemId?: string;
    crmItemId?: string;
    attributionType?: 'first_touch' | 'last_touch' | 'multi_touch';
  }
): Promise<CampaignAttribution[]> {
  try {
    let query = supabase
      .from('campaign_attribution')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('interaction_date', { ascending: false });

    if (filters?.marketingItemId) {
      query = query.eq('marketing_item_id', filters.marketingItemId);
    }
    if (filters?.crmItemId) {
      query = query.eq('crm_item_id', filters.crmItemId);
    }
    if (filters?.attributionType) {
      query = query.eq('attribution_type', filters.attributionType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching campaign attributions:', error);
    return [];
  }
}

/**
 * Link a CRM lead/deal to a marketing campaign
 */
export async function attributeLeadToCampaign(
  workspaceId: string,
  marketingItemId: string,
  crmItemId: string,
  contactId: string | null,
  attributionType: 'first_touch' | 'last_touch' | 'multi_touch' = 'first_touch',
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  }
): Promise<CampaignAttribution | null> {
  return createCampaignAttribution({
    workspaceId,
    marketingItemId,
    crmItemId,
    contactId,
    attributionType,
    attributionWeight: 1.0,
    interactionDate: Date.now(),
    utmSource: utmParams?.source,
    utmMedium: utmParams?.medium,
    utmCampaign: utmParams?.campaign,
    utmContent: utmParams?.content,
    revenueAttributed: 0,
  });
}

/**
 * Update attribution with conversion and revenue data
 */
export async function recordConversion(
  attributionId: string,
  revenueAttributed: number
): Promise<CampaignAttribution | null> {
  return updateCampaignAttribution(attributionId, {
    conversionDate: Date.now(),
    revenueAttributed,
  });
}

// ============================================================================
// MARKETING ANALYTICS
// ============================================================================

export async function createMarketingAnalytics(
  analytics: Omit<MarketingAnalytics, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MarketingAnalytics | null> {
  try {
    const { data, error } = await supabase
      .from('marketing_analytics')
      .insert([analytics])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating marketing analytics:', error);
    return null;
  }
}

export async function updateMarketingAnalytics(
  id: string,
  updates: Partial<Omit<MarketingAnalytics, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<MarketingAnalytics | null> {
  try {
    const { data, error } = await supabase
      .from('marketing_analytics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating marketing analytics:', error);
    return null;
  }
}

export async function deleteMarketingAnalytics(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('marketing_analytics')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting marketing analytics:', error);
    return false;
  }
}

export async function getMarketingAnalytics(
  workspaceId: string,
  filters?: {
    marketingItemId?: string;
    startDate?: string;
    endDate?: string;
    channel?: 'email' | 'social' | 'paid_ads' | 'content' | 'events' | 'other';
  }
): Promise<MarketingAnalytics[]> {
  try {
    let query = supabase
      .from('marketing_analytics')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('analytics_date', { ascending: false });

    if (filters?.marketingItemId) {
      query = query.eq('marketing_item_id', filters.marketingItemId);
    }
    if (filters?.startDate) {
      query = query.gte('analytics_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('analytics_date', filters.endDate);
    }
    if (filters?.channel) {
      query = query.eq('channel', filters.channel);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching marketing analytics:', error);
    return [];
  }
}

/**
 * Aggregate analytics for a campaign across all channels and dates
 */
export async function getCampaignAnalyticsSummary(
  marketingItemId: string
): Promise<{
  totalImpressions: number;
  totalClicks: number;
  totalEngagements: number;
  totalConversions: number;
  totalLeads: number;
  totalRevenue: number;
  totalAdSpend: number;
  averageCTR: number;
  averageConversionRate: number;
  roi: number;
  costPerLead: number;
  costPerConversion: number;
}> {
  try {
    const { data, error } = await supabase
      .from('marketing_analytics')
      .select('*')
      .eq('marketing_item_id', marketingItemId);

    if (error) throw error;

    const analytics = data || [];

    const totalImpressions = analytics.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalClicks = analytics.reduce((sum, a) => sum + (a.clicks || 0), 0);
    const totalEngagements = analytics.reduce((sum, a) => sum + (a.engagements || 0), 0);
    const totalConversions = analytics.reduce((sum, a) => sum + (a.conversions || 0), 0);
    const totalLeads = analytics.reduce((sum, a) => sum + (a.leads_generated || 0), 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + Number(a.revenue_generated || 0), 0);
    const totalAdSpend = analytics.reduce((sum, a) => sum + Number(a.ad_spend || 0), 0);

    const averageCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averageConversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
    const roi = totalAdSpend > 0 ? (totalRevenue - totalAdSpend) / totalAdSpend : 0;
    const costPerLead = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
    const costPerConversion = totalConversions > 0 ? totalAdSpend / totalConversions : 0;

    return {
      totalImpressions,
      totalClicks,
      totalEngagements,
      totalConversions,
      totalLeads,
      totalRevenue,
      totalAdSpend,
      averageCTR,
      averageConversionRate,
      roi,
      costPerLead,
      costPerConversion,
    };
  } catch (error) {
    console.error('Error getting campaign analytics summary:', error);
    return {
      totalImpressions: 0,
      totalClicks: 0,
      totalEngagements: 0,
      totalConversions: 0,
      totalLeads: 0,
      totalRevenue: 0,
      totalAdSpend: 0,
      averageCTR: 0,
      averageConversionRate: 0,
      roi: 0,
      costPerLead: 0,
      costPerConversion: 0,
    };
  }
}

// ============================================================================
// MARKETING CALENDAR LINKS
// ============================================================================

export async function createMarketingCalendarLink(
  link: Omit<MarketingCalendarLink, 'id' | 'createdAt'>
): Promise<MarketingCalendarLink | null> {
  try {
    const { data, error } = await supabase
      .from('marketing_calendar_links')
      .insert([link])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating marketing calendar link:', error);
    return null;
  }
}

export async function deleteMarketingCalendarLink(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('marketing_calendar_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting marketing calendar link:', error);
    return false;
  }
}

export async function getMarketingCalendarLinks(
  workspaceId: string,
  marketingItemId?: string
): Promise<MarketingCalendarLink[]> {
  try {
    let query = supabase
      .from('marketing_calendar_links')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (marketingItemId) {
      query = query.eq('marketing_item_id', marketingItemId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching marketing calendar links:', error);
    return [];
  }
}

/**
 * Link a campaign to a calendar event or task
 */
export async function linkCampaignToCalendar(
  workspaceId: string,
  marketingItemId: string,
  linkedId: string,
  linkedType: 'task' | 'calendar_event' | 'milestone',
  relationshipType: 'related' | 'deliverable' | 'milestone' | 'deadline' = 'related'
): Promise<MarketingCalendarLink | null> {
  return createMarketingCalendarLink({
    workspaceId,
    marketingItemId,
    linkedId,
    linkedType,
    relationshipType,
  });
}

/**
 * Get all calendar items linked to a campaign
 */
export async function getCampaignCalendarItems(
  marketingItemId: string,
  workspaceId: string
): Promise<{
  tasks: any[];
  calendarEvents: any[];
  milestones: any[];
}> {
  try {
    const links = await getMarketingCalendarLinks(workspaceId, marketingItemId);

    const taskIds = links.filter(l => l.linkedType === 'task').map(l => l.linkedId);
    const eventIds = links.filter(l => l.linkedType === 'calendar_event').map(l => l.linkedId);
    const milestoneIds = links.filter(l => l.linkedType === 'milestone').map(l => l.linkedId);

    // Fetch tasks
    let tasks: any[] = [];
    if (taskIds.length > 0) {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds);
      tasks = tasksData || [];
    }

    // Fetch calendar events (assuming you have a calendar_events table)
    let calendarEvents: any[] = [];
    if (eventIds.length > 0) {
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('*')
        .in('id', eventIds);
      calendarEvents = eventsData || [];
    }

    // Milestones might be tasks with a special flag
    let milestones: any[] = [];
    if (milestoneIds.length > 0) {
      const { data: milestonesData } = await supabase
        .from('tasks')
        .select('*')
        .in('id', milestoneIds);
      milestones = milestonesData || [];
    }

    return {
      tasks,
      calendarEvents,
      milestones,
    };
  } catch (error) {
    console.error('Error getting campaign calendar items:', error);
    return {
      tasks: [],
      calendarEvents: [],
      milestones: [],
    };
  }
}

// ============================================================================
// CAMPAIGN ROI CALCULATIONS
// ============================================================================

/**
 * Calculate campaign ROI
 */
export async function calculateCampaignROI(
  marketingItemId: string
): Promise<{
  totalRevenue: number;
  totalSpend: number;
  roi: number;
  roiPercentage: number;
}> {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_items')
      .select('actual_spend')
      .eq('id', marketingItemId)
      .single();

    if (campaignError) throw campaignError;

    const actualSpend = Number(campaign?.actual_spend || 0);

    // Get attributed revenue
    const { data: attributions, error: attrError } = await supabase
      .from('campaign_attribution')
      .select('revenue_attributed')
      .eq('marketing_item_id', marketingItemId);

    if (attrError) throw attrError;

    const totalRevenue = attributions?.reduce((sum, attr) => sum + Number(attr.revenue_attributed || 0), 0) || 0;

    // Also get revenue from analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from('marketing_analytics')
      .select('revenue_generated, ad_spend')
      .eq('marketing_item_id', marketingItemId);

    if (analyticsError) throw analyticsError;

    const analyticsRevenue = analytics?.reduce((sum, a) => sum + Number(a.revenue_generated || 0), 0) || 0;
    const analyticsSpend = analytics?.reduce((sum, a) => sum + Number(a.ad_spend || 0), 0) || 0;

    // Combine revenue sources (avoid double counting)
    const combinedRevenue = Math.max(totalRevenue, analyticsRevenue);
    const combinedSpend = Math.max(actualSpend, analyticsSpend);

    const roi = combinedSpend > 0 ? (combinedRevenue - combinedSpend) / combinedSpend : 0;
    const roiPercentage = roi * 100;

    return {
      totalRevenue: combinedRevenue,
      totalSpend: combinedSpend,
      roi,
      roiPercentage,
    };
  } catch (error) {
    console.error('Error calculating campaign ROI:', error);
    return {
      totalRevenue: 0,
      totalSpend: 0,
      roi: 0,
      roiPercentage: 0,
    };
  }
}

/**
 * Calculate channel performance across all campaigns
 */
export async function calculateChannelPerformance(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  roi: number;
  ctr: number;
  conversionRate: number;
}>> {
  try {
    let query = supabase
      .from('marketing_analytics')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (startDate) {
      query = query.gte('analytics_date', startDate);
    }
    if (endDate) {
      query = query.lte('analytics_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by channel
    const channelData: { [key: string]: any } = {};

    data?.forEach(analytics => {
      const channel = analytics.channel || 'other';
      if (!channelData[channel]) {
        channelData[channel] = {
          channel,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          spend: 0,
        };
      }

      channelData[channel].impressions += analytics.impressions || 0;
      channelData[channel].clicks += analytics.clicks || 0;
      channelData[channel].conversions += analytics.conversions || 0;
      channelData[channel].revenue += Number(analytics.revenue_generated || 0);
      channelData[channel].spend += Number(analytics.ad_spend || 0);
    });

    // Calculate metrics
    return Object.values(channelData).map(channel => ({
      ...channel,
      roi: channel.spend > 0 ? (channel.revenue - channel.spend) / channel.spend : 0,
      ctr: channel.impressions > 0 ? channel.clicks / channel.impressions : 0,
      conversionRate: channel.clicks > 0 ? channel.conversions / channel.clicks : 0,
    }));
  } catch (error) {
    console.error('Error calculating channel performance:', error);
    return [];
  }
}

/**
 * Get marketing funnel metrics
 */
export async function getMarketingFunnel(
  workspaceId: string,
  marketingItemId?: string,
  startDate?: string,
  endDate?: string
): Promise<{
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  funnelConversionRate: number;
  leadsToConversionsRate: number;
}> {
  try {
    let query = supabase
      .from('marketing_analytics')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (marketingItemId) {
      query = query.eq('marketing_item_id', marketingItemId);
    }
    if (startDate) {
      query = query.gte('analytics_date', startDate);
    }
    if (endDate) {
      query = query.lte('analytics_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const impressions = data?.reduce((sum, a) => sum + (a.impressions || 0), 0) || 0;
    const clicks = data?.reduce((sum, a) => sum + (a.clicks || 0), 0) || 0;
    const leads = data?.reduce((sum, a) => sum + (a.leads_generated || 0), 0) || 0;
    const conversions = data?.reduce((sum, a) => sum + (a.conversions || 0), 0) || 0;
    const revenue = data?.reduce((sum, a) => sum + Number(a.revenue_generated || 0), 0) || 0;

    const funnelConversionRate = impressions > 0 ? conversions / impressions : 0;
    const leadsToConversionsRate = leads > 0 ? conversions / leads : 0;

    return {
      impressions,
      clicks,
      leads,
      conversions,
      revenue,
      funnelConversionRate,
      leadsToConversionsRate,
    };
  } catch (error) {
    console.error('Error getting marketing funnel:', error);
    return {
      impressions: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      revenue: 0,
      funnelConversionRate: 0,
      leadsToConversionsRate: 0,
    };
  }
}

/**
 * Update campaign budget tracking
 */
export async function updateCampaignSpend(
  marketingItemId: string,
  additionalSpend: number
): Promise<MarketingItem | null> {
  try {
    // Get current actual_spend
    const { data: campaign, error: fetchError } = await supabase
      .from('marketing_items')
      .select('actual_spend')
      .eq('id', marketingItemId)
      .single();

    if (fetchError) throw fetchError;

    const currentSpend = Number(campaign?.actual_spend || 0);
    const newSpend = currentSpend + additionalSpend;

    // Update actual_spend
    const { data, error } = await supabase
      .from('marketing_items')
      .update({ actual_spend: newSpend })
      .eq('id', marketingItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating campaign spend:', error);
    return null;
  }
}
