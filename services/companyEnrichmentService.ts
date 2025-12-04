/**
 * Company Enrichment Service
 * 
 * Client-side service for enriching company profiles using Groq Compound (primary)
 * or You.com Search API (fallback).
 * 
 * SECURITY: Always requires authentication and workspace ID.
 * Data includes provenance metadata (confidence, source, AI-generated flag).
 */

import { supabase } from '../lib/supabase';

export interface EnrichmentResult {
  description?: string;
  industry?: string;
  location?: string;
  productSummary?: string;
  pricingInfo?: string;
  keyPeople?: string[];
  companySize?: string;
  foundedYear?: string;
  techStack?: string[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
  // Provenance metadata
  confidence?: number;
  source?: 'groq-compound' | 'youcom' | 'cache' | 'fallback';
  aiGenerated?: boolean;
  citationUrls?: string[];
}

export interface CompanyEnrichmentResponse {
  success: boolean;
  enrichment: EnrichmentResult;
  provider: 'groq-compound' | 'youcom' | 'cache' | 'fallback';
  cached: boolean;
  durationMs: number;
  confidence: number | null;
  isFallback: boolean;
  requestId: string;
  error?: string;
  warnings?: string[];
}

/**
 * Generate URLs to fetch for a company website
 * Only sends the main URL - Edge Function handles expansion
 */
function getUrlsToFetch(websiteUrl: string): string[] {
  try {
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    const parsed = new URL(url);
    return [`${parsed.protocol}//${parsed.host}`];
  } catch {
    console.warn('[CompanyEnrichment] Invalid URL:', websiteUrl);
    return [];
  }
}

/**
 * Fetch and enrich company data from a website URL.
 * REQUIRES workspaceId - will fail without it.
 */
export async function enrichCompanyFromUrl(
  websiteUrl: string,
  workspaceId: string,
  options?: {
    useCache?: boolean;
    forceRefresh?: boolean;
  }
): Promise<CompanyEnrichmentResponse> {
  if (!websiteUrl) {
    return {
      success: false,
      enrichment: {},
      provider: 'fallback',
      cached: false,
      durationMs: 0,
      confidence: null,
      isFallback: true,
      requestId: '',
      error: 'Website URL is required',
    };
  }

  // SECURITY: Require workspaceId
  if (!workspaceId) {
    return {
      success: false,
      enrichment: {},
      provider: 'fallback',
      cached: false,
      durationMs: 0,
      confidence: null,
      isFallback: true,
      requestId: '',
      error: 'Workspace ID is required for enrichment',
    };
  }

  const urls = getUrlsToFetch(websiteUrl);
  
  if (urls.length === 0) {
    return {
      success: false,
      enrichment: {},
      provider: 'fallback',
      cached: false,
      durationMs: 0,
      confidence: null,
      isFallback: true,
      requestId: '',
      error: 'Could not parse website URL',
    };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        enrichment: {},
        provider: 'fallback',
        cached: false,
        durationMs: 0,
        confidence: null,
        isFallback: true,
        requestId: '',
        error: 'Authentication required',
      };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-company-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          urls,
          workspaceId,
          useCache: options?.useCache !== false,
          forceRefresh: options?.forceRefresh === true,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[CompanyEnrichment] API error:', response.status, data);
      
      // Handle specific error cases
      if (response.status === 429) {
        return {
          success: false,
          enrichment: {},
          provider: 'fallback',
          cached: false,
          durationMs: 0,
          confidence: null,
          isFallback: true,
          requestId: data.requestId || '',
          error: data.error || 'Rate limit exceeded. Please wait a moment before trying again.',
        };
      }

      if (response.status === 402) {
        return {
          success: false,
          enrichment: {},
          provider: 'fallback',
          cached: false,
          durationMs: 0,
          confidence: null,
          isFallback: true,
          requestId: data.requestId || '',
          error: data.error || 'Insufficient API balance. Please top up your account.',
        };
      }

      return {
        success: false,
        enrichment: {},
        provider: 'fallback',
        cached: false,
        durationMs: 0,
        confidence: null,
        isFallback: true,
        requestId: data.requestId || '',
        error: data.error || 'Failed to fetch company information',
      };
    }

    // Debug logging
    console.log('[CompanyEnrichment] API response:', {
      success: data.success,
      provider: data.provider,
      cached: data.cached,
      confidence: data.confidence,
      isFallback: data.isFallback,
      durationMs: data.durationMs,
      hasDescription: !!data.enrichment?.description,
      requestId: data.requestId,
    });
    
    return data as CompanyEnrichmentResponse;

  } catch (error) {
    console.error('[CompanyEnrichment] Error:', error);
    return {
      success: false,
      enrichment: {},
      provider: 'fallback',
      cached: false,
      durationMs: 0,
      confidence: null,
      isFallback: true,
      requestId: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if a URL is valid for enrichment
 */
export function isValidEnrichmentUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    // Must have a valid hostname
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Format enrichment data for display with provenance info.
 */
export function formatEnrichmentForDisplay(enrichment: EnrichmentResult): {
  summary: string;
  details: Array<{ label: string; value: string }>;
  provenance: {
    confidence: number | null;
    source: string | null;
    aiGenerated: boolean;
    citationUrls?: string[];
  };
} {
  const details: Array<{ label: string; value: string }> = [];

  if (enrichment.industry) {
    details.push({ label: 'Industry', value: enrichment.industry });
  }
  
  if (enrichment.location) {
    details.push({ label: 'Location', value: enrichment.location });
  }
  
  if (enrichment.companySize) {
    details.push({ label: 'Company Size', value: enrichment.companySize });
  }
  
  if (enrichment.foundedYear) {
    details.push({ label: 'Founded', value: enrichment.foundedYear });
  }
  
  if (enrichment.keyPeople && enrichment.keyPeople.length > 0) {
    details.push({ label: 'Key People', value: enrichment.keyPeople.join(', ') });
  }
  
  if (enrichment.techStack && enrichment.techStack.length > 0) {
    details.push({ label: 'Tech Stack', value: enrichment.techStack.join(', ') });
  }
  
  if (enrichment.pricingInfo) {
    details.push({ label: 'Pricing', value: enrichment.pricingInfo });
  }

  if (enrichment.socialLinks) {
    if (enrichment.socialLinks.linkedin) {
      details.push({ label: 'LinkedIn', value: enrichment.socialLinks.linkedin });
    }
    if (enrichment.socialLinks.twitter) {
      details.push({ label: 'Twitter', value: enrichment.socialLinks.twitter });
    }
    if (enrichment.socialLinks.github) {
      details.push({ label: 'GitHub', value: enrichment.socialLinks.github });
    }
  }

  return {
    summary: enrichment.description || enrichment.productSummary || '',
    details,
    provenance: {
      confidence: enrichment.confidence ?? null,
      source: enrichment.source ?? null,
      aiGenerated: enrichment.aiGenerated ?? true,
      citationUrls: enrichment.citationUrls,
    },
  };
}

export default {
  enrichCompanyFromUrl,
  isValidEnrichmentUrl,
  formatEnrichmentForDisplay,
};
