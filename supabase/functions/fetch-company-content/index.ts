/// <reference path="../types/deno_http_server.d.ts" />
/**
 * fetch-company-content Edge Function
 * 
 * Production-hardened company enrichment service using Groq Compound (primary)
 * or You.com Search API (fallback).
 * 
 * SECURITY FEATURES:
 * - Strict authentication (no anonymous access)
 * - Workspace tenancy enforcement
 * - Persistent rate limiting
 * - Server-side caching with TTL
 * - URL validation and SSRF protection
 * - Request timeouts and circuit breakers
 * - Schema validation before storage
 * - Structured logging with PII scrubbing
 * - Field provenance and confidence scoring
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders as sharedCorsHeaders } from '../_shared/apiAuth.ts';

// ============================================
// CONSTANTS
// ============================================

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const YOUCOM_SEARCH_URL = "https://api.ydc-index.io/search";

// Rate limiting (per workspace per minute)
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Timeouts
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 500;

// Cache TTL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Maximum field lengths
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_URL_LENGTH = 2048;

// Blocked hostnames for SSRF protection
const BLOCKED_HOSTNAMES = new Set([
  'localhost', 'localhost.localdomain', '127.0.0.1', '0.0.0.0',
  '::1', 'metadata.google.internal', '169.254.169.254', 'kubernetes.default',
]);

const BLOCKED_IP_PATTERNS = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./,
];

// Extended CORS headers
const corsHeaders = {
  ...sharedCorsHeaders,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-workspace-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Circuit breaker state (in-memory, resets on cold start)
const circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();

// ============================================
// TYPES
// ============================================

type SearchProvider = 'groq-compound' | 'youcom' | 'cache' | 'fallback';

interface FetchContentRequest {
  urls: string[];
  workspaceId?: string;
  useCache?: boolean;
  forceRefresh?: boolean;
}

interface EnrichedCompanyData {
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
  source?: SearchProvider;
  aiGenerated?: boolean;
  citationUrls?: string[];
}

interface EnrichmentResponse {
  success: boolean;
  enrichment: EnrichedCompanyData | null;
  provider: SearchProvider;
  cached: boolean;
  durationMs: number;
  confidence: number | null;
  isFallback: boolean;
  requestId: string;
  error?: string;
  warnings?: string[];
}

interface SearchHit {
  title?: string;
  description?: string;
  url?: string;
  snippets?: string[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `enr-${timestamp}-${random}`;
}

function isProduction(): boolean {
  return Deno.env.get('ENVIRONMENT') === 'production' || 
         Deno.env.get('NODE_ENV') === 'production';
}

function maskDomain(domain: string): string {
  if (!isProduction()) return domain;
  const parts = domain.split('.');
  return parts.length >= 2 ? `***.${parts.slice(-2).join('.')}` : '***';
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'fetch-company-content',
    message,
    ...(data || {}),
  };
  
  // Scrub sensitive data in production
  if (isProduction() && data) {
    const scrubbed = { ...entry };
    for (const key of ['url', 'urls', 'domain', 'companyName', 'description']) {
      if (key in scrubbed && typeof (scrubbed as Record<string, unknown>)[key] === 'string') {
        (scrubbed as Record<string, unknown>)[key] = '[SCRUBBED]';
      }
    }
    console[level](JSON.stringify(scrubbed));
  } else {
    console[level](JSON.stringify(entry));
  }
}

// ============================================
// URL VALIDATION & SSRF PROTECTION
// ============================================

interface URLValidationResult {
  isValid: boolean;
  normalizedUrl: string | null;
  domain: string | null;
  companyName: string | null;
  error: string | null;
}

function validateEnrichmentUrl(urlInput: string): URLValidationResult {
  if (!urlInput || typeof urlInput !== 'string') {
    return { isValid: false, normalizedUrl: null, domain: null, companyName: null, error: 'URL is required' };
  }

  const trimmedUrl = urlInput.trim();
  
  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return { isValid: false, normalizedUrl: null, domain: null, companyName: null, 
             error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters` };
  }

  if (!trimmedUrl.includes('.')) {
    return { isValid: false, normalizedUrl: null, domain: null, companyName: null, 
             error: 'Invalid URL: must contain a valid domain' };
  }

  try {
    const urlWithProtocol = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
      ? trimmedUrl
      : `https://${trimmedUrl}`;
    
    const parsed = new URL(urlWithProtocol);
    parsed.protocol = 'https:'; // Enforce HTTPS
    
    const hostname = parsed.hostname.toLowerCase();

    // SSRF protection: Block internal hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return { isValid: false, normalizedUrl: null, domain: null, companyName: null,
               error: 'Internal or reserved addresses are not allowed' };
    }

    // SSRF protection: Block private IP ranges
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      if (BLOCKED_IP_PATTERNS.some(pattern => pattern.test(hostname))) {
        return { isValid: false, normalizedUrl: null, domain: null, companyName: null,
                 error: 'Private/internal IP addresses are not allowed' };
      }
    }

    // Block URLs with auth credentials
    if (parsed.username || parsed.password) {
      return { isValid: false, normalizedUrl: null, domain: null, companyName: null,
               error: 'URLs with credentials are not allowed' };
    }

    // Block non-standard ports
    if (parsed.port && parsed.port !== '443') {
      return { isValid: false, normalizedUrl: null, domain: null, companyName: null,
               error: 'Non-standard ports are not allowed' };
    }

    const normalizedUrl = `${parsed.protocol}//${parsed.host}`;
    const domain = hostname.replace(/^www\./, '');
    const domainParts = domain.split('.');
    const companyName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);

    return { isValid: true, normalizedUrl, domain, companyName, error: null };

  } catch {
    return { isValid: false, normalizedUrl: null, domain: null, companyName: null, error: 'Invalid URL format' };
  }
}

// ============================================
// AUTHENTICATION & AUTHORIZATION
// ============================================

interface AuthResult {
  isValid: boolean;
  userId: string | null;
  workspaceId: string | null;
  error: string | null;
  statusCode: number;
  isAdmin: boolean;
}

async function authenticateRequest(req: Request, providedWorkspaceId?: string): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization');
  const workspaceIdHeader = req.headers.get('x-workspace-id');
  const workspaceId = providedWorkspaceId || workspaceIdHeader;

  // SECURITY: Require Authorization header
  if (!authHeader) {
    return { isValid: false, userId: null, workspaceId: null, 
             error: 'Authentication required. Please sign in.', statusCode: 401, isAdmin: false };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { isValid: false, userId: null, workspaceId: null,
             error: 'Invalid authorization format. Use Bearer token.', statusCode: 401, isAdmin: false };
  }

  // SECURITY: Require workspace ID
  if (!workspaceId) {
    return { isValid: false, userId: null, workspaceId: null,
             error: 'Workspace ID is required.', statusCode: 400, isAdmin: false };
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspaceId)) {
    return { isValid: false, userId: null, workspaceId: null,
             error: 'Invalid workspace ID format.', statusCode: 400, isAdmin: false };
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isValid: false, userId: null, workspaceId: null,
               error: 'Invalid or expired session. Please sign in again.', statusCode: 401, isAdmin: false };
    }

    // SECURITY: Verify user has access to the workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      log('error', 'Membership check error', { error: membershipError.message });
      return { isValid: false, userId: user.id, workspaceId: null,
               error: 'Failed to verify workspace access.', statusCode: 500, isAdmin: false };
    }

    if (!membership) {
      return { isValid: false, userId: user.id, workspaceId: null,
               error: 'Access denied. You are not a member of this workspace.', statusCode: 403, isAdmin: false };
    }

    // Check if user is admin
    let isAdmin = false;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      isAdmin = profile?.is_admin === true;
    } catch {
      // Ignore - default to non-admin
    }

    return { isValid: true, userId: user.id, workspaceId, error: null, statusCode: 200, isAdmin };

  } catch (err) {
    log('error', 'Auth error', { error: err instanceof Error ? err.message : 'Unknown' });
    return { isValid: false, userId: null, workspaceId: null,
             error: 'Authentication failed.', statusCode: 500, isAdmin: false };
  }
}

// ============================================
// RATE LIMITING (Persistent via RPC)
// ============================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

async function checkRateLimit(workspaceId: string): Promise<RateLimitResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc('check_enrichment_rate_limit', {
      p_workspace_id: workspaceId,
      p_window_ms: RATE_LIMIT_WINDOW_MS,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
    });

    if (error) {
      log('error', 'Rate limit RPC error', { error: error.message });
      // Fail open
      return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) };
    }

    const result = data?.[0] || data;
    return {
      allowed: result?.allowed ?? true,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - (result?.current_count || 0)),
      resetAt: new Date(result?.reset_at || Date.now() + RATE_LIMIT_WINDOW_MS),
    };
  } catch (err) {
    log('error', 'Rate limit error', { error: err instanceof Error ? err.message : 'Unknown' });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) };
  }
}

// ============================================
// CACHING
// ============================================

interface CacheResult {
  found: boolean;
  entry: EnrichedCompanyData | null;
  remainingTtlMs: number;
}

async function getCachedEnrichment(domain: string, workspaceId: string): Promise<CacheResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    const { data, error } = await supabase
      .from('enrichment_cache')
      .select('*')
      .eq('domain', normalizedDomain)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error || !data) {
      return { found: false, entry: null, remainingTtlMs: 0 };
    }

    const expiresAt = new Date(data.expires_at);
    if (new Date() > expiresAt) {
      // Expired - delete and return not found
      await supabase.from('enrichment_cache').delete().eq('id', data.id);
      return { found: false, entry: null, remainingTtlMs: 0 };
    }

    // Increment hit count (fire and forget)
    supabase.from('enrichment_cache')
      .update({ hit_count: (data.hit_count || 0) + 1, last_accessed_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {}).catch(() => {});

    return {
      found: true,
      entry: data.enrichment_data,
      remainingTtlMs: expiresAt.getTime() - Date.now(),
    };
  } catch {
    return { found: false, entry: null, remainingTtlMs: 0 };
  }
}

async function setCachedEnrichment(
  domain: string,
  workspaceId: string,
  enrichmentData: EnrichedCompanyData,
  provider: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    await supabase.from('enrichment_cache').upsert({
      domain: normalizedDomain,
      workspace_id: workspaceId,
      enrichment_data: enrichmentData,
      provider,
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      hit_count: 0,
      last_accessed_at: now.toISOString(),
    }, { onConflict: 'domain,workspace_id' });
  } catch (err) {
    log('warn', 'Cache write failed', { error: err instanceof Error ? err.message : 'Unknown' });
  }
}

// ============================================
// CIRCUIT BREAKER & RESILIENT HTTP
// ============================================

function isCircuitOpen(provider: string): boolean {
  const state = circuitBreakers.get(provider);
  if (!state || !state.isOpen) return false;
  
  if (Date.now() - state.lastFailure >= 30_000) {
    state.isOpen = false;
    state.failures = 0;
    return false;
  }
  return true;
}

function recordFailure(provider: string): void {
  let state = circuitBreakers.get(provider);
  if (!state) {
    state = { failures: 0, lastFailure: 0, isOpen: false };
    circuitBreakers.set(provider, state);
  }
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= 5) state.isOpen = true;
}

function recordSuccess(provider: string): void {
  const state = circuitBreakers.get(provider);
  if (state) {
    state.failures = 0;
    state.isOpen = false;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resilientFetch<T>(
  url: string,
  provider: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; data: T | null; error?: string; retryCount: number }> {
  if (isCircuitOpen(provider)) {
    return { success: false, data: null, error: `Circuit breaker open for ${provider}`, retryCount: 0 };
  }

  let lastError = '';
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      
      if (response.ok) {
        recordSuccess(provider);
        const data = await response.json() as T;
        return { success: true, data, retryCount };
      }

      lastError = `HTTP ${response.status}`;
      
      if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
        retryCount++;
        await new Promise(r => setTimeout(r, BASE_RETRY_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }

      recordFailure(provider);
      return { success: false, data: null, error: lastError, retryCount };

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = 'Request timed out';
      } else {
        lastError = err instanceof Error ? err.message : 'Unknown error';
      }

      if (attempt < maxRetries) {
        retryCount++;
        await new Promise(r => setTimeout(r, BASE_RETRY_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }

      recordFailure(provider);
      return { success: false, data: null, error: lastError, retryCount };
    }
  }

  return { success: false, data: null, error: lastError, retryCount };
}

// ============================================
// SCHEMA VALIDATION
// ============================================

function validateEnrichmentData(data: EnrichedCompanyData): {
  validated: EnrichedCompanyData;
  warnings: string[];
} {
  const validated: EnrichedCompanyData = {};
  const warnings: string[] = [];

  if (data.description) {
    validated.description = data.description.substring(0, MAX_DESCRIPTION_LENGTH);
    if (data.description.length > MAX_DESCRIPTION_LENGTH) {
      warnings.push('Description truncated');
    }
  }

  if (data.industry && typeof data.industry === 'string') {
    validated.industry = data.industry.substring(0, 100);
  }

  if (data.location && typeof data.location === 'string') {
    validated.location = data.location.substring(0, 200);
  }

  if (data.companySize && typeof data.companySize === 'string') {
    validated.companySize = data.companySize.substring(0, 100);
  }

  if (data.foundedYear) {
    const yearMatch = String(data.foundedYear).match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 1800 && year <= new Date().getFullYear()) {
        validated.foundedYear = yearMatch[1];
      }
    }
  }

  if (Array.isArray(data.keyPeople)) {
    validated.keyPeople = data.keyPeople
      .filter((p): p is string => typeof p === 'string')
      .slice(0, 10)
      .map(p => p.substring(0, 200));
  }

  if (data.productSummary && typeof data.productSummary === 'string') {
    validated.productSummary = data.productSummary.substring(0, 2000);
  }

  if (data.socialLinks && typeof data.socialLinks === 'object') {
    const sl = data.socialLinks;
    validated.socialLinks = {};
    
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/company\/[\w-]+\/?$/i;
    const twitterPattern = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[\w-]+\/?$/i;
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/?$/i;

    if (sl.linkedin && linkedinPattern.test(sl.linkedin)) {
      validated.socialLinks.linkedin = sl.linkedin;
    }
    if (sl.twitter && twitterPattern.test(sl.twitter)) {
      validated.socialLinks.twitter = sl.twitter;
    }
    if (sl.github && githubPattern.test(sl.github)) {
      validated.socialLinks.github = sl.github;
    }
  }

  return { validated, warnings };
}

function isFallbackContent(data: EnrichedCompanyData, domain: string): boolean {
  if (!data.description) return true;
  const desc = data.description.toLowerCase();
  const placeholders = [`visit ${domain}`, 'visit the website', 'for more information', 'no information available'];
  return placeholders.some(p => desc.includes(p.toLowerCase()));
}

function calculateConfidence(data: EnrichedCompanyData): number {
  const weights: Record<string, number> = {
    description: 0.25, industry: 0.15, location: 0.15, companySize: 0.10,
    foundedYear: 0.10, keyPeople: 0.10, productSummary: 0.05, socialLinks: 0.10,
  };
  
  let score = 0;
  for (const [field, weight] of Object.entries(weights)) {
    const value = (data as Record<string, unknown>)[field];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length > 0) score += weight;
      else if (typeof value === 'object' && Object.keys(value).length > 0) score += weight;
      else if (typeof value === 'string' && value.length > 0) score += weight;
    }
  }
  return Math.round(score * 100) / 100;
}

// ============================================
// GROQ API CALLS
// ============================================

async function searchWithGroqCompound(
  companyName: string,
  companyDomain: string,
  groqApiKey: string
): Promise<{ success: boolean; content?: string; citations?: Array<{ url: string }>; error?: string; retryCount?: number }> {
  const searchPrompt = `Search for comprehensive information about ${companyName} (${companyDomain}). 
Find: company description, industry, headquarters location, founding year, employee count, key executives, and main products/services.
Focus on their official website and reliable business sources like LinkedIn, Crunchbase, Bloomberg, or TechCrunch.`;

  const result = await resilientFetch<{
    choices?: Array<{ message?: { content?: string } }>;
  }>(
    GROQ_API_URL,
    'groq',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'compound-beta',
        messages: [{ role: 'user', content: searchPrompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    },
    DEFAULT_TIMEOUT_MS,
    1 // Fewer retries for Groq due to rate limits
  );

  if (!result.success) {
    return { success: false, error: result.error, retryCount: result.retryCount };
  }

  const content = result.data?.choices?.[0]?.message?.content;
  if (!content) {
    return { success: false, error: 'Empty response from Groq' };
  }

  // Extract citations
  const citations: Array<{ url: string }> = [];
  const urlMatches = content.match(/https?:\/\/[^\s\)\]]+/g) || [];
  for (const url of urlMatches.slice(0, 10)) {
    citations.push({ url: url.replace(/[.,;:]+$/, '') });
  }

  return { success: true, content, citations, retryCount: result.retryCount };
}

async function parseCompoundResultWithGroq(
  content: string,
  citations: Array<{ url: string }>,
  companyDomain: string,
  companyName: string,
  groqApiKey: string
): Promise<EnrichedCompanyData | null> {
  const systemPrompt = `You are a company research assistant. Extract structured information from the provided research content.
Return ONLY valid JSON with no markdown formatting, no code blocks, just the raw JSON object.
If information is not found or unclear, omit that field entirely. Be accurate.`;

  const userPrompt = `Extract company information for "${companyName}" (${companyDomain}) from this research:

${content.slice(0, 6000)}

Return a JSON object with these fields (omit any fields where info is not found):
{
  "description": "A clear 1-2 sentence description of what the company does",
  "industry": "Primary industry (e.g., Fintech, SaaS, Healthcare)",
  "location": "Company headquarters only - city and state/country",
  "foundedYear": "Year founded (4-digit year)",
  "companySize": "Employee count range (e.g., '1,000-5,000 employees')",
  "keyPeople": ["Array of key executives - format: 'Name (Title)'"],
  "productSummary": "Brief summary of main products/services"
}

Return ONLY the JSON object.`;

  const result = await resilientFetch<{
    choices?: Array<{ message?: { content?: string } }>;
  }>(
    GROQ_API_URL,
    'groq',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    }
  );

  if (!result.success) return null;

  const responseContent = result.data?.choices?.[0]?.message?.content;
  if (!responseContent) return null;

  try {
    let cleanContent = responseContent.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(cleanContent);
    const enrichment: EnrichedCompanyData = {};
    
    if (parsed.description) enrichment.description = parsed.description;
    if (parsed.industry) enrichment.industry = parsed.industry;
    if (parsed.location) enrichment.location = parsed.location;
    if (parsed.foundedYear) enrichment.foundedYear = String(parsed.foundedYear);
    if (parsed.companySize) enrichment.companySize = parsed.companySize;
    if (Array.isArray(parsed.keyPeople)) enrichment.keyPeople = parsed.keyPeople.slice(0, 5);
    if (parsed.productSummary) enrichment.productSummary = parsed.productSummary;

    // Extract social links from citations
    const socialLinks: { linkedin?: string; twitter?: string; github?: string } = {};
    for (const citation of citations) {
      if (citation.url.includes('linkedin.com/company/')) socialLinks.linkedin = citation.url;
      else if (citation.url.includes('twitter.com/') || citation.url.includes('x.com/')) socialLinks.twitter = citation.url;
      else if (citation.url.includes('github.com/')) socialLinks.github = citation.url;
    }
    if (Object.keys(socialLinks).length > 0) enrichment.socialLinks = socialLinks;

    enrichment.citationUrls = citations.slice(0, 5).map(c => c.url);

    return enrichment;
  } catch {
    return null;
  }
}

// ============================================
// YOU.COM SEARCH
// ============================================

async function searchWithYoucom(
  companyName: string,
  companyDomain: string,
  apiKey: string
): Promise<{ hits: SearchHit[]; error?: string }> {
  const searchQuery = `${companyName} company about "${companyDomain}" headquarters employees founded`;
  const params = new URLSearchParams({ query: searchQuery, num_web_results: '10' });

  const result = await resilientFetch<{ hits?: SearchHit[] }>(
    `${YOUCOM_SEARCH_URL}?${params.toString()}`,
    'youcom',
    {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    }
  );

  if (!result.success) {
    return { hits: [], error: result.error };
  }

  return { hits: result.data?.hits || [] };
}

async function extractEnrichmentWithGroq(
  searchData: { hits?: SearchHit[] },
  companyDomain: string,
  companyName: string,
  groqApiKey: string
): Promise<EnrichedCompanyData | null> {
  const hits = searchData.hits || [];
  if (hits.length === 0) return null;

  const contextParts: string[] = [];
  for (const hit of hits.slice(0, 8)) {
    const parts: string[] = [];
    if (hit.title) parts.push(`Title: ${hit.title}`);
    if (hit.description) parts.push(`Description: ${hit.description}`);
    if (hit.snippets?.length) parts.push(`Snippets: ${hit.snippets.join(' | ')}`);
    if (parts.length > 0) contextParts.push(parts.join('\n'));
  }

  const searchContext = contextParts.join('\n\n---\n\n').substring(0, 6000);

  const result = await resilientFetch<{
    choices?: Array<{ message?: { content?: string } }>;
  }>(
    GROQ_API_URL,
    'groq',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: 'Extract structured company information. Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: `Extract info for "${companyName}" (${companyDomain}) from:\n\n${searchContext}\n\nReturn JSON: {"description":"...","industry":"...","location":"...","foundedYear":"...","companySize":"...","keyPeople":[],"productSummary":"..."}` },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    }
  );

  if (!result.success) return extractEnrichmentFromSearch(searchData, companyDomain, companyName);

  const content = result.data?.choices?.[0]?.message?.content;
  if (!content) return extractEnrichmentFromSearch(searchData, companyDomain, companyName);

  try {
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(cleanContent);
    const enrichment: EnrichedCompanyData = {};
    
    if (parsed.description) enrichment.description = parsed.description;
    if (parsed.industry) enrichment.industry = parsed.industry;
    if (parsed.location) enrichment.location = parsed.location;
    if (parsed.foundedYear) enrichment.foundedYear = String(parsed.foundedYear);
    if (parsed.companySize) enrichment.companySize = parsed.companySize;
    if (Array.isArray(parsed.keyPeople)) enrichment.keyPeople = parsed.keyPeople.slice(0, 5);
    if (parsed.productSummary) enrichment.productSummary = parsed.productSummary;

    // Extract social links from search results
    const socialLinks: { linkedin?: string; twitter?: string; github?: string } = {};
    for (const hit of hits) {
      if (hit.url?.includes('linkedin.com/company/')) socialLinks.linkedin = hit.url;
      else if (hit.url?.includes('twitter.com/') || hit.url?.includes('x.com/')) socialLinks.twitter = hit.url;
      else if (hit.url?.includes('github.com/')) socialLinks.github = hit.url;
    }
    if (Object.keys(socialLinks).length > 0) enrichment.socialLinks = socialLinks;

    return enrichment;
  } catch {
    return extractEnrichmentFromSearch(searchData, companyDomain, companyName);
  }
}

function extractEnrichmentFromSearch(
  searchData: { hits?: SearchHit[] },
  companyDomain: string,
  companyName: string
): EnrichedCompanyData {
  const enrichment: EnrichedCompanyData = {};
  const hits = searchData.hits || [];
  if (hits.length === 0) return enrichment;

  const allText: string[] = [];
  for (const hit of hits) {
    if (hit.title) allText.push(hit.title);
    if (hit.description) allText.push(hit.description);
    if (hit.snippets) allText.push(...hit.snippets);
  }
  const combinedText = allText.join(' ');
  const lowerText = combinedText.toLowerCase();

  // Extract description
  for (const hit of hits) {
    if (hit.url?.includes(companyDomain) && hit.description && hit.description.length > 50 && hit.description.length < 500) {
      const desc = hit.description.replace(/^(About|Overview)[:\s]*/i, '');
      if (!desc.toLowerCase().includes('cookie')) {
        enrichment.description = desc;
        break;
      }
    }
  }

  // Extract industry
  const industries = [
    { keywords: ['saas', 'software as a service'], industry: 'SaaS' },
    { keywords: ['fintech', 'payments', 'banking'], industry: 'Fintech' },
    { keywords: ['healthcare', 'medical'], industry: 'Healthcare' },
    { keywords: ['e-commerce', 'retail'], industry: 'E-commerce' },
    { keywords: ['artificial intelligence', 'machine learning'], industry: 'AI/ML' },
  ];
  for (const { keywords, industry } of industries) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      enrichment.industry = industry;
      break;
    }
  }

  // Extract location
  const locMatch = combinedText.match(/(?:headquartered|based|located)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?:\.|,|$)/i);
  if (locMatch?.[1]) {
    const loc = locMatch[1].trim().replace(/[,\s]+$/, '');
    if (loc.length > 2 && loc.length < 50) enrichment.location = loc;
  }

  // Extract founded year
  const yearMatch = combinedText.match(/(?:founded|established|since)\s+(?:in\s+)?(\d{4})/i);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 1900 && year <= new Date().getFullYear()) enrichment.foundedYear = yearMatch[1];
  }

  // Extract company size
  const sizeMatch = combinedText.match(/(\d[\d,]*)\+?\s*employees/i);
  if (sizeMatch) {
    const num = parseInt(sizeMatch[1].replace(/,/g, ''), 10);
    if (num >= 10000) enrichment.companySize = '10,000+ employees';
    else if (num >= 1000) enrichment.companySize = '1,000-10,000 employees';
    else if (num >= 200) enrichment.companySize = '200-1,000 employees';
    else enrichment.companySize = '1-200 employees';
  }

  // Extract social links
  const socialLinks: { linkedin?: string; twitter?: string; github?: string } = {};
  for (const hit of hits) {
    if (hit.url?.includes('linkedin.com/company/')) socialLinks.linkedin = hit.url;
    else if (hit.url?.includes('twitter.com/') || hit.url?.includes('x.com/')) socialLinks.twitter = hit.url;
    else if (hit.url?.includes('github.com/')) socialLinks.github = hit.url;
  }
  if (Object.keys(socialLinks).length > 0) enrichment.socialLinks = socialLinks;

  return enrichment;
}

// ============================================
// RESPONSE HELPERS
// ============================================

function jsonSuccess(data: EnrichmentResponse): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': data.requestId },
  });
}

function jsonError(message: string, status: number, requestId: string): Response {
  return new Response(JSON.stringify({ success: false, error: message, requestId }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
  });
}

function rateLimitError(resetAt: Date, requestId: string): Response {
  const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
  return new Response(JSON.stringify({
    success: false,
    error: 'Rate limit exceeded. Please wait before making more requests.',
    resetAt: resetAt.toISOString(),
    requestId,
  }), {
    status: 429,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
      'X-RateLimit-Remaining': '0',
      'Retry-After': String(retryAfter),
    },
  });
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonError('Method Not Allowed', 405, requestId);
  }

  try {
    // Parse request body
    let body: FetchContentRequest;
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON request body', 400, requestId);
    }

    // Validate payload
    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      return jsonError('urls array is required and must not be empty', 400, requestId);
    }

    if (body.urls.length > 3) {
      return jsonError('Maximum 3 URLs per request', 400, requestId);
    }

    // Authenticate and authorize
    const auth = await authenticateRequest(req, body.workspaceId);
    if (!auth.isValid) {
      return jsonError(auth.error!, auth.statusCode, requestId);
    }

    log('info', 'Enrichment request received', {
      requestId,
      workspaceId: auth.workspaceId,
      urlCount: body.urls.length,
    });

    // Validate URL
    const urlValidation = validateEnrichmentUrl(body.urls[0]);
    if (!urlValidation.isValid) {
      return jsonError(urlValidation.error!, 400, requestId);
    }

    const { domain, companyName } = urlValidation;

    log('info', 'Enriching company', {
      requestId,
      domain: maskDomain(domain!),
    });

    // Check rate limit (skip for admins)
    if (!auth.isAdmin) {
      const rateLimit = await checkRateLimit(auth.workspaceId!);
      if (!rateLimit.allowed) {
        log('warn', 'Rate limit exceeded', { requestId, workspaceId: auth.workspaceId });
        return rateLimitError(rateLimit.resetAt, requestId);
      }
    }

    // Check cache first (unless force refresh)
    if (body.useCache !== false && !body.forceRefresh) {
      const cacheResult = await getCachedEnrichment(domain!, auth.workspaceId!);
      
      if (cacheResult.found && cacheResult.entry) {
        log('info', 'Cache hit', { requestId, remainingTtlMs: cacheResult.remainingTtlMs });
        
        return jsonSuccess({
          success: true,
          enrichment: cacheResult.entry,
          provider: 'cache',
          cached: true,
          durationMs: Date.now() - startTime,
          confidence: calculateConfidence(cacheResult.entry),
          isFallback: false,
          requestId,
        });
      }
    }

    // Get API keys
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    const youcomApiKey = (Deno.env.get('YOUCOM_API_KEY') || Deno.env.get('YOU_COM_API_KEY'))?.trim();

    if (!groqApiKey && !youcomApiKey) {
      log('error', 'No API keys configured', { requestId });
      return jsonError('Enrichment service not configured. Please contact support.', 503, requestId);
    }

    // Perform enrichment
    let enrichmentResult: EnrichedCompanyData | null = null;
    let providerUsed: SearchProvider = 'fallback';
    const warnings: string[] = [];

    // Try Groq Compound first
    if (groqApiKey && !isCircuitOpen('groq')) {
      log('info', 'Attempting Groq Compound enrichment', { requestId });
      
      const groqResult = await searchWithGroqCompound(companyName!, domain!, groqApiKey);
      
      if (groqResult.success && groqResult.content) {
        const parsed = await parseCompoundResultWithGroq(
          groqResult.content,
          groqResult.citations || [],
          domain!,
          companyName!,
          groqApiKey
        );
        
        if (parsed && Object.keys(parsed).length > 0) {
          enrichmentResult = parsed;
          providerUsed = 'groq-compound';
        }
      } else if (groqResult.error) {
        warnings.push(`Groq: ${groqResult.error}`);
      }
    }

    // Fallback to You.com
    if (!enrichmentResult && youcomApiKey && !isCircuitOpen('youcom')) {
      log('info', 'Falling back to You.com Search', { requestId });
      
      const youcomResult = await searchWithYoucom(companyName!, domain!, youcomApiKey);
      
      if (youcomResult.hits && youcomResult.hits.length > 0) {
        if (groqApiKey) {
          const parsed = await extractEnrichmentWithGroq(youcomResult, domain!, companyName!, groqApiKey);
          if (parsed && Object.keys(parsed).length > 0) {
            enrichmentResult = parsed;
            providerUsed = 'youcom';
          }
        } else {
          enrichmentResult = extractEnrichmentFromSearch(youcomResult, domain!, companyName!);
          providerUsed = 'youcom';
        }
      } else if (youcomResult.error) {
        warnings.push(`You.com: ${youcomResult.error}`);
      }
    }

    // Handle complete failure
    let isFallbackResponse = false;
    if (!enrichmentResult) {
      log('warn', 'All providers failed', { requestId });
      enrichmentResult = {
        aiGenerated: true,
        source: 'fallback',
        confidence: 0,
      };
      providerUsed = 'fallback';
      isFallbackResponse = true;
      warnings.push('Could not retrieve company information from any source');
    }

    // Validate and normalize
    const validation = validateEnrichmentData(enrichmentResult);
    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings);
    }

    // Add provenance
    const finalEnrichment: EnrichedCompanyData = {
      ...validation.validated,
      confidence: calculateConfidence(validation.validated),
      source: providerUsed,
      aiGenerated: true,
    };

    // Check if fallback content
    isFallbackResponse = isFallbackResponse || isFallbackContent(validation.validated, domain!);

    // Cache the result (unless fallback)
    if (!isFallbackResponse && providerUsed !== 'fallback') {
      await setCachedEnrichment(domain!, auth.workspaceId!, finalEnrichment, providerUsed);
    }

    const durationMs = Date.now() - startTime;

    log('info', 'Enrichment completed', {
      requestId,
      provider: providerUsed,
      durationMs,
      confidence: finalEnrichment.confidence,
      isFallback: isFallbackResponse,
    });

    return jsonSuccess({
      success: !isFallbackResponse,
      enrichment: finalEnrichment,
      provider: providerUsed,
      cached: false,
      durationMs,
      confidence: finalEnrichment.confidence || null,
      isFallback: isFallbackResponse,
      requestId,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Internal server error';
    log('error', 'Unexpected error', { requestId, error });
    return jsonError('An unexpected error occurred. Please try again.', 500, requestId);
  }
});
