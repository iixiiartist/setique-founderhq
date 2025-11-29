// supabase/functions/_shared/apiAuth.ts
// Shared API authentication utilities for Edge Functions
// Handles Bearer token validation, rate limiting, and request logging

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================
// TYPES
// ============================================

export type ApiScope = 
  | 'contacts:read' | 'contacts:write'
  | 'tasks:read' | 'tasks:write'
  | 'deals:read' | 'deals:write'
  | 'documents:read' | 'documents:write'
  | 'crm:read' | 'crm:write'
  | 'agents:run'
  | 'webhooks:manage'
  | 'context:read';

export interface ApiAuthResult {
  isValid: boolean;
  keyId: string | null;
  workspaceId: string | null;
  scopes: ApiScope[];
  requestsPerMinute: number;
  error: string | null;
  statusCode: number;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  resetAt: Date;
  remaining: number;
}

export interface ApiRequestContext {
  keyId: string;
  workspaceId: string;
  scopes: ApiScope[];
  supabase: SupabaseClient;
  startTime: number;
  ip: string | null;
  userAgent: string | null;
}

// ============================================
// CORS HEADERS
// ============================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

// ============================================
// HASH FUNCTION
// ============================================

async function hashKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Authenticate an API request using Bearer token
 */
export async function authenticateRequest(req: Request): Promise<ApiAuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      isValid: false,
      keyId: null,
      workspaceId: null,
      scopes: [],
      requestsPerMinute: 0,
      error: 'Missing Authorization header',
      statusCode: 401,
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      isValid: false,
      keyId: null,
      workspaceId: null,
      scopes: [],
      requestsPerMinute: 0,
      error: 'Invalid Authorization header format. Use: Bearer <api_key>',
      statusCode: 401,
    };
  }

  const rawKey = authHeader.substring(7);
  
  if (!rawKey.startsWith('fhq_live_')) {
    return {
      isValid: false,
      keyId: null,
      workspaceId: null,
      scopes: [],
      requestsPerMinute: 0,
      error: 'Invalid API key format',
      statusCode: 401,
    };
  }

  // Create service role client for validation
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Hash and validate
  const keyHash = await hashKey(rawKey);
  
  const { data, error } = await supabase.rpc('validate_api_key', {
    p_key_hash: keyHash,
  });

  if (error) {
    console.error('[apiAuth] Validation RPC error:', error);
    return {
      isValid: false,
      keyId: null,
      workspaceId: null,
      scopes: [],
      requestsPerMinute: 0,
      error: 'Authentication failed',
      statusCode: 500,
    };
  }

  const result = data?.[0];
  
  if (!result || !result.is_valid) {
    return {
      isValid: false,
      keyId: null,
      workspaceId: null,
      scopes: [],
      requestsPerMinute: 0,
      error: result?.error_message || 'Invalid API key',
      statusCode: 401,
    };
  }

  return {
    isValid: true,
    keyId: result.key_id,
    workspaceId: result.workspace_id,
    scopes: result.scopes || [],
    requestsPerMinute: result.requests_per_minute || 100,
    error: null,
    statusCode: 200,
  };
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Check rate limit and increment counter
 */
export async function checkRateLimit(
  keyId: string,
  requestsPerMinute: number
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_api_key_id: keyId,
    p_requests_per_minute: requestsPerMinute,
  });

  if (error) {
    console.error('[apiAuth] Rate limit check error:', error);
    // Fail open - allow request but log error
    return {
      allowed: true,
      currentCount: 0,
      resetAt: new Date(Date.now() + 60000),
      remaining: requestsPerMinute,
    };
  }

  const result = data?.[0];
  const resetAt = new Date(result?.reset_at || Date.now() + 60000);
  const currentCount = result?.current_count || 0;

  return {
    allowed: result?.allowed ?? true,
    currentCount,
    resetAt,
    remaining: Math.max(0, requestsPerMinute - currentCount),
  };
}

// ============================================
// SCOPE CHECKING
// ============================================

/**
 * Check if scopes include the required scope
 */
export function hasScope(scopes: ApiScope[], requiredScope: ApiScope): boolean {
  if (scopes.includes(requiredScope)) return true;
  
  // Write scope covers read
  const [resource, action] = requiredScope.split(':') as [string, string];
  if (action === 'read') {
    const writeScope = `${resource}:write` as ApiScope;
    if (scopes.includes(writeScope)) return true;
  }
  
  return false;
}

/**
 * Check if scopes include all required scopes
 */
export function hasAllScopes(scopes: ApiScope[], requiredScopes: ApiScope[]): boolean {
  return requiredScopes.every(scope => hasScope(scopes, scope));
}

// ============================================
// REQUEST LOGGING
// ============================================

/**
 * Log API request to database
 */
export async function logApiRequest(
  keyId: string,
  workspaceId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ip?: string | null,
  userAgent?: string | null,
  errorCode?: string | null,
  errorMessage?: string | null
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    await supabase.rpc('log_api_request', {
      p_api_key_id: keyId,
      p_workspace_id: workspaceId,
      p_endpoint: endpoint,
      p_method: method,
      p_status_code: statusCode,
      p_response_time_ms: responseTimeMs,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_error_code: errorCode,
      p_error_message: errorMessage,
    });

    // Also increment monthly counter
    await supabase.rpc('increment_monthly_requests', {
      p_api_key_id: keyId,
    });
  } catch (err) {
    console.error('[apiAuth] Failed to log request:', err);
    // Don't throw - logging shouldn't break the request
  }
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  statusCode: number,
  errorCode?: string,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: {
        message,
        code: errorCode || 'error',
        ...(details && { details }),
      },
    }),
    {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create a success response
 */
export function successResponse(
  data: unknown,
  statusCode = 200,
  headers?: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ data }),
    {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
    }
  );
}

/**
 * Create rate limit headers
 */
export function rateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: Date
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt.getTime() / 1000)),
  };
}

// ============================================
// MAIN HANDLER WRAPPER
// ============================================

export interface ApiHandlerOptions {
  requiredScopes?: ApiScope[];
  allowedMethods?: string[];
}

/**
 * Wrap an API handler with authentication, rate limiting, and logging
 */
export function createApiHandler(
  handler: (ctx: ApiRequestContext, req: Request) => Promise<Response>,
  options: ApiHandlerOptions = {}
) {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(req.url);
    const endpoint = url.pathname;
    const method = req.method;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('cf-connecting-ip');
    const userAgent = req.headers.get('user-agent');

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Check allowed methods
    if (options.allowedMethods && !options.allowedMethods.includes(method)) {
      return errorResponse(`Method ${method} not allowed`, 405, 'method_not_allowed');
    }

    // Authenticate
    const auth = await authenticateRequest(req);
    if (!auth.isValid) {
      return errorResponse(auth.error!, auth.statusCode, 'unauthorized');
    }

    // Check scopes
    if (options.requiredScopes && options.requiredScopes.length > 0) {
      if (!hasAllScopes(auth.scopes, options.requiredScopes)) {
        return errorResponse(
          `Missing required scope(s): ${options.requiredScopes.join(', ')}`,
          403,
          'insufficient_scope'
        );
      }
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(auth.keyId!, auth.requestsPerMinute);
    if (!rateLimit.allowed) {
      const headers = rateLimitHeaders(
        auth.requestsPerMinute,
        rateLimit.remaining,
        rateLimit.resetAt
      );
      return new Response(
        JSON.stringify({
          error: {
            message: 'Rate limit exceeded',
            code: 'rate_limit_exceeded',
            details: {
              limit: auth.requestsPerMinute,
              reset_at: rateLimit.resetAt.toISOString(),
            },
          },
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...headers,
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)),
          },
        }
      );
    }

    // Create context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ctx: ApiRequestContext = {
      keyId: auth.keyId!,
      workspaceId: auth.workspaceId!,
      scopes: auth.scopes,
      supabase,
      startTime,
      ip,
      userAgent,
    };

    // Execute handler
    let response: Response;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    try {
      response = await handler(ctx, req);
    } catch (err) {
      console.error('[apiAuth] Handler error:', err);
      errorCode = 'internal_error';
      errorMessage = err instanceof Error ? err.message : 'Unknown error';
      response = errorResponse('Internal server error', 500, errorCode);
    }

    // Add rate limit headers to response
    const responseHeaders = new Headers(response.headers);
    const rlHeaders = rateLimitHeaders(
      auth.requestsPerMinute,
      rateLimit.remaining - 1,
      rateLimit.resetAt
    );
    Object.entries(rlHeaders).forEach(([k, v]) => responseHeaders.set(k, v));

    // Log request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest(
      auth.keyId!,
      auth.workspaceId!,
      endpoint,
      method,
      response.status,
      responseTimeMs,
      ip,
      userAgent,
      errorCode,
      errorMessage
    );

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  };
}
