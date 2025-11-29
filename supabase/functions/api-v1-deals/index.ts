// supabase/functions/api-v1-deals/index.ts
// Premium API - Deals endpoint
// GET /api/v1/deals - List deals
// GET /api/v1/deals/:id - Get single deal
// POST /api/v1/deals - Create deal
// PATCH /api/v1/deals/:id - Update deal
// DELETE /api/v1/deals/:id - Delete deal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createApiHandler,
  successResponse,
  errorResponse,
  corsHeaders,
  type ApiRequestContext,
  type ApiScope,
} from '../_shared/apiAuth.ts';

// ============================================
// TYPES
// ============================================

type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
type DealCategory = 'investment' | 'customer_deal' | 'partnership' | 'other';
type DealPriority = 'Low' | 'Medium' | 'High';

interface Deal {
  id: string;
  workspace_id: string;
  title: string;
  crm_item_id: string | null;
  contact_id: string | null;
  value: number | null;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  source: string | null;
  category: DealCategory;
  priority: DealPriority;
  product_service_id: string | null;
  assigned_to: string | null;
  notes: Record<string, unknown> | null;
  tags: string[];
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface CreateDealInput {
  title: string;
  crm_item_id?: string;
  contact_id?: string;
  value?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expected_close_date?: string;
  source?: string;
  category?: DealCategory;
  priority?: DealPriority;
  product_service_id?: string;
  assigned_to?: string;
  notes?: Record<string, unknown>;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

interface UpdateDealInput {
  title?: string;
  crm_item_id?: string | null;
  contact_id?: string | null;
  value?: number | null;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expected_close_date?: string | null;
  actual_close_date?: string | null;
  source?: string | null;
  category?: DealCategory;
  priority?: DealPriority;
  product_service_id?: string | null;
  assigned_to?: string | null;
  notes?: Record<string, unknown>;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

interface ListDealsParams {
  limit?: number;
  offset?: number;
  stage?: DealStage;
  category?: DealCategory;
  priority?: DealPriority;
  crm_item_id?: string;
  contact_id?: string;
  assigned_to?: string;
  min_value?: number;
  max_value?: number;
  expected_close_before?: string;
  expected_close_after?: string;
  search?: string;
  include_closed?: boolean;
}

// ============================================
// HANDLERS
// ============================================

async function listDeals(
  ctx: ApiRequestContext,
  params: ListDealsParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;

  let query = supabase
    .from('deals')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filters
  if (params.stage) {
    query = query.eq('stage', params.stage);
  } else if (!params.include_closed) {
    query = query.not('stage', 'in', '(closed_won,closed_lost)');
  }

  if (params.category) {
    query = query.eq('category', params.category);
  }

  if (params.priority) {
    query = query.eq('priority', params.priority);
  }

  if (params.crm_item_id) {
    query = query.eq('crm_item_id', params.crm_item_id);
  }

  if (params.contact_id) {
    query = query.eq('contact_id', params.contact_id);
  }

  if (params.assigned_to) {
    query = query.eq('assigned_to', params.assigned_to);
  }

  if (params.min_value !== undefined) {
    query = query.gte('value', params.min_value);
  }

  if (params.max_value !== undefined) {
    query = query.lte('value', params.max_value);
  }

  if (params.expected_close_before) {
    query = query.lte('expected_close_date', params.expected_close_before);
  }

  if (params.expected_close_after) {
    query = query.gte('expected_close_date', params.expected_close_after);
  }

  if (params.search) {
    query = query.ilike('title', `%${params.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[api-v1-deals] List error:', error);
    return errorResponse('Failed to fetch deals', 500, 'database_error');
  }

  // Calculate pipeline metrics
  const deals = data || [];
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedValue = deals.reduce((sum, d) => sum + ((d.value || 0) * (d.probability || 0) / 100), 0);

  return successResponse({
    deals,
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
    metrics: {
      total_value: totalValue,
      weighted_value: Math.round(weightedValue * 100) / 100,
      deal_count: deals.length,
    },
  });
}

async function getDeal(
  ctx: ApiRequestContext,
  dealId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Deal not found', 404, 'not_found');
    }
    console.error('[api-v1-deals] Get error:', error);
    return errorResponse('Failed to fetch deal', 500, 'database_error');
  }

  return successResponse({ deal: data });
}

async function createDeal(
  ctx: ApiRequestContext,
  input: CreateDealInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  if (!input.title || input.title.trim() === '') {
    return errorResponse('Title is required', 400, 'validation_error');
  }

  // Validate stage
  const validStages: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
  if (input.stage && !validStages.includes(input.stage)) {
    return errorResponse('Invalid stage', 400, 'validation_error');
  }

  // Validate category
  const validCategories: DealCategory[] = ['investment', 'customer_deal', 'partnership', 'other'];
  if (input.category && !validCategories.includes(input.category)) {
    return errorResponse('Invalid category', 400, 'validation_error');
  }

  // Validate priority
  const validPriorities: DealPriority[] = ['Low', 'Medium', 'High'];
  if (input.priority && !validPriorities.includes(input.priority)) {
    return errorResponse('Invalid priority', 400, 'validation_error');
  }

  // Validate probability
  if (input.probability !== undefined && (input.probability < 0 || input.probability > 100)) {
    return errorResponse('Probability must be between 0 and 100', 400, 'validation_error');
  }

  // Validate foreign keys
  if (input.crm_item_id) {
    const { data: crmItem } = await supabase
      .from('crm_items')
      .select('id')
      .eq('id', input.crm_item_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!crmItem) {
      return errorResponse('CRM item not found', 400, 'validation_error');
    }
  }

  if (input.contact_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', input.contact_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!contact) {
      return errorResponse('Contact not found', 400, 'validation_error');
    }
  }

  const { data, error } = await supabase
    .from('deals')
    .insert({
      workspace_id: workspaceId,
      title: input.title.trim(),
      crm_item_id: input.crm_item_id || null,
      contact_id: input.contact_id || null,
      value: input.value || null,
      currency: input.currency || 'USD',
      stage: input.stage || 'lead',
      probability: input.probability ?? 10,
      expected_close_date: input.expected_close_date || null,
      source: input.source || null,
      category: input.category || 'other',
      priority: input.priority || 'Medium',
      product_service_id: input.product_service_id || null,
      assigned_to: input.assigned_to || null,
      notes: input.notes || null,
      tags: input.tags || [],
      custom_fields: input.custom_fields || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-deals] Create error:', error);
    return errorResponse('Failed to create deal', 500, 'database_error');
  }

  return successResponse({ deal: data }, 201);
}

async function updateDeal(
  ctx: ApiRequestContext,
  dealId: string,
  input: UpdateDealInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Validate stage if provided
  const validStages: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
  if (input.stage && !validStages.includes(input.stage)) {
    return errorResponse('Invalid stage', 400, 'validation_error');
  }

  // Validate category if provided
  const validCategories: DealCategory[] = ['investment', 'customer_deal', 'partnership', 'other'];
  if (input.category && !validCategories.includes(input.category)) {
    return errorResponse('Invalid category', 400, 'validation_error');
  }

  // Validate priority if provided
  const validPriorities: DealPriority[] = ['Low', 'Medium', 'High'];
  if (input.priority && !validPriorities.includes(input.priority)) {
    return errorResponse('Invalid priority', 400, 'validation_error');
  }

  // Validate probability if provided
  if (input.probability !== undefined && (input.probability < 0 || input.probability > 100)) {
    return errorResponse('Probability must be between 0 and 100', 400, 'validation_error');
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.crm_item_id !== undefined) updates.crm_item_id = input.crm_item_id;
  if (input.contact_id !== undefined) updates.contact_id = input.contact_id;
  if (input.value !== undefined) updates.value = input.value;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.stage !== undefined) {
    updates.stage = input.stage;
    // Auto-set actual_close_date when closing
    if (input.stage === 'closed_won' || input.stage === 'closed_lost') {
      updates.actual_close_date = new Date().toISOString().split('T')[0];
      updates.probability = input.stage === 'closed_won' ? 100 : 0;
    }
  }
  if (input.probability !== undefined) updates.probability = input.probability;
  if (input.expected_close_date !== undefined) updates.expected_close_date = input.expected_close_date;
  if (input.actual_close_date !== undefined) updates.actual_close_date = input.actual_close_date;
  if (input.source !== undefined) updates.source = input.source;
  if (input.category !== undefined) updates.category = input.category;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.product_service_id !== undefined) updates.product_service_id = input.product_service_id;
  if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.custom_fields !== undefined) updates.custom_fields = input.custom_fields;

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400, 'validation_error');
  }

  // Validate foreign keys if being updated
  if (input.crm_item_id) {
    const { data: crmItem } = await supabase
      .from('crm_items')
      .select('id')
      .eq('id', input.crm_item_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!crmItem) {
      return errorResponse('CRM item not found', 400, 'validation_error');
    }
  }

  if (input.contact_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', input.contact_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!contact) {
      return errorResponse('Contact not found', 400, 'validation_error');
    }
  }

  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Deal not found', 404, 'not_found');
    }
    console.error('[api-v1-deals] Update error:', error);
    return errorResponse('Failed to update deal', 500, 'database_error');
  }

  return successResponse({ deal: data });
}

async function deleteDeal(
  ctx: ApiRequestContext,
  dealId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', dealId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-deals] Delete error:', error);
    return errorResponse('Failed to delete deal', 500, 'database_error');
  }

  return successResponse({ deleted: true });
}

// ============================================
// ROUTER
// ============================================

async function handleRequest(ctx: ApiRequestContext, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  const method = req.method;
  const dealId = pathParts[1];

  // GET /deals
  if (method === 'GET' && !dealId) {
    const params: ListDealsParams = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      stage: url.searchParams.get('stage') as DealStage || undefined,
      category: url.searchParams.get('category') as DealCategory || undefined,
      priority: url.searchParams.get('priority') as DealPriority || undefined,
      crm_item_id: url.searchParams.get('crm_item_id') || undefined,
      contact_id: url.searchParams.get('contact_id') || undefined,
      assigned_to: url.searchParams.get('assigned_to') || undefined,
      min_value: url.searchParams.get('min_value') ? parseFloat(url.searchParams.get('min_value')!) : undefined,
      max_value: url.searchParams.get('max_value') ? parseFloat(url.searchParams.get('max_value')!) : undefined,
      expected_close_before: url.searchParams.get('expected_close_before') || undefined,
      expected_close_after: url.searchParams.get('expected_close_after') || undefined,
      search: url.searchParams.get('search') || undefined,
      include_closed: url.searchParams.get('include_closed') === 'true',
    };
    
    return listDeals(ctx, params);
  }

  // GET /deals/:id
  if (method === 'GET' && dealId) {
    return getDeal(ctx, dealId);
  }

  // POST /deals
  if (method === 'POST' && !dealId) {
    try {
      const input = await req.json() as CreateDealInput;
      return createDeal(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /deals/:id
  if (method === 'PATCH' && dealId) {
    try {
      const input = await req.json() as UpdateDealInput;
      return updateDeal(ctx, dealId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /deals/:id
  if (method === 'DELETE' && dealId) {
    return deleteDeal(ctx, dealId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') return ['deals:read'];
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') return ['deals:write'];
  return [];
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
