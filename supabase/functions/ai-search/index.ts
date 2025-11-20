/// <reference path="../types/deno_http_server.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

type ResearchMode = 'search' | 'news' | 'images' | 'rag'

const ALLOWED_MODES: ResearchMode[] = ['search', 'news', 'images', 'rag']

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...(init ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  })

const errorResponse = (status: number, message: string, details?: unknown) =>
  jsonResponse({ error: message, details }, { status })

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed')
  }

  const startedAt = performance.now()

  try {
  const { query, mode: rawMode, count: rawCount } = await resolveBody(req)
    const apiKey = Deno.env.get('YOUCOM_API_KEY')

    if (!apiKey) {
      return errorResponse(500, 'YOUCOM_API_KEY is not set in Supabase secrets')
    }

    if (typeof query !== 'string' || !query.trim()) {
      return errorResponse(400, 'Query is required')
    }

  const mode: ResearchMode = isResearchMode(rawMode) ? rawMode : 'search'
    const count = sanitizeCount(rawCount, DEFAULT_COUNTS[mode])
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
        headers: { 'X-API-Key': apiKey },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const payload: any = await parseJson(response)

    if (!response.ok) {
      console.error('[ai-search] You.com error', { status: response.status, payload })
      return errorResponse(response.status, `You.com API error: ${response.statusText}`, payload)
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

    return jsonResponse(resultBody)
  } catch (error) {
    console.error('[ai-search] Unexpected error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('abort') ? 504 : 500
    return errorResponse(status, message)
  }
})
