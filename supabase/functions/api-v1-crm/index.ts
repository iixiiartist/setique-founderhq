// supabase/functions/api-v1-crm/index.ts
// Premium API - CRM Items endpoint (Pipeline/Deals/Companies)
// GET /api/v1/crm - List CRM items
// GET /api/v1/crm/:id - Get single CRM item
// POST /api/v1/crm - Create CRM item
// PATCH /api/v1/crm/:id - Update CRM item
// DELETE /api/v1/crm/:id - Delete CRM item

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

type CrmItemType = 'lead' | 'opportunity' | 'customer' | 'partner' | 'investor' | 'company';
type CrmStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface CrmItem {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  type: CrmItemType;
  stage: CrmStage;
  value: number | null;
  currency: string;
  probability: number | null;
  expected_close_date: string | null;
  description: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  source: string | null;
  assigned_to: string | null;
  tags: string[];
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface CreateCrmItemInput {
  name: string;
  type?: CrmItemType;
  stage?: CrmStage;
  value?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  description?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  source?: string;
  assigned_to?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

interface UpdateCrmItemInput {
  name?: string;
  type?: CrmItemType;
  stage?: CrmStage;
  value?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  description?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  source?: string;
  assigned_to?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

interface ListCrmItemsParams {
  limit?: number;
  offset?: number;
  type?: string;
  stage?: string;
  assigned_to?: string;
  search?: string;
  tags?: string[];
  min_value?: number;
  max_value?: number;
}

// ============================================
// HANDLERS
// ============================================

async function listCrmItems(
  ctx: ApiRequestContext,
  params: ListCrmItemsParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;

  let query = supabase
    .from('crm_items')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.type) {
    query = query.eq('type', params.type);
  }

  if (params.stage) {
    query = query.eq('stage', params.stage);
  }

  if (params.assigned_to) {
    query = query.eq('assigned_to', params.assigned_to);
  }

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  if (params.tags && params.tags.length > 0) {
    query = query.overlaps('tags', params.tags);
  }

  if (params.min_value !== undefined) {
    query = query.gte('value', params.min_value);
  }

  if (params.max_value !== undefined) {
    query = query.lte('value', params.max_value);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[api-v1-crm] List error:', error);
    return errorResponse('Failed to fetch CRM items', 500, 'database_error');
  }

  return successResponse({
    items: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

async function getCrmItem(
  ctx: ApiRequestContext,
  itemId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Get the CRM item with related contacts
  const { data, error } = await supabase
    .from('crm_items')
    .select('*')
    .eq('id', itemId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('CRM item not found', 404, 'not_found');
    }
    console.error('[api-v1-crm] Get error:', error);
    return errorResponse('Failed to fetch CRM item', 500, 'database_error');
  }

  // Get associated contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, email, title')
    .eq('crm_item_id', itemId)
    .limit(50);

  // Get associated tasks count
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('crm_item_id', itemId);

  return successResponse({
    item: data,
    contacts: contacts || [],
    task_count: taskCount || 0,
  });
}

async function createCrmItem(
  ctx: ApiRequestContext,
  input: CreateCrmItemInput
): Promise<Response> {
  const { supabase, workspaceId, keyId } = ctx;

  if (!input.name || input.name.trim() === '') {
    return errorResponse('Name is required', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('crm_items')
    .insert({
      workspace_id: workspaceId,
      user_id: keyId,
      name: input.name.trim(),
      type: input.type || 'lead',
      stage: input.stage || 'new',
      value: input.value || null,
      currency: input.currency || 'USD',
      probability: input.probability || null,
      expected_close_date: input.expected_close_date || null,
      description: input.description || null,
      website: input.website || null,
      industry: input.industry || null,
      company_size: input.company_size || null,
      source: input.source || null,
      assigned_to: input.assigned_to || null,
      tags: input.tags || [],
      custom_fields: input.custom_fields || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-crm] Create error:', error);
    return errorResponse('Failed to create CRM item', 500, 'database_error');
  }

  // Trigger webhook event
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'crm.created',
    entityId: data.id,
    payload: { item: data },
  }).catch(err => console.error('[api-v1-crm] Webhook trigger error:', err));

  return successResponse({ item: data }, 201);
}

async function updateCrmItem(
  ctx: ApiRequestContext,
  itemId: string,
  input: UpdateCrmItemInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Get current item for stage change detection
  const { data: currentItem } = await supabase
    .from('crm_items')
    .select('stage')
    .eq('id', itemId)
    .eq('workspace_id', workspaceId)
    .single();

  // Build update object
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.type !== undefined) updates.type = input.type;
  if (input.stage !== undefined) updates.stage = input.stage;
  if (input.value !== undefined) updates.value = input.value;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.probability !== undefined) updates.probability = input.probability;
  if (input.expected_close_date !== undefined) updates.expected_close_date = input.expected_close_date;
  if (input.description !== undefined) updates.description = input.description;
  if (input.website !== undefined) updates.website = input.website;
  if (input.industry !== undefined) updates.industry = input.industry;
  if (input.company_size !== undefined) updates.company_size = input.company_size;
  if (input.source !== undefined) updates.source = input.source;
  if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.custom_fields !== undefined) updates.custom_fields = input.custom_fields;

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('crm_items')
    .update(updates)
    .eq('id', itemId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('CRM item not found', 404, 'not_found');
    }
    console.error('[api-v1-crm] Update error:', error);
    return errorResponse('Failed to update CRM item', 500, 'database_error');
  }

  // Trigger webhook event (with stage change info if applicable)
  const eventPayload: Record<string, unknown> = {
    item: data,
    updated_fields: Object.keys(updates),
  };

  if (input.stage && currentItem && currentItem.stage !== input.stage) {
    eventPayload.stage_changed = {
      from: currentItem.stage,
      to: input.stage,
    };
  }

  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'crm.updated',
    entityId: data.id,
    payload: eventPayload,
  }).catch(err => console.error('[api-v1-crm] Webhook trigger error:', err));

  return successResponse({ item: data });
}

async function deleteCrmItem(
  ctx: ApiRequestContext,
  itemId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // First get the item for webhook payload
  const { data: existingItem } = await supabase
    .from('crm_items')
    .select('*')
    .eq('id', itemId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!existingItem) {
    return errorResponse('CRM item not found', 404, 'not_found');
  }

  // Get contact IDs first (for cascade delete info)
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('crm_item_id', itemId);

  const contactIds = (contacts || []).map(c => c.id);

  // Delete meetings tied to contacts
  if (contactIds.length > 0) {
    await supabase.from('meetings').delete().in('contact_id', contactIds);
  }

  // Delete contacts
  await supabase.from('contacts').delete().eq('crm_item_id', itemId);

  // Delete the CRM item
  const { error } = await supabase
    .from('crm_items')
    .delete()
    .eq('id', itemId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-crm] Delete error:', error);
    return errorResponse('Failed to delete CRM item', 500, 'database_error');
  }

  // Trigger webhook event
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'crm.deleted',
    entityId: itemId,
    payload: {
      item: existingItem,
      cascade_deleted: {
        contacts: contactIds.length,
      },
    },
  }).catch(err => console.error('[api-v1-crm] Webhook trigger error:', err));

  return successResponse({ deleted: true, cascade_deleted: { contacts: contactIds.length } });
}

// ============================================
// ROUTER
// ============================================

async function handleRequest(ctx: ApiRequestContext, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  const method = req.method;
  const itemId = pathParts[1]; // If present

  // GET /crm
  if (method === 'GET' && !itemId) {
    const params: ListCrmItemsParams = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      type: url.searchParams.get('type') || undefined,
      stage: url.searchParams.get('stage') || undefined,
      assigned_to: url.searchParams.get('assigned_to') || undefined,
      search: url.searchParams.get('search') || undefined,
    };

    const tagsParam = url.searchParams.get('tags');
    if (tagsParam) {
      params.tags = tagsParam.split(',');
    }

    const minValue = url.searchParams.get('min_value');
    if (minValue) {
      params.min_value = parseFloat(minValue);
    }

    const maxValue = url.searchParams.get('max_value');
    if (maxValue) {
      params.max_value = parseFloat(maxValue);
    }

    return listCrmItems(ctx, params);
  }

  // GET /crm/:id
  if (method === 'GET' && itemId) {
    return getCrmItem(ctx, itemId);
  }

  // POST /crm
  if (method === 'POST' && !itemId) {
    try {
      const input = await req.json() as CreateCrmItemInput;
      return createCrmItem(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /crm/:id
  if (method === 'PATCH' && itemId) {
    try {
      const input = await req.json() as UpdateCrmItemInput;
      return updateCrmItem(ctx, itemId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /crm/:id
  if (method === 'DELETE' && itemId) {
    return deleteCrmItem(ctx, itemId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') return ['crm:read'];
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') return ['crm:write'];
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
