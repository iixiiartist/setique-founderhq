// supabase/functions/api-v1-contacts/index.ts
// Premium API - Contacts endpoint
// GET /api/v1/contacts - List contacts
// GET /api/v1/contacts/:id - Get single contact
// POST /api/v1/contacts - Create contact
// PATCH /api/v1/contacts/:id - Update contact
// DELETE /api/v1/contacts/:id - Delete contact

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

interface Contact {
  id: string;
  workspace_id: string;
  crm_item_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  linkedin: string | null;
  tags: string[];
  assigned_to: string | null;
  assigned_to_name: string | null;
  notes: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface CreateContactInput {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  linkedin?: string;
  tags?: string[];
  crm_item_id?: string;
  assigned_to?: string;
  notes?: Record<string, unknown>;
}

interface UpdateContactInput {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  linkedin?: string;
  tags?: string[];
  crm_item_id?: string;
  assigned_to?: string;
  notes?: Record<string, unknown>;
}

interface ListContactsParams {
  limit?: number;
  offset?: number;
  crm_item_id?: string;
  search?: string;
  tags?: string[];
  assigned_to?: string;
}

// ============================================
// HANDLERS
// ============================================

async function listContacts(
  ctx: ApiRequestContext,
  params: ListContactsParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.crm_item_id) {
    query = query.eq('crm_item_id', params.crm_item_id);
  }

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }

  if (params.tags && params.tags.length > 0) {
    query = query.overlaps('tags', params.tags);
  }

  if (params.assigned_to) {
    query = query.eq('assigned_to', params.assigned_to);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[api-v1-contacts] List error:', error);
    return errorResponse('Failed to fetch contacts', 500, 'database_error');
  }

  return successResponse({
    contacts: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

async function getContact(
  ctx: ApiRequestContext,
  contactId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Contact not found', 404, 'not_found');
    }
    console.error('[api-v1-contacts] Get error:', error);
    return errorResponse('Failed to fetch contact', 500, 'database_error');
  }

  return successResponse({ contact: data });
}

async function createContact(
  ctx: ApiRequestContext,
  input: CreateContactInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  if (!input.name || input.name.trim() === '') {
    return errorResponse('Name is required', 400, 'validation_error');
  }

  // Validate crm_item_id if provided
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

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      user_id: ctx.keyId, // Use API key ID as creator reference
      name: input.name.trim(),
      email: input.email || null,
      phone: input.phone || null,
      title: input.title || null,
      linkedin: input.linkedin || null,
      tags: input.tags || [],
      crm_item_id: input.crm_item_id || null,
      assigned_to: input.assigned_to || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-contacts] Create error:', error);
    return errorResponse('Failed to create contact', 500, 'database_error');
  }

  // Trigger webhook event
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'contact.created',
    entityId: data.id,
    payload: { contact: data },
  }).catch(err => console.error('[api-v1-contacts] Webhook trigger error:', err));

  return successResponse({ contact: data }, 201);
}

async function updateContact(
  ctx: ApiRequestContext,
  contactId: string,
  input: UpdateContactInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Build update object
  const updates: Record<string, unknown> = {};
  
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.title !== undefined) updates.title = input.title;
  if (input.linkedin !== undefined) updates.linkedin = input.linkedin;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.crm_item_id !== undefined) updates.crm_item_id = input.crm_item_id;
  if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to;
  if (input.notes !== undefined) updates.notes = input.notes;

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400, 'validation_error');
  }

  // Validate crm_item_id if being updated
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

  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Contact not found', 404, 'not_found');
    }
    console.error('[api-v1-contacts] Update error:', error);
    return errorResponse('Failed to update contact', 500, 'database_error');
  }

  // Trigger webhook event
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'contact.updated',
    entityId: data.id,
    payload: { contact: data, updated_fields: Object.keys(updates) },
  }).catch(err => console.error('[api-v1-contacts] Webhook trigger error:', err));

  return successResponse({ contact: data });
}

async function deleteContact(
  ctx: ApiRequestContext,
  contactId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // First get the contact for webhook payload
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .single();

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-contacts] Delete error:', error);
    return errorResponse('Failed to delete contact', 500, 'database_error');
  }

  // Trigger webhook event
  if (existingContact) {
    triggerWebhook(supabase, {
      workspaceId,
      eventType: 'contact.deleted',
      entityId: contactId,
      payload: { contact: existingContact },
    }).catch(err => console.error('[api-v1-contacts] Webhook trigger error:', err));
  }

  return successResponse({ deleted: true });
}

// ============================================
// ROUTER
// ============================================

async function handleRequest(ctx: ApiRequestContext, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Expected path: /api-v1-contacts or /api-v1-contacts/:id
  
  const method = req.method;
  const contactId = pathParts[1]; // If present

  // GET /contacts
  if (method === 'GET' && !contactId) {
    const params: ListContactsParams = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      crm_item_id: url.searchParams.get('crm_item_id') || undefined,
      search: url.searchParams.get('search') || undefined,
      assigned_to: url.searchParams.get('assigned_to') || undefined,
    };
    
    const tagsParam = url.searchParams.get('tags');
    if (tagsParam) {
      params.tags = tagsParam.split(',');
    }
    
    return listContacts(ctx, params);
  }

  // GET /contacts/:id
  if (method === 'GET' && contactId) {
    return getContact(ctx, contactId);
  }

  // POST /contacts
  if (method === 'POST' && !contactId) {
    try {
      const input = await req.json() as CreateContactInput;
      return createContact(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /contacts/:id
  if (method === 'PATCH' && contactId) {
    try {
      const input = await req.json() as UpdateContactInput;
      return updateContact(ctx, contactId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /contacts/:id
  if (method === 'DELETE' && contactId) {
    return deleteContact(ctx, contactId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

// Determine required scopes based on method
function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') return ['contacts:read'];
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') return ['contacts:write'];
  return [];
}

serve(async (req: Request) => {
  // Handle CORS preflight
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
