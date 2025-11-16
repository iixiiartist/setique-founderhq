/**
 * Marketing Attribution Service
 * 
 * Tracks marketing campaign performance and attributes revenue to sources:
 * - Campaign ROI calculation
 * - Channel attribution
 * - Conversion funnel tracking
 * - Lead source analysis
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

export interface CampaignAttribution {
  campaignId: string;
  campaignName: string;
  channel: string;
  spent: number;
  revenue: number;
  roi: number;
  leads: number;
  conversions: number;
  conversionRate: number;
}

export interface ChannelPerformance {
  channel: string;
  leads: number;
  deals: number;
  revenue: number;
  averageDealSize: number;
  conversionRate: number;
}

export interface AttributionData {
  leadId: string;
  leadName: string;
  source: string;
  campaign?: string;
  dealValue: number;
  dealStage: string;
  daysToClose?: number;
}

/**
 * Calculate ROI for all marketing campaigns
 */
export async function calculateCampaignROI(workspaceId: string): Promise<CampaignAttribution[]> {
  try {
    // Get all marketing campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select('id, name, channel, status, budget_spent, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    // For each campaign, find attributed revenue from deals/contacts
    const attributions: CampaignAttribution[] = [];

    for (const campaign of campaigns) {
      // Get contacts from this campaign
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .eq('source', campaign.name);

      if (contactsError) {
        logger.error(`Error fetching contacts for campaign ${campaign.name}:`, contactsError);
        continue;
      }

      const leadCount = contacts?.length || 0;
      const contactIds = contacts?.map(c => c.id) || [];

      // Get deals associated with these contacts
      let totalRevenue = 0;
      let conversionCount = 0;

      if (contactIds.length > 0) {
        const { data: deals, error: dealsError } = await supabase
          .from('deals')
          .select('value, stage, contact_id')
          .eq('workspace_id', workspaceId)
          .in('contact_id', contactIds);

        if (!dealsError && deals) {
          deals.forEach(deal => {
            if (deal.stage === 'closed_won') {
              totalRevenue += deal.value || 0;
              conversionCount++;
            }
          });
        }
      }

      const spent = campaign.budget_spent || 0;
      const roi = spent > 0 ? ((totalRevenue - spent) / spent) * 100 : 0;
      const conversionRate = leadCount > 0 ? (conversionCount / leadCount) * 100 : 0;

      attributions.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        channel: campaign.channel || 'unknown',
        spent,
        revenue: totalRevenue,
        roi,
        leads: leadCount,
        conversions: conversionCount,
        conversionRate,
      });
    }

    return attributions.sort((a, b) => b.roi - a.roi);
  } catch (error) {
    logger.error('Error calculating campaign ROI:', error);
    throw error;
  }
}

/**
 * Analyze performance by channel (email, social, paid ads, etc.)
 */
export async function analyzeChannelPerformance(workspaceId: string): Promise<ChannelPerformance[]> {
  try {
    // Get all contacts grouped by source/channel
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name, source')
      .eq('workspace_id', workspaceId);

    if (contactsError) throw contactsError;

    // Group by channel
    const channelMap: { [key: string]: { leadIds: string[], leads: number } } = {};
    
    (contacts || []).forEach(contact => {
      const channel = contact.source || 'organic';
      if (!channelMap[channel]) {
        channelMap[channel] = { leadIds: [], leads: 0 };
      }
      channelMap[channel].leadIds.push(contact.id);
      channelMap[channel].leads++;
    });

    // For each channel, calculate metrics
    const channelPerformances: ChannelPerformance[] = [];

    for (const [channel, data] of Object.entries(channelMap)) {
      if (data.leadIds.length === 0) continue;

      // Get deals for this channel's contacts
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('value, stage, contact_id')
        .eq('workspace_id', workspaceId)
        .in('contact_id', data.leadIds);

      if (dealsError) {
        logger.error(`Error fetching deals for channel ${channel}:`, dealsError);
        continue;
      }

      let totalRevenue = 0;
      let dealCount = 0;
      let wonDeals = 0;

      (deals || []).forEach(deal => {
        dealCount++;
        if (deal.stage === 'closed_won') {
          totalRevenue += deal.value || 0;
          wonDeals++;
        }
      });

      const averageDealSize = wonDeals > 0 ? totalRevenue / wonDeals : 0;
      const conversionRate = data.leads > 0 ? (wonDeals / data.leads) * 100 : 0;

      channelPerformances.push({
        channel,
        leads: data.leads,
        deals: wonDeals,
        revenue: totalRevenue,
        averageDealSize,
        conversionRate,
      });
    }

    return channelPerformances.sort((a, b) => b.revenue - a.revenue);
  } catch (error) {
    logger.error('Error analyzing channel performance:', error);
    throw error;
  }
}

/**
 * Get detailed attribution data for all leads and deals
 */
export async function getAttributionData(workspaceId: string): Promise<AttributionData[]> {
  try {
    // Get all contacts with their deals
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select(`
        id,
        name,
        source,
        created_at
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (contactsError) throw contactsError;

    const attributionData: AttributionData[] = [];

    for (const contact of contacts || []) {
      // Get deal for this contact
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('value, stage, created_at, actual_close_date')
        .eq('workspace_id', workspaceId)
        .eq('contact_id', contact.id);

      if (dealsError) continue;

      if (deals && deals.length > 0) {
        // Use the most recent deal
        const deal = deals[0];
        
        // Calculate days to close
        let daysToClose: number | undefined;
        if (deal.actual_close_date && contact.created_at) {
          const closeDate = new Date(deal.actual_close_date);
          const createDate = new Date(contact.created_at);
          daysToClose = Math.floor((closeDate.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        attributionData.push({
          leadId: contact.id,
          leadName: contact.name || 'Unknown',
          source: contact.source || 'organic',
          campaign: undefined, // Could be enhanced to link to campaigns
          dealValue: deal.value || 0,
          dealStage: deal.stage,
          daysToClose,
        });
      } else {
        // Lead with no deal yet
        attributionData.push({
          leadId: contact.id,
          leadName: contact.name || 'Unknown',
          source: contact.source || 'organic',
          dealValue: 0,
          dealStage: 'lead',
        });
      }
    }

    return attributionData;
  } catch (error) {
    logger.error('Error getting attribution data:', error);
    throw error;
  }
}

/**
 * Calculate conversion funnel metrics
 */
export async function getConversionFunnel(workspaceId: string) {
  try {
    // Get total contacts (leads)
    const { count: totalLeads, error: leadsError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (leadsError) throw leadsError;

    // Get contacts with deals (qualified)
    const { data: contactsWithDeals, error: contactsError } = await supabase
      .from('deals')
      .select('contact_id')
      .eq('workspace_id', workspaceId);

    if (contactsError) throw contactsError;

    const uniqueContactsWithDeals = new Set(
      (contactsWithDeals || []).map(d => d.contact_id)
    ).size;

    // Get deals in negotiation
    const { count: negotiatingDeals, error: negotiatingError } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('stage', ['negotiation', 'proposal_sent']);

    if (negotiatingError) throw negotiatingError;

    // Get closed won deals
    const { count: wonDeals, error: wonError } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('stage', 'closed_won');

    if (wonError) throw wonError;

    const leads = totalLeads || 0;
    const qualified = uniqueContactsWithDeals;
    const negotiating = negotiatingDeals || 0;
    const won = wonDeals || 0;

    return {
      stages: [
        {
          stage: 'Leads',
          count: leads,
          percentage: 100,
        },
        {
          stage: 'Qualified',
          count: qualified,
          percentage: leads > 0 ? (qualified / leads) * 100 : 0,
        },
        {
          stage: 'Negotiating',
          count: negotiating,
          percentage: leads > 0 ? (negotiating / leads) * 100 : 0,
        },
        {
          stage: 'Won',
          count: won,
          percentage: leads > 0 ? (won / leads) * 100 : 0,
        },
      ],
      overallConversionRate: leads > 0 ? (won / leads) * 100 : 0,
    };
  } catch (error) {
    logger.error('Error calculating conversion funnel:', error);
    throw error;
  }
}
