/**
 * Enrichment Cache Module
 * 
 * Server-side caching for company enrichment results.
 * Uses the url_content_cache table with workspace isolation and TTL.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================
// TYPES
// ============================================

export interface EnrichmentCacheEntry {
  id: string;
  domain: string;
  workspaceId: string;
  enrichmentData: EnrichedCompanyData;
  provider: string;
  fetchedAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface EnrichedCompanyData {
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
  source?: 'groq-compound' | 'youcom' | 'fallback';
  aiGenerated?: boolean;
  citationUrls?: string[];
}

export interface CacheReadResult {
  found: boolean;
  entry: EnrichmentCacheEntry | null;
  remainingTtlMs: number;
}

// ============================================
// CONSTANTS
// ============================================

// Cache TTL: 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Maximum entries per workspace (to prevent abuse)
const MAX_ENTRIES_PER_WORKSPACE = 1000;

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Get cached enrichment data for a domain + workspace combination.
 */
export async function getCachedEnrichment(
  domain: string,
  workspaceId: string
): Promise<CacheReadResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    const { data, error } = await supabase
      .from('enrichment_cache')
      .select('*')
      .eq('domain', normalizedDomain)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('[enrichmentCache] Read error:', error.message);
      return { found: false, entry: null, remainingTtlMs: 0 };
    }

    if (!data) {
      return { found: false, entry: null, remainingTtlMs: 0 };
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    
    if (now > expiresAt) {
      // Cache expired - delete and return not found
      await supabase
        .from('enrichment_cache')
        .delete()
        .eq('id', data.id);
      
      return { found: false, entry: null, remainingTtlMs: 0 };
    }

    // Increment hit count (fire and forget)
    supabase
      .from('enrichment_cache')
      .update({ hit_count: (data.hit_count || 0) + 1, last_accessed_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {})
      .catch(() => {});

    const entry: EnrichmentCacheEntry = {
      id: data.id,
      domain: data.domain,
      workspaceId: data.workspace_id,
      enrichmentData: data.enrichment_data,
      provider: data.provider,
      fetchedAt: new Date(data.fetched_at),
      expiresAt,
      hitCount: (data.hit_count || 0) + 1,
    };

    const remainingTtlMs = expiresAt.getTime() - now.getTime();

    return {
      found: true,
      entry,
      remainingTtlMs,
    };

  } catch (err) {
    console.error('[enrichmentCache] Unexpected read error:', err);
    return { found: false, entry: null, remainingTtlMs: 0 };
  }
}

/**
 * Store enrichment data in cache.
 */
export async function setCachedEnrichment(
  domain: string,
  workspaceId: string,
  enrichmentData: EnrichedCompanyData,
  provider: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    // Upsert cache entry
    const { error } = await supabase
      .from('enrichment_cache')
      .upsert({
        domain: normalizedDomain,
        workspace_id: workspaceId,
        enrichment_data: enrichmentData,
        provider,
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        last_accessed_at: now.toISOString(),
      }, {
        onConflict: 'domain,workspace_id',
      });

    if (error) {
      console.error('[enrichmentCache] Write error:', error.message);
      return { success: false, error: error.message };
    }

    // Clean up old entries if over limit (async, don't wait)
    cleanupOldEntries(supabase, workspaceId).catch(() => {});

    return { success: true };

  } catch (err) {
    console.error('[enrichmentCache] Unexpected write error:', err);
    return { success: false, error: 'Cache write failed' };
  }
}

/**
 * Delete cached entry for a domain.
 */
export async function invalidateCachedEnrichment(
  domain: string,
  workspaceId: string
): Promise<{ success: boolean }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    await supabase
      .from('enrichment_cache')
      .delete()
      .eq('domain', normalizedDomain)
      .eq('workspace_id', workspaceId);

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Clean up old/expired cache entries for a workspace.
 */
async function cleanupOldEntries(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Delete expired entries
    await supabase
      .from('enrichment_cache')
      .delete()
      .eq('workspace_id', workspaceId)
      .lt('expires_at', now);

    // Check count and delete oldest if over limit
    const { count } = await supabase
      .from('enrichment_cache')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (count && count > MAX_ENTRIES_PER_WORKSPACE) {
      const deleteCount = count - MAX_ENTRIES_PER_WORKSPACE + 10; // Delete 10 extra
      
      const { data: oldestEntries } = await supabase
        .from('enrichment_cache')
        .select('id')
        .eq('workspace_id', workspaceId)
        .order('last_accessed_at', { ascending: true })
        .limit(deleteCount);

      if (oldestEntries && oldestEntries.length > 0) {
        const idsToDelete = oldestEntries.map(e => e.id);
        await supabase
          .from('enrichment_cache')
          .delete()
          .in('id', idsToDelete);
      }
    }
  } catch (err) {
    console.error('[enrichmentCache] Cleanup error:', err);
  }
}

export { CACHE_TTL_MS, MAX_ENTRIES_PER_WORKSPACE };
