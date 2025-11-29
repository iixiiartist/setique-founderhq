// supabase/functions/api-v1-marketing/index.ts
// Premium API - Marketing endpoint
// GET /api/v1/marketing - List marketing items/campaigns
// POST /api/v1/marketing - Create marketing item
// GET /api/v1/marketing/:id - Get single marketing item
// PATCH /api/v1/marketing/:id - Update marketing item
// DELETE /api/v1/marketing/:id - Delete marketing item

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

type MarketingType = 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Product Launch' | 'Event' | 'Other';
type MarketingStatus = 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled';
type Channel = 'email' | 'social' | 'paid_ads' | 'content' | 'events';

interface ListMarketingParams {
  limit?: number;
  offset?: number;
  type?: MarketingType;
  status?: MarketingStatus;
  search?: string;
  due_before?: string;
  due_after?: string;
}

interface CreateMarketingInput {
  title: string;
  type?: MarketingType;
  status?: MarketingStatus;
  due_date?: string;
  due_time?: string;
  description?: string;
  campaign_budget?: number;
  target_audience?: string;
  channels?: Channel[];
  goals?: string;
  tags?: string[];
  product_service_ids?: string[];
  target_revenue?: number;
  assigned_to?: string;
}

interface UpdateMarketingInput {
  title?: string;
  type?: MarketingType;
  status?: MarketingStatus;
  due_date?: string;
  due_time?: string;
  description?: string;
  campaign_budget?: number;
  actual_spend?: number;
  target_audience?: string;
  channels?: Channel[];
  goals?: string;
  kpis?: {
    impressions?: number;
    clicks?: number;
    engagements?: number;
    conversions?: number;
    revenue?: number;
  };
  tags?: string[];
  product_service_ids?: string[];
  target_revenue?: number;
  assigned_to?: string;
}

// ============================================
// HANDLERS
// ============================================

async function listMarketing(
  ctx: ApiRequestContext,
  params: ListMarketingParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;

  let query = supabase
    .from('marketing_items')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filters
  if (params.type) {
    query = query.eq('type', params.type);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.search) {
    query = query.ilike('title', `%${params.search}%`);
  }
  if (params.due_before) {
    query = query.lte('due_date', params.due_before);
  }
  if (params.due_after) {
    query = query.gte('due_date', params.due_after);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[api-v1-marketing] List error:', error);
    return errorResponse('Failed to fetch marketing items', 500, 'database_error');
  }

  // Transform data for API response
  const items = (data || []).map(item => ({
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    due_date: item.due_date,
    due_time: item.due_time,
    campaign_budget: item.campaign_budget,
    actual_spend: item.actual_spend,
    target_audience: item.target_audience,
    channels: item.channels,
    goals: item.goals,
    kpis: item.kpis,
    tags: item.tags,
    product_service_ids: item.product_service_ids,
    target_revenue: item.target_revenue,
    assigned_to: item.assigned_to,
    assigned_to_name: item.assigned_to_name,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  return successResponse({
    items,
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

async function getMarketing(
  ctx: ApiRequestContext,
  id: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('marketing_items')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    return errorResponse('Marketing item not found', 404, 'not_found');
  }

  return successResponse({ item: data });
}

async function createMarketing(
  ctx: ApiRequestContext,
  input: CreateMarketingInput
): Promise<Response> {
  const { supabase, workspaceId, userId } = ctx;

  // Validate required fields
  if (!input.title || input.title.trim() === '') {
    return errorResponse('Title is required', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('marketing_items')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      title: input.title.trim(),
      type: input.type || 'Other',
      status: input.status || 'Planned',
      due_date: input.due_date || null,
      due_time: input.due_time || null,
      campaign_budget: input.campaign_budget || 0,
      target_audience: input.target_audience || null,
      channels: input.channels || null,
      goals: input.goals || null,
      tags: input.tags || null,
      product_service_ids: input.product_service_ids || null,
      target_revenue: input.target_revenue || null,
      assigned_to: input.assigned_to || null,
      notes: [],
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-marketing] Create error:', error);
    return errorResponse('Failed to create marketing item', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'marketing.created',
    entityId: data.id,
    payload: { item: data },
  }).catch(err => console.error('[api-v1-marketing] Webhook error:', err));

  return successResponse({ item: data }, 201);
}

async function updateMarketing(
  ctx: ApiRequestContext,
  id: string,
  input: UpdateMarketingInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Get current item for status change detection
  const { data: currentItem } = await supabase
    .from('marketing_items')
    .select('status')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.due_date !== undefined) updates.due_date = input.due_date;
  if (input.due_time !== undefined) updates.due_time = input.due_time;
  if (input.campaign_budget !== undefined) updates.campaign_budget = input.campaign_budget;
  if (input.actual_spend !== undefined) updates.actual_spend = input.actual_spend;
  if (input.target_audience !== undefined) updates.target_audience = input.target_audience;
  if (input.channels !== undefined) updates.channels = input.channels;
  if (input.goals !== undefined) updates.goals = input.goals;
  if (input.kpis !== undefined) updates.kpis = input.kpis;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.product_service_ids !== undefined) updates.product_service_ids = input.product_service_ids;
  if (input.target_revenue !== undefined) updates.target_revenue = input.target_revenue;
  if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to;

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('marketing_items')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return errorResponse('Marketing item not found', 404, 'not_found');
    }
    console.error('[api-v1-marketing] Update error:', error);
    return errorResponse('Failed to update marketing item', 500, 'database_error');
  }

  // Trigger webhooks
  const eventType = input.status && currentItem?.status !== input.status
    ? 'marketing.status_changed'
    : 'marketing.updated';

  triggerWebhook(supabase, {
    workspaceId,
    eventType,
    entityId: data.id,
    payload: { 
      item: data,
      previous_status: currentItem?.status,
      new_status: data.status,
    },
  }).catch(err => console.error('[api-v1-marketing] Webhook error:', err));

  return successResponse({ item: data });
}

async function deleteMarketing(
  ctx: ApiRequestContext,
  id: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Check if exists
  const { data: existing } = await supabase
    .from('marketing_items')
    .select('id, title')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (!existing) {
    return errorResponse('Marketing item not found', 404, 'not_found');
  }

  const { error } = await supabase
    .from('marketing_items')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-marketing] Delete error:', error);
    return errorResponse('Failed to delete marketing item', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'marketing.deleted',
    entityId: id,
    payload: { id, title: existing.title },
  }).catch(err => console.error('[api-v1-marketing] Webhook error:', err));

  return successResponse({ deleted: true, id });
}

// ============================================
// ROUTER
// ============================================

async function handleRequest(ctx: ApiRequestContext, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  const itemId = pathParts[1];

  // GET /marketing - List
  if (method === 'GET' && !itemId) {
    const params: ListMarketingParams = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      type: url.searchParams.get('type') as MarketingType || undefined,
      status: url.searchParams.get('status') as MarketingStatus || undefined,
      search: url.searchParams.get('search') || undefined,
      due_before: url.searchParams.get('due_before') || undefined,
      due_after: url.searchParams.get('due_after') || undefined,
    };
    return listMarketing(ctx, params);
  }

  // GET /marketing/:id
  if (method === 'GET' && itemId) {
    return getMarketing(ctx, itemId);
  }

  // POST /marketing
  if (method === 'POST' && !itemId) {
    try {
      const input = await req.json() as CreateMarketingInput;
      return createMarketing(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /marketing/:id
  if (method === 'PATCH' && itemId) {
    try {
      const input = await req.json() as UpdateMarketingInput;
      return updateMarketing(ctx, itemId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /marketing/:id
  if (method === 'DELETE' && itemId) {
    return deleteMarketing(ctx, itemId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') {
    return ['marketing:read'];
  }
  return ['marketing:write'];
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
