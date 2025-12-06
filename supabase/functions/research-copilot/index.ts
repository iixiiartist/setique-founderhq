/// <reference path="../types/deno_http_server.d.ts" />
// supabase/functions/research-copilot/index.ts
// Enhanced Research Copilot Edge Function
// Combines Groq Compound for fast search with intelligent synthesis
// Produces structured, GTM-ready research briefs with source quality scoring

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders as sharedCorsHeaders } from '../_shared/apiAuth.ts';

// API endpoints
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const YOUCOM_SEARCH_URL = "https://ydc-index.io/v1/search";
const YOUCOM_AGENT_URL = "https://api.you.com/v1/agents/runs";

// Research mode types
type ResearchMode = 'quick' | 'deep' | 'competitive' | 'market' | 'synthesis';

// Models configuration
const MODELS = {
  search: 'groq/compound',           // Best for web search
  searchFast: 'groq/compound-mini',  // Faster search
  synthesis: 'llama-3.3-70b-versatile', // Best for synthesis
  analysis: 'qwen3-32b',             // Good for analysis
};

// Rate limiting
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const corsHeaders = {
  ...sharedCorsHeaders,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-workspace-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// Types
// ============================================================================

interface ResearchRequest {
  query: string;
  mode: ResearchMode;
  docContext?: {
    title?: string;
    type?: string;
    workspace?: string;
    tags?: string[];
  };
  options?: {
    maxSources?: number;
    synthesize?: boolean;
    includeCompetitors?: boolean;
    freshness?: 'day' | 'week' | 'month' | 'year';
  };
}

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  quality: number;       // 0-100 quality score
  freshness: string;     // 'recent' | 'moderate' | 'dated'
  domain: string;
  type: 'news' | 'article' | 'research' | 'company' | 'government' | 'other';
}

interface ResearchInsight {
  type: 'key_finding' | 'statistic' | 'trend' | 'opportunity' | 'risk' | 'action';
  title: string;
  content: string;
  confidence: 'high' | 'medium' | 'low';
  sources: number[]; // indices into sources array
}

interface ResearchResponse {
  synthesis: {
    summary: string;
    insights: ResearchInsight[];
    keyStats: Array<{ label: string; value: string; source?: number }>;
  };
  sources: ResearchSource[];
  rawAnswer?: string;
  metadata: {
    mode: ResearchMode;
    query: string;
    provider: string;
    durationMs: number;
    sourceCount: number;
    synthesisModel?: string;
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

// NOTE: This in-memory rate limiter is per-edge-instance. For stronger abuse
// protection in high-scale scenarios, consider moving to a shared store:
// - Supabase table with atomic increment (simple, no external deps)
// - Redis/Upstash (low latency, supports TTL natively)
// - KV store like Deno KV or Cloudflare KV

/**
 * Check and update rate limit for a user+workspace combination.
 * Uses workspace-scoped keys to prevent cross-workspace abuse while
 * allowing legitimate multi-workspace usage.
 */
const checkRateLimit = (
  userId: string,
  workspaceId?: string | null
): { allowed: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  
  // Scope rate limit to user+workspace for multi-tenant isolation
  const rateLimitKey = workspaceId ? `${userId}:${workspaceId}` : userId;
  const userLimit = rateLimits.get(rateLimitKey);

  if (!userLimit || now >= userLimit.resetAt) {
    rateLimits.set(rateLimitKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW_MS };
  }

  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: userLimit.resetAt - now };
  }

  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count, resetIn: userLimit.resetAt - now };
};

// ============================================================================
// Input Validation
// ============================================================================

const MAX_QUERY_LENGTH = 500;

const BLOCKED_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /\[?\s*system\s*\]?:/i,
];

function sanitizeQuery(query: string): { sanitized: string; blocked: boolean } {
  let sanitized = query.trim();
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sanitized)) {
      return { sanitized: '', blocked: true };
    }
  }
  
  if (sanitized.length > MAX_QUERY_LENGTH) {
    sanitized = sanitized.substring(0, MAX_QUERY_LENGTH);
  }
  
  // Redact emails and phone numbers
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]');
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');
  
  return { sanitized, blocked: false };
}

// ============================================================================
// Source Quality Scoring
// ============================================================================

const AUTHORITATIVE_DOMAINS = [
  'mckinsey.com', 'hbr.org', 'forbes.com', 'bloomberg.com', 'wsj.com',
  'reuters.com', 'nytimes.com', 'techcrunch.com', 'venturebeat.com',
  'gartner.com', 'forrester.com', 'statista.com', 'crunchbase.com',
  'linkedin.com', 'harvard.edu', 'stanford.edu', 'mit.edu',
  'gov', 'edu', 'nature.com', 'sciencedirect.com',
];

const NEWS_DOMAINS = [
  'techcrunch.com', 'venturebeat.com', 'bloomberg.com', 'reuters.com',
  'wsj.com', 'forbes.com', 'businessinsider.com', 'cnbc.com',
];

const RESEARCH_DOMAINS = [
  'mckinsey.com', 'hbr.org', 'gartner.com', 'forrester.com',
  'deloitte.com', 'pwc.com', 'ey.com', 'kpmg.com', 'bain.com', 'bcg.com',
];

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function scoreSource(source: { title?: string; url?: string; snippet?: string }): ResearchSource {
  const url = source.url || '';
  const domain = extractDomain(url);
  const title = source.title || '';
  const snippet = source.snippet || '';
  
  let quality = 50; // Base score
  let type: ResearchSource['type'] = 'other';
  
  // Domain authority scoring
  const domainLower = domain.toLowerCase();
  
  if (domainLower.endsWith('.gov')) {
    quality += 25;
    type = 'government';
  } else if (domainLower.endsWith('.edu')) {
    quality += 20;
    type = 'research';
  } else if (RESEARCH_DOMAINS.some(d => domainLower.includes(d))) {
    quality += 20;
    type = 'research';
  } else if (NEWS_DOMAINS.some(d => domainLower.includes(d))) {
    quality += 15;
    type = 'news';
  } else if (AUTHORITATIVE_DOMAINS.some(d => domainLower.includes(d))) {
    quality += 15;
    type = 'article';
  }
  
  // Content richness scoring
  if (snippet.length > 200) quality += 5;
  if (snippet.length > 400) quality += 5;
  if (title.length > 20) quality += 3;
  
  // Presence of numbers/stats indicates data-rich content
  const hasStats = /\d+%|\$\d+|\d+\s*(million|billion|M|B|K)/i.test(snippet);
  if (hasStats) quality += 10;
  
  // Year mentions for freshness
  const currentYear = new Date().getFullYear();
  const hasRecentYear = snippet.includes(String(currentYear)) || snippet.includes(String(currentYear - 1));
  const freshness: 'recent' | 'moderate' | 'dated' = hasRecentYear ? 'recent' : 'moderate';
  if (hasRecentYear) quality += 5;
  
  // Cap quality score
  quality = Math.min(100, Math.max(0, quality));
  
  return {
    title: title || domain,
    url,
    snippet,
    quality,
    freshness,
    domain,
    type,
  };
}

// ============================================================================
// Groq Compound Search
// ============================================================================

async function searchWithGroqCompound(
  query: string,
  apiKey: string,
  options: { fast?: boolean; context?: string } = {}
): Promise<{ answer: string; sources: ResearchSource[]; durationMs: number }> {
  const startTime = performance.now();
  const model = options.fast ? MODELS.searchFast : MODELS.search;
  
  const systemPrompt = `You are a GTM research analyst specializing in market intelligence, competitive analysis, and business insights.

When researching:
1. Prioritize current, actionable insights (2024-2025 data preferred)
2. Include specific statistics, percentages, and dollar amounts when available
3. Note market trends, competitive dynamics, and key players
4. Cite sources with full URLs
5. Structure your findings clearly with key takeaways

${options.context ? `Research Context: ${options.context}` : ''}`;

  const userPrompt = `Research the following topic and provide a comprehensive, data-driven analysis:

${query}

Provide:
1. **Key Findings**: Most important insights (3-5 bullet points)
2. **Market Data**: Relevant statistics, market size, growth rates
3. **Competitive Landscape**: Key players and their positioning
4. **Trends & Signals**: Current trends and future outlook
5. **Sources**: List all sources with URLs

Be specific with numbers and always cite sources.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[research-copilot] Groq error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const content = message?.content || '';
    
    // Extract sources from executed_tools if available
    const sources: ResearchSource[] = [];
    const executedTools = message?.executed_tools || data.executed_tools || [];
    
    if (Array.isArray(executedTools)) {
      for (const tool of executedTools) {
        if ((tool.name === 'web_search' || tool.type === 'web_search') && Array.isArray(tool.results)) {
          for (const result of tool.results) {
            if (result.url) {
              sources.push(scoreSource({
                title: result.title,
                url: result.url,
                snippet: result.snippet || result.description || result.text,
              }));
            }
          }
        }
        if (tool.output?.search_results && Array.isArray(tool.output.search_results)) {
          for (const result of tool.output.search_results) {
            if (result.url) {
              sources.push(scoreSource({
                title: result.title,
                url: result.url,
                snippet: result.snippet || result.description || result.text,
              }));
            }
          }
        }
      }
    }
    
    // Also extract URLs from the answer itself
    const urlMatches = content.match(/https?:\/\/[^\s\)\]>]+/g) || [];
    for (const url of urlMatches) {
      const cleanUrl = url.replace(/[.,;:]+$/, '');
      if (!sources.some(s => s.url === cleanUrl)) {
        sources.push(scoreSource({ url: cleanUrl, snippet: '' }));
      }
    }
    
    // Sort sources by quality
    sources.sort((a, b) => b.quality - a.quality);

    return {
      answer: content,
      sources: sources.slice(0, 10), // Top 10 sources
      durationMs: Math.round(performance.now() - startTime),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// Synthesis with LLM
// ============================================================================

async function synthesizeResearch(
  rawAnswer: string,
  sources: ResearchSource[],
  query: string,
  docContext: ResearchRequest['docContext'],
  groqApiKey: string
): Promise<ResearchResponse['synthesis']> {
  const systemPrompt = `You are a GTM strategist who synthesizes research into actionable intelligence for founders and sales teams.

Your task is to extract structured insights from research data and format them for decision-making.

ALWAYS respond with valid JSON in this exact format:
{
  "summary": "2-3 sentence executive summary of the most important findings",
  "insights": [
    {
      "type": "key_finding|statistic|trend|opportunity|risk|action",
      "title": "Brief title (5-10 words)",
      "content": "Detailed insight (1-2 sentences)",
      "confidence": "high|medium|low",
      "sources": [0, 1]
    }
  ],
  "keyStats": [
    { "label": "Market Size", "value": "$50B", "source": 0 }
  ]
}

Guidelines:
- Extract 4-6 key insights of varying types
- Prioritize actionable intelligence
- Include 3-5 key statistics if available
- Reference source indices (0-based) from the provided sources list
- Be specific with numbers and percentages`;

  const userPrompt = `Synthesize this research into structured insights:

**Research Query**: ${query}
${docContext?.title ? `**Document**: ${docContext.title} (${docContext.type || 'GTM doc'})` : ''}
${docContext?.workspace ? `**Company**: ${docContext.workspace}` : ''}

**Raw Research**:
${rawAnswer.slice(0, 4000)}

**Sources** (reference by index):
${sources.slice(0, 8).map((s, i) => `[${i}] ${s.title} (${s.domain}) - Quality: ${s.quality}/100`).join('\n')}

Respond with JSON only, no markdown code blocks.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.synthesis,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('[research-copilot] Synthesis error:', response.status);
      throw new Error('Synthesis failed');
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    
    // Clean up the response
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(content);
    
    return {
      summary: parsed.summary || 'Research synthesis completed.',
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      keyStats: Array.isArray(parsed.keyStats) ? parsed.keyStats : [],
    };
  } catch (error) {
    console.error('[research-copilot] Synthesis parsing error:', error);
    
    // Return a basic synthesis from the raw answer
    return {
      summary: rawAnswer.slice(0, 300) + '...',
      insights: [{
        type: 'key_finding',
        title: 'Research Summary',
        content: rawAnswer.slice(0, 500),
        confidence: 'medium',
        sources: [0],
      }],
      keyStats: [],
    };
  }
}

// ============================================================================
// You.com Agent for Deep Research
// ============================================================================

async function runYouAgent(
  query: string,
  agentId: string,
  apiKey: string,
  context?: Record<string, unknown>
): Promise<{ output: string; sources: ResearchSource[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(YOUCOM_AGENT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent: agentId,
        input: query,
        context,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`You.com API error: ${response.status}`);
    }

    // Process SSE stream
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let output = '';
    const sources: ResearchSource[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content' && data.content) {
              output += data.content;
            }
            if (data.type === 'sources' && Array.isArray(data.sources)) {
              for (const source of data.sources) {
                sources.push(scoreSource(source));
              }
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    return { output, sources };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = performance.now();

  try {
    // Auth check - REQUIRE authentication to prevent API abuse
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please sign in to use research features.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let userId: string | null = null;
    let workspaceId: string | null = null;

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      // Use service role key to validate the JWT token
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });
      
      // Extract the token from the header
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('[research-copilot] Auth error:', authError?.message || 'No user');
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session. Please sign in again.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = user.id;
      
      // Optionally get workspace from user metadata for scoped rate limiting
      workspaceId = user.user_metadata?.current_workspace_id || null;
    } catch (e) {
      console.error('[research-copilot] Auth validation failed:', e);
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting - now uses authenticated userId with workspace scope
    const rateCheck = checkRateLimit(userId!, workspaceId);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before making more research requests.',
          resetIn: Math.ceil(rateCheck.resetIn / 1000),
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request
    const body = await req.json() as ResearchRequest;
    
    if (!body.query?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize query
    const { sanitized: sanitizedQuery, blocked } = sanitizeQuery(body.query);
    if (blocked) {
      return new Response(
        JSON.stringify({ error: 'Query contains blocked content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    const youcomApiKey = Deno.env.get('YOUCOM_API_KEY') || Deno.env.get('YOU_COM_API_KEY');

    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'Research service not configured. Please contact support.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mode = body.mode || 'quick';
    const shouldSynthesize = body.options?.synthesize !== false;
    
    console.log(`[research-copilot] User ${userId} researching: "${sanitizedQuery.slice(0, 50)}..." mode: ${mode}`);

    // Build context string
    const contextParts: string[] = [];
    if (body.docContext?.title) contextParts.push(`Document: ${body.docContext.title}`);
    if (body.docContext?.type) contextParts.push(`Type: ${body.docContext.type}`);
    if (body.docContext?.workspace) contextParts.push(`Company: ${body.docContext.workspace}`);
    if (body.docContext?.tags?.length) contextParts.push(`Topics: ${body.docContext.tags.join(', ')}`);
    const context = contextParts.length > 0 ? contextParts.join(' | ') : undefined;

    let rawAnswer = '';
    let sources: ResearchSource[] = [];
    let provider = 'groq-compound';

    // Execute research based on mode
    if (mode === 'deep' && youcomApiKey) {
      // Use You.com research_briefing agent for deep research
      try {
        const agentResult = await runYouAgent(
          sanitizedQuery,
          '2c03ea4c-fcfd-483f-a1f3-52cde52b909c', // research_briefing agent
          youcomApiKey,
          body.docContext
        );
        rawAnswer = agentResult.output;
        sources = agentResult.sources;
        provider = 'youcom-agent';
      } catch (error) {
        console.warn('[research-copilot] You.com agent failed, falling back to Groq:', error);
        // Fall back to Groq Compound
        const groqResult = await searchWithGroqCompound(sanitizedQuery, groqApiKey, { context });
        rawAnswer = groqResult.answer;
        sources = groqResult.sources;
      }
    } else {
      // Use Groq Compound for quick/market/competitive research
      const fast = mode === 'quick';
      const groqResult = await searchWithGroqCompound(sanitizedQuery, groqApiKey, { fast, context });
      rawAnswer = groqResult.answer;
      sources = groqResult.sources;
    }

    // Synthesize results if requested
    let synthesis: ResearchResponse['synthesis'];
    let synthesisModel: string | undefined;

    if (shouldSynthesize && rawAnswer) {
      synthesis = await synthesizeResearch(
        rawAnswer,
        sources,
        sanitizedQuery,
        body.docContext,
        groqApiKey
      );
      synthesisModel = MODELS.synthesis;
    } else {
      synthesis = {
        summary: rawAnswer.slice(0, 500),
        insights: [],
        keyStats: [],
      };
    }

    const response: ResearchResponse = {
      synthesis,
      sources,
      rawAnswer,
      metadata: {
        mode,
        query: sanitizedQuery,
        provider,
        durationMs: Math.round(performance.now() - startTime),
        sourceCount: sources.length,
        synthesisModel,
      },
    };

    console.log(`[research-copilot] Success: ${sources.length} sources, ${synthesis.insights.length} insights, ${Math.round(performance.now() - startTime)}ms`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    });

  } catch (error) {
    console.error('[research-copilot] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Research failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
