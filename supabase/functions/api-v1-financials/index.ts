// supabase/functions/api-v1-financials/index.ts
// Premium API - Financials endpoint
// GET /api/v1/financials - List financial logs
// POST /api/v1/financials - Create financial log
// GET /api/v1/financials/:id - Get single financial log
// PATCH /api/v1/financials/:id - Update financial log
// DELETE /api/v1/financials/:id - Delete financial log

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  createApiHandler,
  successResponse,
  errorResponse,
  corsHeaders,
  type ApiRequestContext,
  type ApiScope,
} from '../_shared/apiAuth.ts';
import { triggerWebhook } from '../_shared/webhookTrigger.ts';

// ============================================
// TYPES
// ============================================

interface ListFinancialsParams {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
  sort?: 'asc' | 'desc';
}

interface CreateFinancialInput {
  date: string;
  mrr: number;
  gmv: number;
  signups: number;
}

interface UpdateFinancialInput {
  date?: string;
  mrr?: number;
  gmv?: number;
  signups?: number;
}

// ============================================
// HANDLERS
// ============================================

async function listFinancials(
  ctx: ApiRequestContext,
  params: ListFinancialsParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;
  const sort = params.sort || 'desc';

  let query = supabase
    .from('financial_logs')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('date', { ascending: sort === 'asc' })
    .range(offset, offset + limit - 1);

  // Date range filters
  if (params.start_date) {
    query = query.gte('date', params.start_date);
  }
  if (params.end_date) {
    query = query.lte('date', params.end_date);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[api-v1-financials] List error:', error);
    return errorResponse('Failed to fetch financials', 500, 'database_error');
  }

  return successResponse({
    financials: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

async function getFinancial(
  ctx: ApiRequestContext,
  id: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('financial_logs')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    return errorResponse('Financial log not found', 404, 'not_found');
  }

  return successResponse({ financial: data });
}

async function createFinancial(
  ctx: ApiRequestContext,
  input: CreateFinancialInput
): Promise<Response> {
  const { supabase, workspaceId, keyId } = ctx;

  // Validate required fields
  if (!input.date) {
    return errorResponse('Date is required', 400, 'validation_error');
  }
  if (typeof input.mrr !== 'number' || typeof input.gmv !== 'number' || typeof input.signups !== 'number') {
    return errorResponse('MRR, GMV, and signups are required as numbers', 400, 'validation_error');
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input.date)) {
    return errorResponse('Date must be in YYYY-MM-DD format', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('financial_logs')
    .insert({
      workspace_id: workspaceId,
      user_id: keyId, // Use API key ID as creator reference
      date: input.date,
      mrr: input.mrr,
      gmv: input.gmv,
      signups: input.signups,
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-financials] Create error:', error);
    return errorResponse('Failed to create financial log', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'financial.created',
    entityId: data.id,
    payload: { financial: data },
  }).catch(err => console.error('[api-v1-financials] Webhook error:', err));

  return successResponse({ financial: data }, 201);
}

async function updateFinancial(
  ctx: ApiRequestContext,
  id: string,
  input: UpdateFinancialInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const updates: Record<string, unknown> = {};

  if (input.date !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.date)) {
      return errorResponse('Date must be in YYYY-MM-DD format', 400, 'validation_error');
    }
    updates.date = input.date;
  }
  if (input.mrr !== undefined) updates.mrr = input.mrr;
  if (input.gmv !== undefined) updates.gmv = input.gmv;
  if (input.signups !== undefined) updates.signups = input.signups;

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('financial_logs')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return errorResponse('Financial log not found', 404, 'not_found');
    }
    console.error('[api-v1-financials] Update error:', error);
    return errorResponse('Failed to update financial log', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'financial.updated',
    entityId: data.id,
    payload: { financial: data },
  }).catch(err => console.error('[api-v1-financials] Webhook error:', err));

  return successResponse({ financial: data });
}

async function deleteFinancial(
  ctx: ApiRequestContext,
  id: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Check if exists first
  const { data: existing } = await supabase
    .from('financial_logs')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (!existing) {
    return errorResponse('Financial log not found', 404, 'not_found');
  }

  const { error } = await supabase
    .from('financial_logs')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-financials] Delete error:', error);
    return errorResponse('Failed to delete financial log', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'financial.deleted',
    entityId: id,
    payload: { id },
  }).catch(err => console.error('[api-v1-financials] Webhook error:', err));

  return successResponse({ deleted: true, id });
}

// ============================================
// ROUTER
// ============================================

async function handleRequest(ctx: ApiRequestContext, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  // Extract ID from path (e.g., /financials/abc123)
  const financialId = pathParts[1];

  // GET /financials - List all
  if (method === 'GET' && !financialId) {
    const params: ListFinancialsParams = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      sort: (url.searchParams.get('sort') as 'asc' | 'desc') || 'desc',
    };
    return listFinancials(ctx, params);
  }

  // GET /financials/:id - Get single
  if (method === 'GET' && financialId) {
    return getFinancial(ctx, financialId);
  }

  // POST /financials - Create
  if (method === 'POST' && !financialId) {
    try {
      const input = await req.json() as CreateFinancialInput;
      return createFinancial(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /financials/:id - Update
  if (method === 'PATCH' && financialId) {
    try {
      const input = await req.json() as UpdateFinancialInput;
      return updateFinancial(ctx, financialId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /financials/:id - Delete
  if (method === 'DELETE' && financialId) {
    return deleteFinancial(ctx, financialId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') {
    return ['financials:read'];
  }
  return ['financials:write'];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requiredScopes = getRequiredScopes(req);

  const handler = createApiHandler(handleRequest, {
    requiredScopes,
    allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  return handler(req);
});
