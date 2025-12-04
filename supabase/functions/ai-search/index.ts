/// <reference path="../types/deno_http_server.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

type ResearchMode = 'search' | 'news' | 'images' | 'rag'
type AIProvider = 'youcom' | 'groq'

const ALLOWED_MODES: ResearchMode[] = ['search', 'news', 'images', 'rag']

// Rate limiting configuration
const RATE_LIMIT = 20 // requests per minute per user
const RATE_WINDOW_MS = 60_000
const rateLimits = new Map<string, { count: number; resetAt: number }>()

// Groq Compound API endpoint
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

// Groq Compound models for web search
const GROQ_COMPOUND_MODELS = {
  default: 'groq/compound',        // Full compound model
  fast: 'groq/compound-mini',      // Faster, lighter version
}

/**
 * Execute search using Groq Compound model with built-in web search
 * This is faster than You.com for simple web searches
 */
async function searchWithGroqCompound(
  query: string, 
  apiKey: string,
  options: { fast?: boolean; count?: number } = {}
): Promise<{
  answer: string;
  sources: Array<{ title?: string; url: string; snippet?: string }>;
  metadata: Record<string, unknown>;
}> {
  const model = options.fast ? GROQ_COMPOUND_MODELS.fast : GROQ_COMPOUND_MODELS.default;
  
  const systemPrompt = `You are a market research analyst specializing in pricing, market trends, and competitive intelligence.
When answering:
1. PRIORITIZE current pricing data, costs, and market values
2. Include specific dollar amounts, price ranges, and units (per lb, per kg, per unit, etc.)
3. Mention wholesale vs retail pricing when available
4. Include market size, trends, and key players/competitors
5. Cite your sources with links
6. Focus on the most recent data (2024-2025 preferred)`;

  const userPrompt = `Search the web for market research on: ${query}

Provide:
1. **Current Pricing**: Specific prices (retail, wholesale, per unit costs)
2. **Market Overview**: Market size, growth trends, key statistics
3. **Competitors/Brands**: Major players and their positioning
4. **Recent News**: Any recent market developments

Be specific with numbers and cite sources.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
        temperature: 0.3,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-search] Groq Compound error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const content = message?.content || '';
    
    console.log('[ai-search] Groq raw response keys:', Object.keys(data));
    console.log('[ai-search] Groq response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!message,
      hasContent: !!content,
      contentLength: content?.length,
      contentPreview: content?.substring(0, 200),
      hasExecutedTools: !!message?.executed_tools,
      executedToolsCount: message?.executed_tools?.length || 0,
      topLevelExecutedTools: !!data.executed_tools,
    });
    
    // Extract sources from executed_tools if available
    // executed_tools is on the message object, not top-level
    const sources: Array<{ title?: string; url: string; snippet?: string }> = [];
    
    // Check for tool execution results (Compound provides these on message.executed_tools)
    const executedTools = message?.executed_tools || data.executed_tools;
    if (executedTools && Array.isArray(executedTools)) {
      console.log('[ai-search] Processing executed_tools:', executedTools.length);
      for (const tool of executedTools) {
        console.log('[ai-search] Tool:', JSON.stringify(tool).substring(0, 500));
        if ((tool.name === 'web_search' || tool.type === 'web_search') && Array.isArray(tool.results)) {
          for (const result of tool.results) {
            if (result.url) {
              sources.push({
                title: result.title,
                url: result.url,
                snippet: result.snippet || result.description || result.text,
              });
            }
          }
        }
        // Also check for search_results in output
        if (tool.output?.search_results && Array.isArray(tool.output.search_results)) {
          for (const result of tool.output.search_results) {
            if (result.url) {
              sources.push({
                title: result.title,
                url: result.url,
                snippet: result.snippet || result.description || result.text,
              });
            }
          }
        }
      }
    }
    
    console.log('[ai-search] Extracted sources:', sources.length);

    return {
      answer: content,
      sources,
      metadata: {
        provider: 'groq',
        model,
        usage: data.usage,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  Deno.env.get('ALLOWED_ORIGIN') || 'https://founderhq.setique.com',
  'http://localhost:3001',
  'http://localhost:3000',
]

const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get('origin') || ''
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin
  }
  return ALLOWED_ORIGINS[0] // Fallback to primary
}

const corsHeaders = (req: Request): Record<string, string> => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-workspace-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
})

const DEFAULT_COUNTS: Record<ResearchMode, number> = {
  search: 5,
  news: 5,
  images: 8,
  rag: 5,
}

const MODE_ENDPOINT: Record<ResearchMode, string> = {
  search: 'https://api.ydc-index.io/search',
  news: 'https://api.ydc-index.io/news',
  images: 'https://api.ydc-index.io/images',
  rag: 'https://api.ydc-index.io/rag',
}

const isResearchMode = (value: unknown): value is ResearchMode =>
  typeof value === 'string' && (ALLOWED_MODES as ReadonlyArray<string>).includes(value)

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return undefined
}

const pickString = (payload: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

const pickStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const entries = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => Boolean(item))
  return entries.length ? entries : undefined
}

const normalizeHits = (raw: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!isObject(item)) return null
      const url = pickString(item, ['url', 'link', 'source', 'source_url'])
      const title = pickString(item, ['title', 'name', 'heading'])
      const description = pickString(item, ['description', 'snippet', 'summary', 'text'])
      if (!url && !title && !description) {
        return null
      }
      return {
        title,
        description,
        url,
        snippets: pickStringArray(item.snippets ?? item.snips ?? item.highlights),
        thumbnail: pickString(item, ['thumbnail', 'thumbnail_url', 'image_url', 'main_image']),
        source: pickString(item, ['source', 'source_name', 'domain', 'publisher']),
        publishedAt: pickString(item, ['age', 'published_at', 'date', 'timestamp']),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>
}

const normalizeNews = (raw: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!isObject(item)) return null
      const title = pickString(item, ['title', 'headline', 'name'])
      const description = pickString(item, ['description', 'summary', 'snippet'])
      const url = pickString(item, ['url', 'link'])
      if (!title && !description && !url) {
        return null
      }
      return {
        title,
        description,
        url,
        thumbnail: pickString(item, ['thumbnail', 'thumbnail_url', 'image_url']),
        age: pickString(item, ['age', 'published_at', 'date']),
        source: pickString(item, ['source', 'source_name', 'publisher']),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>
}

const normalizeImages = (raw: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!isObject(item)) return null
      const imageUrl = pickString(item, ['image_url', 'image', 'thumbnail_url'])
      if (!imageUrl) return null
      return {
        title: pickString(item, ['title', 'alt', 'caption', 'name']),
        url: pickString(item, ['url', 'page_url', 'link', 'sourceUrl']),
        imageUrl,
        thumbnail: pickString(item, ['thumbnail', 'thumbnail_url']),
        source: pickString(item, ['source', 'display_url', 'domain']),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>
}

const normalizeQa = (raw: unknown): { answer: string; sources?: string[] } | undefined => {
  if (!raw) return undefined
  const container = isObject(raw) ? raw : undefined
  const answer = asString(container?.answer ?? container?.text)
  if (!answer) return undefined
  const sources = pickStringArray(container?.sources ?? container?.citations)
  return { answer, sources }
}

const parseJson = async (response: Response) => {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (_error) {
    return { raw: text }
  }
}

const jsonResponse = (body: unknown, req: Request, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...(init ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(req),
      ...(init?.headers ?? {}),
    },
  })

// Error codes for client consumption (no internal details)
type ErrorCode = 'UNAUTHORIZED' | 'RATE_LIMITED' | 'INVALID_REQUEST' | 'SERVICE_ERROR' | 'TIMEOUT'

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  'UNAUTHORIZED': 'Authentication required',
  'RATE_LIMITED': 'Too many requests, please try again later',
  'INVALID_REQUEST': 'Invalid request parameters',
  'SERVICE_ERROR': 'Service temporarily unavailable',
  'TIMEOUT': 'Request timed out',
}

const errorResponse = (status: number, code: ErrorCode, req: Request) =>
  jsonResponse({ error: ERROR_MESSAGES[code], code }, req, { status })

// Rate limiting check
const checkRateLimit = (userId: string): boolean => {
  const now = Date.now()
  const record = rateLimits.get(userId)

  if (!record || now > record.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

// Authentication check
const authenticateRequest = async (req: Request): Promise<{ userId: string; workspaceId?: string } | null> => {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return null
    }

    const workspaceId = req.headers.get('x-workspace-id') || undefined
    return { userId: user.id, workspaceId }
  } catch {
    return null
  }
}

const sanitizeCount = (value: unknown, fallback: number) => {
  if (typeof value !== 'number') return fallback
  if (Number.isNaN(value)) return fallback
  return Math.min(Math.max(Math.floor(value), 1), 25)
}

const resolveBody = async (req: Request) => {
  try {
    return await req.json()
  } catch (_error) {
    return {}
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'INVALID_REQUEST', req)
  }

  // Authenticate the request
  const auth = await authenticateRequest(req)
  if (!auth) {
    return errorResponse(401, 'UNAUTHORIZED', req)
  }

  // Check rate limit
  if (!checkRateLimit(auth.userId)) {
    return errorResponse(429, 'RATE_LIMITED', req)
  }

  const startedAt = performance.now()

  try {
    const { query, mode: rawMode, count: rawCount, provider: rawProvider, fast } = await resolveBody(req)
    const youApiKey = Deno.env.get('YOUCOM_API_KEY')
    const groqApiKey = Deno.env.get('GROQ_API_KEY')

    if (typeof query !== 'string' || !query.trim()) {
      return errorResponse(400, 'INVALID_REQUEST', req)
    }

    const mode: ResearchMode = isResearchMode(rawMode) ? rawMode : 'search'
    const count = sanitizeCount(rawCount, DEFAULT_COUNTS[mode])
    
    // Determine which provider to use
    // - For 'rag' mode with Groq key available, prefer Groq Compound (faster)
    // - For 'search' mode, Groq Compound is also faster
    // - For 'news' and 'images', You.com has specialized endpoints
    const preferGroq = groqApiKey && (mode === 'search' || mode === 'rag')
    const requestedProvider = rawProvider as AIProvider | undefined
    const useProvider: AIProvider = requestedProvider 
      || (preferGroq ? 'groq' : 'youcom')
    
    console.log(`[ai-search] Using provider: ${useProvider}, mode: ${mode}, query: ${query.substring(0, 50)}...`)

    // Use Groq Compound for search/rag if available and requested/preferred
    if (useProvider === 'groq' && groqApiKey && (mode === 'search' || mode === 'rag')) {
      try {
        console.log('[ai-search] Attempting Groq Compound search...');
        const groqResult = await searchWithGroqCompound(query, groqApiKey, { 
          fast: Boolean(fast),
          count 
        })
        
        console.log('[ai-search] Groq Compound succeeded:', {
          hasAnswer: !!groqResult.answer,
          answerLength: groqResult.answer?.length,
          sourcesCount: groqResult.sources?.length,
        });
        
        const resultBody = {
          hits: groqResult.sources.length ? groqResult.sources.map((s, i) => ({
            title: s.title,
            description: s.snippet,
            url: s.url,
            source: 'groq-compound',
          })) : undefined,
          qa: { answer: groqResult.answer || 'No response from AI' },
          metadata: {
            provider: 'groq',
            model: fast ? 'groq/compound-mini' : 'groq/compound',
            mode,
            query,
            count,
            fetchedAt: new Date().toISOString(),
            durationMs: Math.round(performance.now() - startedAt),
            ...groqResult.metadata,
          },
        }
        
        console.log('[ai-search] Returning Groq result:', {
          hasHits: !!resultBody.hits?.length,
          hasQa: !!resultBody.qa?.answer,
          qaLength: resultBody.qa?.answer?.length,
        });
        
        return jsonResponse(resultBody, req)
      } catch (groqError) {
        console.error('[ai-search] Groq Compound failed:', groqError instanceof Error ? groqError.message : groqError);
        console.error('[ai-search] Groq error details:', JSON.stringify(groqError, null, 2));
        console.log('[ai-search] Falling back to You.com...');
        // Fall through to You.com
      }
    }

    // Fall back to You.com or use it directly for news/images
    if (!youApiKey) {
      console.error('[ai-search] YOUCOM_API_KEY not configured')
      return errorResponse(500, 'SERVICE_ERROR', req)
    }

    const endpoint = MODE_ENDPOINT[mode]

    const params = new URLSearchParams()
    if (mode === 'news') {
      params.set('query', query)
      params.set('q', query)
      params.set('section', 'news')
      params.set('count', String(count))
    } else if (mode === 'images') {
      params.set('query', query)
      params.set('count', String(count))
    } else {
      params.set('query', query)
      params.set('num_web_results', String(count))
      params.set('count', String(count))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    let response: Response
    try {
      response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers: { 'X-API-Key': youApiKey },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const payload: any = await parseJson(response)

    if (!response.ok) {
      console.error('[ai-search] You.com error', { status: response.status })
      return errorResponse(response.status >= 500 ? 502 : 400, 'SERVICE_ERROR', req)
    }

    const hitsSource = Array.isArray(payload.hits)
      ? payload.hits
      : Array.isArray(payload.results?.web)
      ? payload.results.web
      : Array.isArray(payload.results)
      ? payload.results
      : undefined

    const newsSource = Array.isArray(payload.news)
      ? payload.news
      : Array.isArray(payload.results?.news)
      ? payload.results.news
      : undefined

    const imagesSource = Array.isArray(payload.images)
      ? payload.images
      : Array.isArray(payload.results?.images)
      ? payload.results.images
      : Array.isArray(payload.image_results)
      ? payload.image_results
      : undefined

    const ragSource = payload.qa ?? payload.answer ?? payload.data ?? payload.result

    const hits = normalizeHits(hitsSource)
    const news = normalizeNews(newsSource)
    const images = normalizeImages(imagesSource)
    const qa = mode === 'rag' ? normalizeQa(ragSource) : undefined

    const resultBody = {
      hits: hits.length ? hits : undefined,
      news: news.length ? news : undefined,
      images: images.length ? images : undefined,
      qa,
      metadata: {
        provider: 'youcom',
        mode,
        query,
        count,
        fetchedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedAt),
      },
    }

    return jsonResponse(resultBody, req)
  } catch (error) {
    console.error('[ai-search] Unexpected error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const isTimeout = message.includes('abort')
    return errorResponse(isTimeout ? 504 : 500, isTimeout ? 'TIMEOUT' : 'SERVICE_ERROR', req)
  }
})
