/**
 * Enrichment Authentication & Authorization Module
 * 
 * Handles authentication, workspace authorization, rate limiting,
 * and cost control for the company enrichment Edge Function.
 * 
 * SECURITY: This module enforces strict auth requirements - no anonymous access.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================
// TYPES
// ============================================

export interface EnrichmentAuthResult {
  isValid: boolean;
  userId: string | null;
  workspaceId: string | null;
  error: string | null;
  statusCode: number;
  supabase: SupabaseClient | null;
  isAdmin: boolean;
}

export interface EnrichmentRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  currentCount: number;
}

export interface EnrichmentBalanceResult {
  hasBalance: boolean;
  currentBalanceCents: number;
  costPerCallCents: number;
}

// ============================================
// CONSTANTS
// ============================================

// Cost per enrichment call in cents ($0.01 per call for Groq API costs)
const ENRICHMENT_COST_CENTS = 1;

// Rate limits per workspace per time window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per workspace

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Authenticate and authorize an enrichment request.
 * REQUIRES a valid session - anonymous access is NOT allowed.
 */
export async function authenticateEnrichmentRequest(
  req: Request,
  providedWorkspaceId?: string
): Promise<EnrichmentAuthResult> {
  const authHeader = req.headers.get('authorization');
  const workspaceIdHeader = req.headers.get('x-workspace-id');
  
  // Determine workspace ID from header or body
  const workspaceId = providedWorkspaceId || workspaceIdHeader;

  // SECURITY: Require Authorization header
  if (!authHeader) {
    return {
      isValid: false,
      userId: null,
      workspaceId: null,
      error: 'Authentication required. Please sign in.',
      statusCode: 401,
      supabase: null,
      isAdmin: false,
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      isValid: false,
      userId: null,
      workspaceId: null,
      error: 'Invalid authorization format. Use Bearer token.',
      statusCode: 401,
      supabase: null,
      isAdmin: false,
    };
  }

  // SECURITY: Require workspace ID
  if (!workspaceId) {
    return {
      isValid: false,
      userId: null,
      workspaceId: null,
      error: 'Workspace ID is required.',
      statusCode: 400,
      supabase: null,
      isAdmin: false,
    };
  }

  // Validate UUID format for workspace ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspaceId)) {
    return {
      isValid: false,
      userId: null,
      workspaceId: null,
      error: 'Invalid workspace ID format.',
      statusCode: 400,
      supabase: null,
      isAdmin: false,
    };
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        isValid: false,
        userId: null,
        workspaceId: null,
        error: 'Invalid or expired session. Please sign in again.',
        statusCode: 401,
        supabase: null,
        isAdmin: false,
      };
    }

    // SECURITY: Verify user has access to the workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.error('[enrichmentAuth] Membership check error:', membershipError.message);
      return {
        isValid: false,
        userId: user.id,
        workspaceId: null,
        error: 'Failed to verify workspace access.',
        statusCode: 500,
        supabase: null,
        isAdmin: false,
      };
    }

    if (!membership) {
      return {
        isValid: false,
        userId: user.id,
        workspaceId: null,
        error: 'Access denied. You are not a member of this workspace.',
        statusCode: 403,
        supabase: null,
        isAdmin: false,
      };
    }

    // Check if user is admin (for unlimited access)
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

    return {
      isValid: true,
      userId: user.id,
      workspaceId,
      error: null,
      statusCode: 200,
      supabase,
      isAdmin,
    };

  } catch (err) {
    console.error('[enrichmentAuth] Auth error:', err);
    return {
      isValid: false,
      userId: null,
      workspaceId: null,
      error: 'Authentication failed.',
      statusCode: 500,
      supabase: null,
      isAdmin: false,
    };
  }
}

// ============================================
// RATE LIMITING (Persistent)
// ============================================

/**
 * Check and increment rate limit for a workspace.
 * Uses the database for persistence across cold starts.
 */
export async function checkEnrichmentRateLimit(
  workspaceId: string
): Promise<EnrichmentRateLimitResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call stored procedure for atomic rate limit check
    const { data, error } = await supabase.rpc('check_enrichment_rate_limit', {
      p_workspace_id: workspaceId,
      p_window_ms: RATE_LIMIT_WINDOW_MS,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
    });

    if (error) {
      console.error('[enrichmentAuth] Rate limit RPC error:', error.message);
      // Fail open but log - don't block legitimate requests due to DB issues
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS),
        currentCount: 0,
      };
    }

    const result = data?.[0] || data;
    const resetAt = new Date(result?.reset_at || Date.now() + RATE_LIMIT_WINDOW_MS);
    const currentCount = result?.current_count || 0;

    return {
      allowed: result?.allowed ?? true,
      currentCount,
      resetAt,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - currentCount),
    };
  } catch (err) {
    console.error('[enrichmentAuth] Rate limit error:', err);
    // Fail open
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS),
      currentCount: 0,
    };
  }
}

// ============================================
// BALANCE CHECKING
// ============================================

/**
 * Check if workspace has sufficient balance for enrichment.
 */
export async function checkEnrichmentBalance(
  workspaceId: string
): Promise<EnrichmentBalanceResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check workspace API balance
    const { data: balance, error } = await supabase
      .from('workspace_api_balances')
      .select('balance_cents')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('[enrichmentAuth] Balance check error:', error.message);
      // Fail open with warning
      return {
        hasBalance: true,
        currentBalanceCents: 0,
        costPerCallCents: ENRICHMENT_COST_CENTS,
      };
    }

    const currentBalanceCents = balance?.balance_cents ?? 0;

    return {
      hasBalance: currentBalanceCents >= ENRICHMENT_COST_CENTS,
      currentBalanceCents,
      costPerCallCents: ENRICHMENT_COST_CENTS,
    };
  } catch (err) {
    console.error('[enrichmentAuth] Balance error:', err);
    // Fail open
    return {
      hasBalance: true,
      currentBalanceCents: 0,
      costPerCallCents: ENRICHMENT_COST_CENTS,
    };
  }
}

/**
 * Deduct balance for a successful enrichment call.
 */
export async function deductEnrichmentBalance(
  workspaceId: string,
  userId: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.rpc('deduct_enrichment_balance', {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_cost_cents: ENRICHMENT_COST_CENTS,
      p_description: `Company enrichment: ${domain.substring(0, 50)}`,
    });

    if (error) {
      console.error('[enrichmentAuth] Balance deduction error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[enrichmentAuth] Deduction error:', err);
    return { success: false, error: 'Failed to deduct balance' };
  }
}

export { ENRICHMENT_COST_CENTS, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS };
