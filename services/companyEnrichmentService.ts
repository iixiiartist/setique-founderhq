/**
 * Company Enrichment Service
 * 
 * Client-side service for enriching company profiles using You.com's Content API.
 * Fetches website content and extracts structured company information.
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
  rawContent?: Array<{
    url: string;
    content?: string;
    title?: string;
    error?: string;
  }>;
}

export interface CompanyEnrichmentResponse {
  success: boolean;
  results: Array<{
    url: string;
    content?: string;
    title?: string;
    error?: string;
  }>;
  enrichment: EnrichmentResult;
  cached: number;
  fetched: number;
  error?: string;
}

/**
 * Generate URLs to fetch for a company website
 * Only sends the main URL - Edge Function handles expansion to about/company pages
 */
function getUrlsToFetch(websiteUrl: string): string[] {
  try {
    // Normalize the URL
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    const parsed = new URL(url);
    const baseUrl = `${parsed.protocol}//${parsed.host}`;

    // Only send the main URL - Edge Function expands to about/company pages
    return [baseUrl];
  } catch {
    console.warn('[CompanyEnrichment] Invalid URL:', websiteUrl);
    return [];
  }
}

/**
 * Fetch and enrich company data from a website URL
 */
export async function enrichCompanyFromUrl(
  websiteUrl: string,
  workspaceId?: string,
  options?: {
    useCache?: boolean;
    customUrls?: string[];
  }
): Promise<CompanyEnrichmentResponse> {
  if (!websiteUrl) {
    return {
      success: false,
      results: [],
      enrichment: {},
      cached: 0,
      fetched: 0,
      error: 'Website URL is required',
    };
  }

  // Get URLs to fetch
  const urls = options?.customUrls || getUrlsToFetch(websiteUrl);
  
  if (urls.length === 0) {
    return {
      success: false,
      results: [],
      enrichment: {},
      cached: 0,
      fetched: 0,
      error: 'Could not parse website URL',
    };
  }

  try {
    // Get auth session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        results: [],
        enrichment: {},
        cached: 0,
        fetched: 0,
        error: 'Authentication required',
      };
    }

    // Call the Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-company-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-workspace-id': workspaceId || '',
        },
        body: JSON.stringify({
          urls,
          format: 'markdown',
          workspaceId,
          useCache: options?.useCache !== false,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[CompanyEnrichment] API error:', response.status, errorData);
      
      if (response.status === 429) {
        return {
          success: false,
          results: [],
          enrichment: {},
          cached: 0,
          fetched: 0,
          error: 'Rate limit exceeded. Please wait a moment before trying again.',
        };
      }

      return {
        success: false,
        results: [],
        enrichment: {},
        cached: 0,
        fetched: 0,
        error: errorData.error || 'Failed to fetch company information',
      };
    }

    const data: CompanyEnrichmentResponse = await response.json();
    
    // Debug logging
    console.log('[CompanyEnrichment] Raw API response:', {
      success: data.success,
      resultsCount: data.results?.length,
      resultsWithContent: data.results?.filter(r => r.content && r.content.length > 0).length,
      enrichment: {
        hasDescription: !!data.enrichment?.description,
        hasIndustry: !!data.enrichment?.industry,
        fields: Object.keys(data.enrichment || {}).filter(k => k !== 'rawContent'),
      },
      cached: data.cached,
      fetched: data.fetched,
    });
    
    // Log first result content length for debugging
    if (data.results && data.results.length > 0) {
      data.results.forEach((r, i) => {
        console.log(`[CompanyEnrichment] Result ${i}: url=${r.url}, contentLength=${r.content?.length || 0}, title="${r.title || 'none'}", error=${r.error || 'none'}`);
      });
    }
    
    return data;

  } catch (error) {
    console.error('[CompanyEnrichment] Error:', error);
    return {
      success: false,
      results: [],
      enrichment: {},
      cached: 0,
      fetched: 0,
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
 * Format enrichment data for display
 */
export function formatEnrichmentForDisplay(enrichment: EnrichmentResult): {
  summary: string;
  details: Array<{ label: string; value: string }>;
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
  };
}

export default {
  enrichCompanyFromUrl,
  isValidEnrichmentUrl,
  formatEnrichmentForDisplay,
};
