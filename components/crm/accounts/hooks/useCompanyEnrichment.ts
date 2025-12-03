/**
 * useCompanyEnrichment Hook
 * 
 * React hook for enriching company profiles from website URLs.
 * Provides loading state, error handling, and automatic field mapping.
 */

import { useState, useCallback } from 'react';
import { useWorkspace } from '../../../../contexts/WorkspaceContext';
import { 
  enrichCompanyFromUrl, 
  EnrichmentResult, 
  isValidEnrichmentUrl,
  formatEnrichmentForDisplay 
} from '../../../../services/companyEnrichmentService';

export interface UseCompanyEnrichmentOptions {
  onSuccess?: (enrichment: EnrichmentResult) => void;
  onError?: (error: string) => void;
  autoApply?: boolean;
}

export interface CompanyEnrichmentState {
  isLoading: boolean;
  error: string | null;
  enrichment: EnrichmentResult | null;
  lastEnrichedUrl: string | null;
}

export interface UseCompanyEnrichmentReturn extends CompanyEnrichmentState {
  enrichFromUrl: (url: string) => Promise<EnrichmentResult | null>;
  canEnrich: (url: string) => boolean;
  clearEnrichment: () => void;
  formattedEnrichment: ReturnType<typeof formatEnrichmentForDisplay> | null;
}

export function useCompanyEnrichment(
  options?: UseCompanyEnrichmentOptions
): UseCompanyEnrichmentReturn {
  const { workspace } = useWorkspace();
  
  const [state, setState] = useState<CompanyEnrichmentState>({
    isLoading: false,
    error: null,
    enrichment: null,
    lastEnrichedUrl: null,
  });

  const enrichFromUrl = useCallback(async (url: string): Promise<EnrichmentResult | null> => {
    if (!url || !isValidEnrichmentUrl(url)) {
      const error = 'Please enter a valid website URL';
      setState(prev => ({ ...prev, error }));
      options?.onError?.(error);
      return null;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await enrichCompanyFromUrl(url, workspace?.id);

      if (!response.success) {
        const error = response.error || 'Failed to enrich company data';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
        }));
        options?.onError?.(error);
        return null;
      }

      const enrichment = response.enrichment;
      
      setState({
        isLoading: false,
        error: null,
        enrichment,
        lastEnrichedUrl: url,
      });

      options?.onSuccess?.(enrichment);
      return enrichment;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      options?.onError?.(errorMessage);
      return null;
    }
  }, [workspace?.id, options]);

  const canEnrich = useCallback((url: string): boolean => {
    return isValidEnrichmentUrl(url);
  }, []);

  const clearEnrichment = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      enrichment: null,
      lastEnrichedUrl: null,
    });
  }, []);

  const formattedEnrichment = state.enrichment 
    ? formatEnrichmentForDisplay(state.enrichment) 
    : null;

  return {
    ...state,
    enrichFromUrl,
    canEnrich,
    clearEnrichment,
    formattedEnrichment,
  };
}

/**
 * Map enrichment data to account form fields
 */
export function mapEnrichmentToAccountFields(enrichment: EnrichmentResult): {
  description?: string;
  industry?: string;
  location?: string;
  companySize?: string;
  foundedYear?: string;
  linkedin?: string;
  twitter?: string;
} {
  return {
    description: enrichment.description || enrichment.productSummary,
    industry: enrichment.industry,
    location: enrichment.location,
    companySize: enrichment.companySize,
    foundedYear: enrichment.foundedYear,
    linkedin: enrichment.socialLinks?.linkedin,
    twitter: enrichment.socialLinks?.twitter,
  };
}

export default useCompanyEnrichment;
