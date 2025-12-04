// lib/services/reportSharingService.ts
// Service for sharing agent reports and market briefs via public/private links

import { supabase } from '../supabase';
import { logger } from '../logger';

export type ShareLinkType = 'public' | 'private' | 'password';

export interface ShareLinkOptions {
  linkType: ShareLinkType;
  expiresInDays?: number | null;
  password?: string;
  hideSources?: boolean;
}

export interface ShareLinkResult {
  success: boolean;
  token?: string;
  expiresAt?: string;
  linkType?: ShareLinkType;
  error?: string;
}

export interface SharedReport {
  id: string;
  target: string;
  goal: string;
  output: string;
  sources: Array<{ url: string; title: string; snippet?: string }>;
  created_at: string;
  workspace_name: string;
  title_override?: string;
}

export interface SharedMarketBrief {
  id: string;
  query: string;
  raw_report: string;
  key_facts: Array<{ label: string; value: string }>;
  pricing_highlights: Array<{ label: string; value: string }>;
  insight_sections: Array<{ title: string; content: string }>;
  hero_line: string;
  sources: Array<{ url: string; title: string }>;
  created_at: string;
  workspace_name: string;
}

/**
 * Generate the full share URL for a report
 */
export function getShareUrl(token: string, type: 'report' | 'brief' = 'report'): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/share/${type}/${token}`;
}

/**
 * Create a share link for an agent report
 */
export async function createReportShareLink(
  reportId: string,
  options: ShareLinkOptions
): Promise<ShareLinkResult> {
  try {
    const { data, error } = await supabase.rpc('create_report_share_link', {
      p_report_id: reportId,
      p_link_type: options.linkType,
      p_expires_in_days: options.expiresInDays ?? null,
      p_password: options.password ?? null,
      p_hide_sources: options.hideSources ?? false,
    });

    if (error) {
      logger.error('[ReportSharing] Error creating share link:', error);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; token?: string; expires_at?: string; link_type?: string; error?: string };
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to create share link' };
    }

    return {
      success: true,
      token: result.token,
      expiresAt: result.expires_at,
      linkType: result.link_type as ShareLinkType,
    };
  } catch (err) {
    logger.error('[ReportSharing] Unexpected error:', err);
    return { success: false, error: 'Failed to create share link' };
  }
}

/**
 * Create a share link for a market brief
 */
export async function createMarketBriefShareLink(
  briefId: string,
  options: ShareLinkOptions
): Promise<ShareLinkResult> {
  try {
    const { data, error } = await supabase.rpc('create_market_brief_share_link', {
      p_brief_id: briefId,
      p_link_type: options.linkType,
      p_expires_in_days: options.expiresInDays ?? null,
      p_password: options.password ?? null,
    });

    if (error) {
      logger.error('[ReportSharing] Error creating brief share link:', error);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; token?: string; expires_at?: string; link_type?: string; error?: string };
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to create share link' };
    }

    return {
      success: true,
      token: result.token,
      expiresAt: result.expires_at,
      linkType: result.link_type as ShareLinkType,
    };
  } catch (err) {
    logger.error('[ReportSharing] Unexpected error:', err);
    return { success: false, error: 'Failed to create share link' };
  }
}

/**
 * Fetch a shared report by token (public access)
 */
export async function getSharedReport(
  token: string,
  password?: string
): Promise<{ success: boolean; report?: SharedReport; error?: string; passwordRequired?: boolean }> {
  try {
    const { data, error } = await supabase.rpc('get_shared_report', {
      p_token: token,
      p_password: password ?? null,
    });

    if (error) {
      logger.error('[ReportSharing] Error fetching shared report:', error);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; report?: SharedReport; error?: string };
    
    if (!result.success) {
      if (result.error === 'password_required') {
        return { success: false, passwordRequired: true };
      }
      return { success: false, error: result.error };
    }

    return { success: true, report: result.report };
  } catch (err) {
    logger.error('[ReportSharing] Unexpected error:', err);
    return { success: false, error: 'Failed to fetch shared report' };
  }
}

/**
 * Fetch a shared market brief by token (public access)
 */
export async function getSharedMarketBrief(
  token: string,
  password?: string
): Promise<{ success: boolean; brief?: SharedMarketBrief; error?: string; passwordRequired?: boolean }> {
  try {
    const { data, error } = await supabase.rpc('get_shared_market_brief', {
      p_token: token,
      p_password: password ?? null,
    });

    if (error) {
      logger.error('[ReportSharing] Error fetching shared brief:', error);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; brief?: SharedMarketBrief; error?: string };
    
    if (!result.success) {
      if (result.error === 'password_required') {
        return { success: false, passwordRequired: true };
      }
      return { success: false, error: result.error };
    }

    return { success: true, brief: result.brief };
  } catch (err) {
    logger.error('[ReportSharing] Unexpected error:', err);
    return { success: false, error: 'Failed to fetch shared brief' };
  }
}

/**
 * Revoke a share link for a report
 */
export async function revokeShareLink(reportId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('revoke_share_link', {
      p_report_id: reportId,
    });

    if (error) {
      logger.error('[ReportSharing] Error revoking share link:', error);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; error?: string };
    return result;
  } catch (err) {
    logger.error('[ReportSharing] Unexpected error:', err);
    return { success: false, error: 'Failed to revoke share link' };
  }
}

/**
 * Copy share link to clipboard
 */
export async function copyShareLink(token: string, type: 'report' | 'brief' = 'report'): Promise<boolean> {
  try {
    const url = getShareUrl(token, type);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    logger.error('[ReportSharing] Failed to copy to clipboard:', err);
    return false;
  }
}

export interface SaveMarketBriefParams {
  workspaceId: string;
  productId?: string;
  query: string;
  rawReport: string;
  keyFacts?: Array<{ label: string; value: string }>;
  pricingHighlights?: Array<{ label: string; value: string }>;
  insightSections?: Array<{ title: string; bullets: string[] }>;
  heroLine?: string;
  sources?: Array<{ url: string; title: string }>;
}

export interface SavedMarketBrief {
  id: string;
  workspace_id: string;
  user_id: string;
  query: string;
  raw_report: string;
  share_token: string | null;
  created_at: string;
}

/**
 * Save a market brief to the database
 */
export async function saveMarketBrief(params: SaveMarketBriefParams): Promise<{ success: boolean; brief?: SavedMarketBrief; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('market_briefs')
      .insert({
        workspace_id: params.workspaceId,
        user_id: user.id,
        product_id: params.productId || null,
        query: params.query,
        raw_report: params.rawReport,
        key_facts: params.keyFacts || [],
        pricing_highlights: params.pricingHighlights || [],
        insight_sections: params.insightSections || [],
        hero_line: params.heroLine || '',
        sources: params.sources || [],
      })
      .select()
      .single();

    if (error) {
      logger.error('[ReportSharing] Error saving market brief:', error);
      return { success: false, error: error.message };
    }

    return { success: true, brief: data as SavedMarketBrief };
  } catch (err) {
    logger.error('[ReportSharing] Unexpected error saving brief:', err);
    return { success: false, error: 'Failed to save market brief' };
  }
}

/**
 * Get saved market briefs for a workspace
 */
export async function getWorkspaceMarketBriefs(workspaceId: string): Promise<{ success: boolean; briefs?: SavedMarketBrief[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('market_briefs')
      .select('id, workspace_id, user_id, query, raw_report, share_token, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[ReportSharing] Error fetching market briefs:', error);
      return { success: false, error: error.message };
    }

    return { success: true, briefs: data as SavedMarketBrief[] };
  } catch (err) {
    logger.error('[ReportSharing] Unexpected error fetching briefs:', err);
    return { success: false, error: 'Failed to fetch market briefs' };
  }
}
