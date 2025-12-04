/// <reference path="../types/deno_http_server.d.ts" />
// supabase/functions/fetch-company-content/index.ts
// Edge Function: Fetch and enrich company data using Groq Compound (primary) or You.com Search API (fallback)
// Used for auto-filling company profiles in CRM when a website URL is provided
// Optimized for Groq Dev Tier - uses Compound for ~5x faster web search

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders as sharedCorsHeaders } from '../_shared/apiAuth.ts';

// Groq API endpoints
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// You.com Search API endpoint (fallback)
const YOUCOM_SEARCH_URL = "https://api.ydc-index.io/search";

// Search provider preference
type SearchProvider = 'groq-compound' | 'youcom';

// Rate limiting configuration
const RATE_LIMIT = 20; // requests per minute per user
const RATE_WINDOW_MS = 60_000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

// Cache configuration
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Extended CORS headers
const corsHeaders = {
  ...sharedCorsHeaders,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-workspace-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const checkRateLimit = (userId: string): { allowed: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit || now >= userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW_MS };
  }

  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: userLimit.resetAt - now };
  }

  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count, resetIn: userLimit.resetAt - now };
};

interface FetchContentRequest {
  urls: string[];
  workspaceId?: string;
  useCache?: boolean;
  provider?: SearchProvider; // Allow client to specify provider
}

interface SearchHit {
  title?: string;
  description?: string;
  url?: string;
  snippets?: string[];
}

interface GroqCompoundResult {
  success: boolean;
  content?: string;
  citations?: Array<{ url: string; title?: string }>;
  error?: string;
}

interface EnrichmentResult {
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
  searchResults?: SearchHit[];
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[fetch-company-content] Received request');
    
    // Get user ID from auth header
    const authHeader = req.headers.get('authorization');
    let userId = 'anonymous';
    let supabase: ReturnType<typeof createClient> | null = null;
    
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          console.log('[fetch-company-content] Authenticated user:', userId);
        }
      } catch (e) {
        console.warn('[fetch-company-content] Auth check failed');
      }
    }

    // Rate limiting
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      console.warn(`[fetch-company-content] Rate limit exceeded for ${userId}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before making more requests.',
          resetIn: Math.ceil(rateCheck.resetIn / 1000),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateCheck.remaining),
          },
        }
      );
    }

    // Get API keys - Groq is primary, You.com is optional fallback
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    let youcomApiKey = Deno.env.get('YOUCOM_API_KEY') || Deno.env.get('YOU_COM_API_KEY');
    
    // Trim any whitespace that might have been accidentally added
    if (youcomApiKey) {
      youcomApiKey = youcomApiKey.trim();
    }
    
    // At least one API key is required
    if (!groqApiKey && !youcomApiKey) {
      console.error('[fetch-company-content] No API keys configured (need GROQ_API_KEY or YOUCOM_API_KEY)');
      return new Response(
        JSON.stringify({ error: 'Search API not configured. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[fetch-company-content] API Keys available - Groq: ${!!groqApiKey}, You.com: ${!!youcomApiKey}`);

    // Parse request body
    const body = await req.json() as FetchContentRequest;

    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'urls array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract company domain from first URL
    let companyDomain = '';
    let companyName = '';
    try {
      const url = body.urls[0].startsWith('http') ? body.urls[0] : `https://${body.urls[0]}`;
      const parsed = new URL(url);
      companyDomain = parsed.hostname.replace('www.', '');
      // Extract company name from domain (e.g., "stripe.com" -> "Stripe")
      companyName = companyDomain.split('.')[0];
      companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
    } catch {
      console.warn(`[fetch-company-content] Invalid URL: ${body.urls[0]}`);
      return new Response(
        JSON.stringify({ error: 'Invalid URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-company-content] Searching for company: ${companyName} (${companyDomain})`);
    
    // Determine search provider: prefer Groq Compound, fallback to You.com only if available
    const preferredProvider: SearchProvider = body.provider || 'groq-compound';
    let enrichment: EnrichmentResult;
    let providerUsed: SearchProvider = preferredProvider;
    const startTime = Date.now();

    if (preferredProvider === 'groq-compound' && groqApiKey) {
      console.log('[fetch-company-content] Using Groq Compound for web search (primary)');
      
      // Try Groq Compound first - ~5x faster than You.com
      const compoundResult = await searchWithGroqCompound(companyName, companyDomain, groqApiKey);
      
      if (compoundResult.success && compoundResult.content) {
        console.log(`[fetch-company-content] Groq Compound search completed in ${Date.now() - startTime}ms`);
        
        // Parse the compound result with GPT-OSS for superior reasoning
        enrichment = await parseCompoundResultWithGroq(
          compoundResult.content,
          compoundResult.citations || [],
          companyDomain,
          companyName,
          groqApiKey
        );
        providerUsed = 'groq-compound';
      } else if (youcomApiKey) {
        // Fallback to You.com only if key is available
        console.log('[fetch-company-content] Groq Compound failed, falling back to You.com');
        const youcomResult = await searchWithYoucom(companyName, companyDomain, youcomApiKey);
        enrichment = await extractEnrichmentWithGroq(youcomResult, companyDomain, companyName, groqApiKey);
        providerUsed = 'youcom';
      } else {
        // No fallback available, return partial result
        console.log('[fetch-company-content] Groq Compound failed, no You.com fallback available');
        enrichment = {
          description: `${companyName} - Visit ${companyDomain} for more information.`,
        };
        providerUsed = 'groq-compound';
      }
    } else if (groqApiKey && youcomApiKey) {
      // You.com search with Groq parsing
      console.log('[fetch-company-content] Using You.com Search with Groq parsing');
      const youcomResult = await searchWithYoucom(companyName, companyDomain, youcomApiKey);
      enrichment = await extractEnrichmentWithGroq(youcomResult, companyDomain, companyName, groqApiKey);
      providerUsed = 'youcom';
    } else if (groqApiKey) {
      // Groq only - use Compound
      console.log('[fetch-company-content] Using Groq Compound (You.com not configured)');
      const compoundResult = await searchWithGroqCompound(companyName, companyDomain, groqApiKey);
      if (compoundResult.success && compoundResult.content) {
        enrichment = await parseCompoundResultWithGroq(
          compoundResult.content,
          compoundResult.citations || [],
          companyDomain,
          companyName,
          groqApiKey
        );
      } else {
        enrichment = {
          description: `${companyName} - Visit ${companyDomain} for more information.`,
        };
      }
      providerUsed = 'groq-compound';
    } else if (youcomApiKey) {
      // You.com search with regex fallback (no Groq)
      console.log('[fetch-company-content] Using You.com with regex fallback (Groq not configured)');
      const youcomResult = await searchWithYoucom(companyName, companyDomain, youcomApiKey);
      enrichment = extractEnrichmentFromSearch(youcomResult, companyDomain, companyName);
      providerUsed = 'youcom';
    } else {
      // This shouldn't happen due to earlier check, but handle it
      enrichment = {
        description: `${companyName} - Visit ${companyDomain} for more information.`,
      };
      providerUsed = 'groq-compound';
    }

    const duration = Date.now() - startTime;
    console.log(`[fetch-company-content] Enrichment completed in ${duration}ms using ${providerUsed}`);
    console.log(`[fetch-company-content] Enrichment result:`, JSON.stringify({
      hasDescription: !!enrichment.description,
      hasIndustry: !!enrichment.industry,
      hasLocation: !!enrichment.location,
      hasCompanySize: !!enrichment.companySize,
      provider: providerUsed,
      durationMs: duration,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        enrichment,
        provider: providerUsed,
        durationMs: duration,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );

  } catch (err: unknown) {
    console.error('[fetch-company-content] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Search using Groq Compound - ~5x faster than You.com
 * Uses web_search tool capability for real-time search
 */
async function searchWithGroqCompound(
  companyName: string,
  companyDomain: string,
  groqApiKey: string
): Promise<GroqCompoundResult> {
  try {
    const searchPrompt = `Search for comprehensive information about ${companyName} (${companyDomain}). 
Find: company description, industry, headquarters location, founding year, employee count, key executives, and main products/services.
Focus on their official website and reliable business sources like LinkedIn, Crunchbase, Bloomberg, or TechCrunch.`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'compound-beta', // Groq Compound with web search
        messages: [
          {
            role: 'user',
            content: searchPrompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetch-company-content] Groq Compound error:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Extract citations from the response if available
    const citations: Array<{ url: string; title?: string }> = [];
    const urlMatches = content?.match(/https?:\/\/[^\s\)\]]+/g) || [];
    for (const url of urlMatches.slice(0, 10)) {
      citations.push({ url: url.replace(/[.,;:]+$/, '') });
    }

    return {
      success: true,
      content: content || '',
      citations,
    };
  } catch (error) {
    console.error('[fetch-company-content] Groq Compound exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Search using You.com Search API (fallback)
 */
async function searchWithYoucom(
  companyName: string,
  companyDomain: string,
  apiKey: string
): Promise<{ hits: SearchHit[] }> {
  const searchQuery1 = `${companyName} company about "${companyDomain}"`;
  const searchQuery2 = `${companyName} headquarters location employees founded`;
  
  const params1 = new URLSearchParams({
    query: searchQuery1,
    num_web_results: '8',
  });
  
  const params2 = new URLSearchParams({
    query: searchQuery2,
    num_web_results: '8',
  });

  console.log(`[fetch-company-content] You.com search queries: "${searchQuery1}" and "${searchQuery2}"`);

  const [searchResponse1, searchResponse2] = await Promise.all([
    fetch(`${YOUCOM_SEARCH_URL}?${params1.toString()}`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    }),
    fetch(`${YOUCOM_SEARCH_URL}?${params2.toString()}`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    }),
  ]);

  console.log(`[fetch-company-content] You.com responses: ${searchResponse1.status}, ${searchResponse2.status}`);

  if (!searchResponse1.ok) {
    console.error('[fetch-company-content] You.com search failed');
    return { hits: [] };
  }

  const [searchData1, searchData2] = await Promise.all([
    searchResponse1.json(),
    searchResponse2.ok ? searchResponse2.json() : { hits: [] },
  ]);
  
  // Combine hits from both searches, removing duplicates by URL
  const allHits = [...(searchData1.hits || [])];
  const seenUrls = new Set(allHits.map((h: { url?: string }) => h.url));
  for (const hit of (searchData2.hits || [])) {
    if (!seenUrls.has(hit.url)) {
      allHits.push(hit);
      seenUrls.add(hit.url);
    }
  }
  
  return { hits: allHits };
}

/**
 * Parse Groq Compound result with GPT-OSS for superior reasoning
 */
async function parseCompoundResultWithGroq(
  content: string,
  citations: Array<{ url: string; title?: string }>,
  companyDomain: string,
  companyName: string,
  groqApiKey: string
): Promise<EnrichmentResult> {
  const enrichment: EnrichmentResult = {
    searchResults: citations.slice(0, 5).map(c => ({
      title: c.title,
      url: c.url,
    })),
  };

  const systemPrompt = `You are a company research assistant. Extract structured information from the provided research content.
Return ONLY valid JSON with no markdown formatting, no code blocks, just the raw JSON object.
If information is not found or unclear, omit that field entirely.
Be accurate - only include information you're confident about.`;

  const userPrompt = `Extract company information for "${companyName}" (${companyDomain}) from this research:

${content.slice(0, 6000)}

Return a JSON object with these fields (omit any fields where info is not found):
{
  "description": "A clear 1-2 sentence description of what the company does",
  "industry": "Primary industry (e.g., Fintech, SaaS, Healthcare, E-commerce, AI/ML)",
  "location": "Company PRIMARY headquarters only - city and state/country",
  "foundedYear": "Year the company was founded (4-digit year)",
  "companySize": "Employee count range (e.g., '1,000-5,000 employees')",
  "keyPeople": ["Array of key executives - format: 'Name (Title)'"],
  "productSummary": "Brief summary of main products/services"
}

IMPORTANT: Return ONLY the JSON object, no markdown, no code blocks.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b', // Superior reasoning for parsing
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('[fetch-company-content] GPT-OSS parsing error');
      return enrichment;
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      return enrichment;
    }

    // Parse JSON response
    let cleanContent = responseContent.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(cleanContent);
    
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
      if (citation.url.includes('linkedin.com/company/')) {
        socialLinks.linkedin = citation.url;
      } else if (citation.url.includes('twitter.com/') || citation.url.includes('x.com/')) {
        socialLinks.twitter = citation.url;
      } else if (citation.url.includes('github.com/')) {
        socialLinks.github = citation.url;
      }
    }
    if (Object.keys(socialLinks).length > 0) {
      enrichment.socialLinks = socialLinks;
    }

    return enrichment;
  } catch (error) {
    console.error('[fetch-company-content] Parse error:', error);
    return enrichment;
  }
}

/**
 * Extract structured company information from search results
 */
function extractEnrichmentFromSearch(
  searchData: { hits?: Array<{ title?: string; description?: string; url?: string; snippets?: string[] }> },
  companyDomain: string,
  companyName: string
): EnrichmentResult {
  const enrichment: EnrichmentResult = {
    searchResults: [],
  };

  const hits = searchData.hits || [];
  
  if (hits.length === 0) {
    console.log('[fetch-company-content] No search results found');
    return enrichment;
  }

  // Store relevant search results
  enrichment.searchResults = hits.slice(0, 5).map(hit => ({
    title: hit.title,
    description: hit.description,
    url: hit.url,
    snippets: hit.snippets,
  }));

  // Combine all text for analysis
  const allText: string[] = [];
  for (const hit of hits) {
    if (hit.title) allText.push(hit.title);
    if (hit.description) allText.push(hit.description);
    if (hit.snippets) allText.push(...hit.snippets);
  }
  const combinedText = allText.join(' ');
  const lowerText = combinedText.toLowerCase();

  // Find the best description from results that mention the company
  for (const hit of hits) {
    if (hit.url?.includes(companyDomain) || hit.title?.toLowerCase().includes(companyName.toLowerCase())) {
      if (hit.description && hit.description.length > 50 && hit.description.length < 500) {
        // Clean up the description
        let desc = hit.description;
        // Remove common prefixes
        desc = desc.replace(/^(About|Overview|Company Profile)[:\s]*/i, '');
        if (!desc.toLowerCase().includes('cookie') && !desc.toLowerCase().includes('privacy policy')) {
          enrichment.description = desc;
          console.log(`[fetch-company-content] Found description from ${hit.url}`);
          break;
        }
      }
    }
  }

  // If no good description from company site, use first relevant snippet
  if (!enrichment.description) {
    for (const hit of hits) {
      if (hit.snippets && hit.snippets.length > 0) {
        const snippet = hit.snippets.find(s => 
          s.length > 50 && 
          s.length < 500 && 
          (s.toLowerCase().includes(companyName.toLowerCase()) || s.includes(companyDomain))
        );
        if (snippet) {
          enrichment.description = snippet;
          console.log(`[fetch-company-content] Using snippet as description`);
          break;
        }
      }
    }
  }

  // Extract industry from content
  const industryKeywords = [
    { keywords: ['saas', 'software as a service', 'cloud software', 'subscription software'], industry: 'SaaS' },
    { keywords: ['fintech', 'financial technology', 'payments', 'banking', 'payment processing', 'financial infrastructure'], industry: 'Fintech' },
    { keywords: ['healthcare', 'health tech', 'medical', 'telemedicine', 'healthtech'], industry: 'Healthcare' },
    { keywords: ['e-commerce', 'ecommerce', 'online retail', 'marketplace', 'retail', 'shopping'], industry: 'E-commerce' },
    { keywords: ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'ai platform'], industry: 'AI/ML' },
    { keywords: ['cybersecurity', 'security', 'infosec', 'threat detection', 'data protection'], industry: 'Cybersecurity' },
    { keywords: ['edtech', 'education', 'learning platform', 'online learning', 'e-learning'], industry: 'EdTech' },
    { keywords: ['developer tools', 'api', 'devtools', 'sdk', 'developer platform'], industry: 'Developer Tools' },
    { keywords: ['marketing', 'martech', 'advertising', 'ad tech', 'marketing automation'], industry: 'Marketing Tech' },
    { keywords: ['hr tech', 'human resources', 'recruiting', 'hiring', 'talent', 'workforce'], industry: 'HR Tech' },
    { keywords: ['logistics', 'supply chain', 'shipping', 'delivery', 'freight'], industry: 'Logistics' },
    { keywords: ['real estate', 'proptech', 'property', 'housing'], industry: 'Real Estate' },
    { keywords: ['food', 'restaurant', 'delivery', 'meal', 'dining'], industry: 'Food & Beverage' },
  ];

  for (const { keywords, industry } of industryKeywords) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      enrichment.industry = industry;
      console.log(`[fetch-company-content] Detected industry: ${industry}`);
      break;
    }
  }

  // Extract location from text
  const locationPatterns = [
    /(?:headquartered|based|located)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?:\.|,|$)/i,
    /(?:headquarters|hq)\s*(?:in|:)\s*([A-Z][a-zA-Z\s,]+?)(?:\.|,|$)/i,
    /([A-Z][a-z]+(?:,\s*(?:CA|NY|TX|WA|MA|IL|CO|GA|FL|OR|AZ|NC|VA|PA|OH|MI|NJ|WI|MN|TN|MD|IN|MO|CT|KY|SC|LA|AL|OK|IA|MS|AR|KS|NV|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY|DC))?)\s+(?:office|headquarters)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = combinedText.match(pattern);
    if (match && match[1]) {
      const loc = match[1].trim().replace(/[,\s]+$/, '');
      if (loc.length > 2 && loc.length < 50) {
        enrichment.location = loc;
        console.log(`[fetch-company-content] Found location: ${loc}`);
        break;
      }
    }
  }

  // Extract founded year
  const foundedPatterns = [
    /(?:founded|established|started|since|est\.?)\s+(?:in\s+)?(\d{4})/i,
    /(\d{4})\s*[-–]\s*(?:present|today|now)/i,
  ];

  for (const pattern of foundedPatterns) {
    const match = combinedText.match(pattern);
    if (match && match[1]) {
      const year = parseInt(match[1], 10);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        enrichment.foundedYear = match[1];
        console.log(`[fetch-company-content] Found founded year: ${year}`);
        break;
      }
    }
  }

  // Extract company size
  const sizePatterns = [
    /(\d[\d,]*)\+?\s*employees/i,
    /team\s+of\s+(\d[\d,]*)/i,
    /(\d[\d,]*)\s+team\s+members/i,
  ];

  for (const pattern of sizePatterns) {
    const match = combinedText.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1].replace(/,/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        if (num >= 10000) enrichment.companySize = '10,000+ employees';
        else if (num >= 1000) enrichment.companySize = '1,000-10,000 employees';
        else if (num >= 500) enrichment.companySize = '500-1,000 employees';
        else if (num >= 200) enrichment.companySize = '200-500 employees';
        else if (num >= 50) enrichment.companySize = '50-200 employees';
        else if (num >= 11) enrichment.companySize = '11-50 employees';
        else enrichment.companySize = '1-10 employees';
        console.log(`[fetch-company-content] Found company size: ${enrichment.companySize}`);
        break;
      }
    }
  }

  // Extract social links from URLs in results
  const socialLinks: { linkedin?: string; twitter?: string; github?: string } = {};
  
  for (const hit of hits) {
    if (hit.url) {
      if (hit.url.includes('linkedin.com/company/')) {
        socialLinks.linkedin = hit.url;
      } else if (hit.url.includes('twitter.com/') || hit.url.includes('x.com/')) {
        socialLinks.twitter = hit.url;
      } else if (hit.url.includes('github.com/')) {
        socialLinks.github = hit.url;
      }
    }
  }
  
  if (Object.keys(socialLinks).length > 0) {
    enrichment.socialLinks = socialLinks;
  }

  // Extract key people
  const peoplePatterns = [
    /(?:CEO|founder|co-founder|chief executive)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:,?\s+(?:CEO|founder|co-founder|chief executive))/gi,
  ];

  const people = new Set<string>();
  for (const pattern of peoplePatterns) {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1] && match[1].length > 3 && match[1].length < 40) {
        people.add(match[1]);
      }
    }
  }
  
  if (people.size > 0) {
    enrichment.keyPeople = Array.from(people).slice(0, 3);
    console.log(`[fetch-company-content] Found key people: ${enrichment.keyPeople.join(', ')}`);
  }

  return enrichment;
}

/**
 * Use Groq AI to intelligently extract company information from search results
 */
async function extractEnrichmentWithGroq(
  searchData: { hits?: Array<{ title?: string; description?: string; url?: string; snippets?: string[] }> },
  companyDomain: string,
  companyName: string,
  groqApiKey: string
): Promise<EnrichmentResult> {
  const enrichment: EnrichmentResult = {
    searchResults: [],
  };

  const hits = searchData.hits || [];
  
  if (hits.length === 0) {
    console.log('[fetch-company-content] No search results to analyze with Groq');
    return enrichment;
  }

  // Store relevant search results
  enrichment.searchResults = hits.slice(0, 5).map(hit => ({
    title: hit.title,
    description: hit.description,
    url: hit.url,
    snippets: hit.snippets,
  }));

  // Prepare context for Groq - combine all search result text
  const contextParts: string[] = [];
  for (const hit of hits.slice(0, 8)) {
    const parts: string[] = [];
    if (hit.title) parts.push(`Title: ${hit.title}`);
    if (hit.description) parts.push(`Description: ${hit.description}`);
    if (hit.url) parts.push(`URL: ${hit.url}`);
    if (hit.snippets && hit.snippets.length > 0) {
      parts.push(`Snippets: ${hit.snippets.join(' | ')}`);
    }
    if (parts.length > 0) {
      contextParts.push(parts.join('\n'));
    }
  }
  
  const searchContext = contextParts.join('\n\n---\n\n');
  
  // Limit context size to avoid token limits
  const maxContextLength = 6000;
  const truncatedContext = searchContext.length > maxContextLength 
    ? searchContext.substring(0, maxContextLength) + '...'
    : searchContext;

  const systemPrompt = `You are a company research assistant. Extract structured information about a company from search results.
Return ONLY valid JSON with no markdown formatting, no code blocks, just the raw JSON object.
If information is not found or unclear, omit that field entirely (don't include null or empty values).
Be accurate - only include information you're confident about from the search results.
For well-known companies, you may use your knowledge to fill in standard facts like headquarters location.`;

  const userPrompt = `Extract company information for "${companyName}" (${companyDomain}) from these search results:

${truncatedContext}

Return a JSON object with these fields (omit any fields where info is not found):
{
  "description": "A clear 1-2 sentence description of what the company does (their main business/product)",
  "industry": "The company's primary industry (e.g., Fintech, SaaS, Healthcare, E-commerce, AI/ML, Cybersecurity, EdTech, Developer Tools, Marketing Tech, HR Tech, Logistics)",
  "location": "Company PRIMARY headquarters only - city and state/country (e.g., 'San Francisco, CA' or 'Dublin, Ireland'). Do NOT list multiple locations.",
  "foundedYear": "Year the company was founded (just the 4-digit year)",
  "companySize": "Employee count range (e.g., '1,000-5,000 employees', '5,000-10,000 employees', '10,000+ employees')",
  "keyPeople": ["Array of key executives like CEO, founders - format: 'Name (Title)'"],
  "productSummary": "Brief summary of main products/services"
}

IMPORTANT: 
- For location, return ONLY the primary/main headquarters, not multiple office locations.
- For well-known companies, use your knowledge if the search results don't have complete info.

Remember: Return ONLY the JSON object, no markdown, no code blocks.`;

  try {
    console.log('[fetch-company-content] Calling Groq API for intelligent parsing');
    
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b', // GPT-OSS for superior reasoning
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('[fetch-company-content] Groq API error:', errorText);
      // Fall back to regex extraction
      return extractEnrichmentFromSearch(searchData, companyDomain, companyName);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.warn('[fetch-company-content] Empty response from Groq');
      return extractEnrichmentFromSearch(searchData, companyDomain, companyName);
    }

    console.log('[fetch-company-content] Groq response:', content.substring(0, 200));

    // Parse the JSON response
    try {
      // Clean up the response - remove any markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanContent);
      
      // Map parsed fields to enrichment
      if (parsed.description && typeof parsed.description === 'string') {
        enrichment.description = parsed.description;
      }
      if (parsed.industry && typeof parsed.industry === 'string') {
        enrichment.industry = parsed.industry;
      }
      if (parsed.location && typeof parsed.location === 'string') {
        enrichment.location = parsed.location;
      }
      if (parsed.foundedYear) {
        enrichment.foundedYear = String(parsed.foundedYear);
      }
      if (parsed.companySize && typeof parsed.companySize === 'string') {
        enrichment.companySize = parsed.companySize;
      }
      if (Array.isArray(parsed.keyPeople) && parsed.keyPeople.length > 0) {
        enrichment.keyPeople = parsed.keyPeople.slice(0, 5);
      }
      if (parsed.productSummary && typeof parsed.productSummary === 'string') {
        enrichment.productSummary = parsed.productSummary;
      }

      console.log('[fetch-company-content] Successfully parsed Groq response');
      
    } catch (parseError) {
      console.error('[fetch-company-content] Failed to parse Groq JSON:', parseError);
      // Fall back to regex extraction
      return extractEnrichmentFromSearch(searchData, companyDomain, companyName);
    }

    // Also extract social links from search results (Groq doesn't do this well)
    const socialLinks: { linkedin?: string; twitter?: string; github?: string } = {};
    for (const hit of hits) {
      if (hit.url) {
        if (hit.url.includes('linkedin.com/company/')) {
          socialLinks.linkedin = hit.url;
        } else if (hit.url.includes('twitter.com/') || hit.url.includes('x.com/')) {
          socialLinks.twitter = hit.url;
        } else if (hit.url.includes('github.com/')) {
          socialLinks.github = hit.url;
        }
      }
    }
    if (Object.keys(socialLinks).length > 0) {
      enrichment.socialLinks = socialLinks;
    }

    return enrichment;

  } catch (err) {
    console.error('[fetch-company-content] Groq extraction error:', err);
    // Fall back to regex extraction
    return extractEnrichmentFromSearch(searchData, companyDomain, companyName);
  }
}
