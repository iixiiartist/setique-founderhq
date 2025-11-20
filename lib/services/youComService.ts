import { logger } from '../logger';

const YOUCOM_SEARCH_ENDPOINT = 'https://ydc-index.io/v1/search';
const YOUCOM_AGENT_ENDPOINT = 'https://api.you.com/v1/agents/runs';

type FreshnessOption = 'day' | 'week' | 'month' | 'year' | `${string}to${string}`;
type SafeSearchOption = 'off' | 'moderate' | 'strict';
type LiveCrawlSection = 'web' | 'news' | 'all';
type LiveCrawlFormat = 'html' | 'markdown';

type SearchSection = 'web' | 'news';

export interface YouComSearchOptions {
  count?: number;
  freshness?: FreshnessOption;
  offset?: number;
  country?: string;
  safeSearch?: SafeSearchOption;
  sections?: SearchSection[];
  livecrawl?: LiveCrawlSection;
  livecrawlFormats?: LiveCrawlFormat;
}

export interface YouComSearchResult {
  title?: string;
  url: string;
  description?: string;
  snippets?: string[];
  thumbnail_url?: string;
  page_age?: string;
  source_name?: string;
  type?: string;
  [key: string]: unknown;
}

export interface YouComSearchResponse {
  results: {
    web?: YouComSearchResult[];
    news?: YouComSearchResult[];
  };
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface YouComAgentTool {
  type: string;
  [key: string]: unknown;
}

export interface YouComAgentRequest {
  agent?: string; // "express" for default low-latency agent
  input: string;
  stream?: boolean;
  tools?: YouComAgentTool[];
}

export interface YouComAgentResponseChunk {
  type: string;
  text?: string;
  content?: string;
  agent?: string;
  [key: string]: unknown;
}

export interface YouComAgentResponse {
  output: YouComAgentResponseChunk[];
  [key: string]: unknown;
}

function resolveYouComApiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.YOUCOM_API_KEY) {
    return process.env.YOUCOM_API_KEY;
  }

  try {
    const viteEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
    if (viteEnv?.VITE_YOUCOM_API_KEY) {
      logger.warn('[YouComService] Using VITE_YOUCOM_API_KEY. Prefer server-side secrets to avoid exposing API keys.');
      return viteEnv.VITE_YOUCOM_API_KEY;
    }
  } catch (error) {
    // Accessing import.meta outside of a Vite environment throws. Ignore silently for Node contexts.
  }

  return undefined;
}

async function parseJsonResponse<T>(response: Response, context: string): Promise<T> {
  const raw = await response.text();
  let payload: unknown;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      logger.warn(`[YouComService] Failed to parse ${context} response JSON`, error);
      payload = raw;
    }
  }

  if (!response.ok) {
    const error = new Error(`You.com ${context} request failed (${response.status})`);
    (error as Error & { details?: unknown }).details = payload;
    throw error;
  }

  return (payload as T) ?? ({} as T);
}

export class YouComService {
  constructor(private readonly apiKey = resolveYouComApiKey()) {}

  private get headers(): HeadersInit {
    if (!this.apiKey) {
      throw new Error('YOUCOM_API_KEY is not defined. Set it in your server environment to use You.com integrations.');
    }

    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  async search(query: string, options: YouComSearchOptions = {}): Promise<YouComSearchResponse> {
    if (!query?.trim()) {
      throw new Error('Query is required for You.com search requests');
    }

    const url = new URL(YOUCOM_SEARCH_ENDPOINT);
    url.searchParams.set('query', query);

    if (options.count) url.searchParams.set('count', String(options.count));
    if (options.freshness) url.searchParams.set('freshness', options.freshness);
    if (options.offset) url.searchParams.set('offset', String(options.offset));
    if (options.country) url.searchParams.set('country', options.country);
    if (options.safeSearch) url.searchParams.set('safesearch', options.safeSearch);
    if (options.sections && options.sections.length > 0) {
      url.searchParams.set('section', options.sections.join(','));
    }
    if (options.livecrawl) url.searchParams.set('livecrawl', options.livecrawl);
    if (options.livecrawlFormats) url.searchParams.set('livecrawl_formats', options.livecrawlFormats);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    return parseJsonResponse<YouComSearchResponse>(response, 'search');
  }

  async runAgent(request: YouComAgentRequest): Promise<YouComAgentResponse> {
    if (!request?.input?.trim()) {
      throw new Error('Input prompt is required when calling a You.com agent');
    }

    const payload = {
      agent: request.agent ?? 'express',
      input: request.input,
      stream: Boolean(request.stream),
      tools: request.tools,
    };

    const response = await fetch(YOUCOM_AGENT_ENDPOINT, {
      method: 'POST',
      headers: {
        ...this.headers,
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    return parseJsonResponse<YouComAgentResponse>(response, 'agent');
  }
}

export const youComService = new YouComService();
