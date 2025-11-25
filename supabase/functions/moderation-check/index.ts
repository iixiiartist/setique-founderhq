/// <reference path="../types/deno_http_server.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type SeverityLevel = 'none' | 'low' | 'medium' | 'high';

type Direction = 'input' | 'output' | 'system' | string;

type ModerationCategory =
  | 'self-harm'
  | 'violence'
  | 'sexual-minors'
  | 'hate'
  | 'violence-graphic'
  | 'sexual'
  | 'harassment'
  | string;

interface ModerationPayload {
  text?: unknown;
  input?: unknown;
  content?: unknown;
  prompt?: unknown;
  direction?: unknown;
  channel?: unknown;
  workspaceId?: unknown;
  metadata?: Record<string, unknown>;
}

interface ModerationResultBody {
  flagged: boolean;
  severity: SeverityLevel;
  categories: ModerationCategory[];
  provider: 'openai' | 'heuristic';
  model: string | null;
  usage: { promptTokens: number | null } | null;
  fallbackUsed: boolean;
  metadata: {
    direction: Direction;
    channel: string;
    workspaceId?: string;
    heuristicMatches: number;
  };
}

interface HeuristicResult {
  flagged: boolean;
  severity: SeverityLevel;
  categories: ModerationCategory[];
  score: number;
  matches: number;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TEXT_LENGTH = 6000;

const pickString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return undefined;
};

const sanitizeInputText = (payload: ModerationPayload): string => {
  const text =
    pickString(payload.text)
    ?? pickString(payload.input)
    ?? pickString(payload.content)
    ?? pickString(payload.prompt)
    ?? '';
  if (!text) return '';
  return text.replace(/\s+/g, ' ').slice(0, MAX_TEXT_LENGTH);
};

const parseJsonBody = async (req: Request): Promise<ModerationPayload> => {
  try {
    return (await req.json()) as ModerationPayload;
  } catch (_error) {
    return {};
  }
};

const jsonResponse = (body: ModerationResultBody | Record<string, unknown>, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...(init ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });

const errorResponse = (status: number, message: string) =>
  jsonResponse({ error: message }, { status });

interface HeuristicRule {
  pattern: RegExp;
  category: ModerationCategory;
  severity: SeverityLevel;
  score: number;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  {
    pattern: /(kill myself|suicide|self[-\s]?harm|end my life|cutting myself)/i,
    category: 'self-harm',
    severity: 'high',
    score: 0.95,
  },
  {
    pattern: /(bomb|explosive|shoot up|massacre|murder (them|him|her|people))/i,
    category: 'violence',
    severity: 'high',
    score: 0.92,
  },
  {
    pattern: /(child porn|exploit minors|sexual minors|underage sex)/i,
    category: 'sexual-minors',
    severity: 'high',
    score: 0.98,
  },
  {
    pattern: /(hate crime|racial slur|nazi|kkk|ethnic cleansing)/i,
    category: 'hate',
    severity: 'medium',
    score: 0.78,
  },
  {
    pattern: /(graphic violence|bloodbath|severed limbs|gore)/i,
    category: 'violence-graphic',
    severity: 'medium',
    score: 0.7,
  },
];

const runHeuristicModeration = (text: string): HeuristicResult => {
  if (!text) {
    return { flagged: false, severity: 'none', categories: [], score: 0, matches: 0 };
  }

  const matches = HEURISTIC_RULES.filter((rule) => rule.pattern.test(text));
  if (!matches.length) {
    return { flagged: false, severity: 'none', categories: [], score: 0, matches: 0 };
  }

  const categories = Array.from(new Set(matches.map((match) => match.category)));
  const maxScore = Math.max(...matches.map((match) => match.score));
  const severity = matches.some((match) => match.severity === 'high')
    ? 'high'
    : matches.some((match) => match.severity === 'medium')
    ? 'medium'
    : 'low';

  return {
    flagged: true,
    severity,
    categories,
    score: maxScore,
    matches: matches.length,
  };
};

const toSeverityFromScore = (flagged: boolean, score: number | undefined): SeverityLevel => {
  if (!flagged) return 'none';
  if (typeof score !== 'number') return 'low';
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
};

const parseDirection = (value: unknown): Direction => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return 'input';
};

const parseChannel = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return 'editor';
};

const parseWorkspaceId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return undefined;
};

const flagCategoriesFromOpenAI = (categories: Record<string, boolean> | undefined): ModerationCategory[] => {
  if (!categories) return [];
  return Object.entries(categories)
    .filter(([, flagged]) => Boolean(flagged))
    .map(([key]) => key.replace(/_/g, '-') as ModerationCategory);
};

const safeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
};

const successBody = (
  provider: 'openai' | 'heuristic',
  payload: {
    flagged: boolean;
    severity: SeverityLevel;
    categories: ModerationCategory[];
    model?: string | null;
    usage?: number | null;
    fallbackUsed: boolean;
    metadata: ModerationResultBody['metadata'];
  },
): ModerationResultBody => ({
  flagged: payload.flagged,
  severity: payload.severity,
  categories: payload.categories,
  provider,
  model: payload.model ?? (provider === 'openai' ? 'omni-moderation-latest' : null),
  usage: payload.usage !== undefined ? { promptTokens: payload.usage } : { promptTokens: null },
  fallbackUsed: payload.fallbackUsed,
  metadata: payload.metadata,
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  const startedAt = performance.now();
  const body = await parseJsonBody(req);
  const text = sanitizeInputText(body);
  const direction = parseDirection(body.direction);
  const channel = parseChannel(body.channel);
  const workspaceId = parseWorkspaceId(body.workspaceId);

  const heuristics = runHeuristicModeration(text);

  const metadata = {
    direction,
    channel,
    workspaceId,
    heuristicMatches: heuristics.matches,
  } as ModerationResultBody['metadata'];

  if (!text) {
    return jsonResponse(
      successBody('heuristic', {
        flagged: false,
        severity: 'none',
        categories: [],
        model: null,
        usage: null,
        fallbackUsed: false,
        metadata,
      }),
    );
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return jsonResponse(
      successBody('heuristic', {
        flagged: heuristics.flagged,
        severity: heuristics.severity,
        categories: heuristics.categories,
        model: null,
        usage: null,
        fallbackUsed: true,
        metadata,
      }),
    );
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: text,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error('[moderation-check] OpenAI error', { status: response.status, durationMs: performance.now() - startedAt });
      throw new Error(`OpenAI moderation error: ${response.statusText}`);
    }

    const result = Array.isArray(payload?.results) ? payload.results[0] : undefined;
    const categoryScores = result?.category_scores ?? {};
    const maxScore = Object.values(categoryScores).reduce<number>((highest, value) => {
      if (typeof value !== 'number') return highest;
      return Math.max(highest, value);
    }, 0);

    const apiBody = successBody('openai', {
      flagged: Boolean(result?.flagged),
      severity: toSeverityFromScore(Boolean(result?.flagged), maxScore),
      categories: flagCategoriesFromOpenAI(result?.categories),
      model: typeof payload?.model === 'string' ? payload.model : 'omni-moderation-latest',
      usage: safeNumber(payload?.usage?.prompt_tokens),
      fallbackUsed: false,
      metadata,
    });

    return jsonResponse(apiBody);
  } catch (error) {
    console.error('[moderation-check] Falling back to heuristics', error instanceof Error ? error.message : error);
    const fallback = successBody('heuristic', {
      flagged: heuristics.flagged,
      severity: heuristics.severity,
      categories: heuristics.categories,
      model: null,
      usage: null,
      fallbackUsed: true,
      metadata,
    });
    fallback.metadata.heuristicMatches = heuristics.matches;
    return jsonResponse(fallback, { status: 200 });
  }
});
