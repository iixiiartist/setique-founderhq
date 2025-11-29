// supabase/functions/api-v1-documents/index.ts
// Premium API - Documents endpoint
// GET /api/v1/documents - List documents
// GET /api/v1/documents/:id - Get single document
// POST /api/v1/documents - Create document
// PATCH /api/v1/documents/:id - Update document
// DELETE /api/v1/documents/:id - Delete document

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

interface Document {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  content: string | null;
  type: 'note' | 'memo' | 'report' | 'template' | 'other';
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  folder: string | null;
  is_pinned: boolean;
  is_template: boolean;
  word_count: number;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateDocumentInput {
  title: string;
  content?: string;
  type?: 'note' | 'memo' | 'report' | 'template' | 'other';
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  folder?: string;
  is_pinned?: boolean;
  is_template?: boolean;
}

interface UpdateDocumentInput {
  title?: string;
  content?: string;
  type?: 'note' | 'memo' | 'report' | 'template' | 'other';
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  folder?: string;
  is_pinned?: boolean;
  is_template?: boolean;
}

interface ListDocumentsParams {
  limit?: number;
  offset?: number;
  type?: string;
  status?: string;
  folder?: string;
  search?: string;
  tags?: string[];
  is_template?: boolean;
}

// ============================================
// HANDLERS
// ============================================

async function listDocuments(
  ctx: ApiRequestContext,
  params: ListDocumentsParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;

  let query = supabase
    .from('documents')
    .select('id, workspace_id, user_id, title, type, status, tags, folder, is_pinned, is_template, word_count, last_edited_by, created_at, updated_at', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.type) {
    query = query.eq('type', params.type);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.folder) {
    query = query.eq('folder', params.folder);
  }

  if (params.search) {
    query = query.ilike('title', `%${params.search}%`);
  }

  if (params.tags && params.tags.length > 0) {
    query = query.overlaps('tags', params.tags);
  }

  if (params.is_template !== undefined) {
    query = query.eq('is_template', params.is_template);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[api-v1-documents] List error:', error);
    return errorResponse('Failed to fetch documents', 500, 'database_error');
  }

  return successResponse({
    documents: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

async function getDocument(
  ctx: ApiRequestContext,
  documentId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Document not found', 404, 'not_found');
    }
    console.error('[api-v1-documents] Get error:', error);
    return errorResponse('Failed to fetch document', 500, 'database_error');
  }

  return successResponse({ document: data });
}

async function createDocument(
  ctx: ApiRequestContext,
  input: CreateDocumentInput
): Promise<Response> {
  const { supabase, workspaceId, keyId } = ctx;

  if (!input.title || input.title.trim() === '') {
    return errorResponse('Title is required', 400, 'validation_error');
  }

  // Calculate word count
  const wordCount = input.content 
    ? input.content.trim().split(/\s+/).filter(Boolean).length 
    : 0;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      user_id: keyId, // Use API key ID as creator reference
      title: input.title.trim(),
      content: input.content || '',
      type: input.type || 'note',
      status: input.status || 'draft',
      tags: input.tags || [],
      folder: input.folder || null,
      is_pinned: input.is_pinned || false,
      is_template: input.is_template || false,
      word_count: wordCount,
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-documents] Create error:', error);
    return errorResponse('Failed to create document', 500, 'database_error');
  }

  // Trigger webhook event
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'document.created',
    entityId: data.id,
    payload: { document: data },
  }).catch(err => console.error('[api-v1-documents] Webhook trigger error:', err));

  return successResponse({ document: data }, 201);
}

async function updateDocument(
  ctx: ApiRequestContext,
  documentId: string,
  input: UpdateDocumentInput
): Promise<Response> {
  const { supabase, workspaceId, keyId } = ctx;

  // Build update object
  const updates: Record<string, unknown> = {
    last_edited_by: keyId,
  };

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.content !== undefined) {
    updates.content = input.content;
    updates.word_count = input.content.trim().split(/\s+/).filter(Boolean).length;
  }
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.folder !== undefined) updates.folder = input.folder;
  if (input.is_pinned !== undefined) updates.is_pinned = input.is_pinned;
  if (input.is_template !== undefined) updates.is_template = input.is_template;

  if (Object.keys(updates).length === 1) { // Only last_edited_by
    return errorResponse('No fields to update', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Document not found', 404, 'not_found');
    }
    console.error('[api-v1-documents] Update error:', error);
    return errorResponse('Failed to update document', 500, 'database_error');
  }

  // Trigger webhook event
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'document.updated',
    entityId: data.id,
    payload: { document: data, updated_fields: Object.keys(updates) },
  }).catch(err => console.error('[api-v1-documents] Webhook trigger error:', err));

  return successResponse({ document: data });
}

async function deleteDocument(
  ctx: ApiRequestContext,
  documentId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // First get the document for webhook payload
  const { data: existingDoc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .single();

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-documents] Delete error:', error);
    return errorResponse('Failed to delete document', 500, 'database_error');
  }

  // Trigger webhook event
  if (existingDoc) {
    triggerWebhook(supabase, {
      workspaceId,
      eventType: 'document.deleted',
      entityId: documentId,
      payload: { document: existingDoc },
    }).catch(err => console.error('[api-v1-documents] Webhook trigger error:', err));
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
  const documentId = pathParts[1]; // If present

  // GET /documents
  if (method === 'GET' && !documentId) {
    const params: ListDocumentsParams = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      type: url.searchParams.get('type') || undefined,
      status: url.searchParams.get('status') || undefined,
      folder: url.searchParams.get('folder') || undefined,
      search: url.searchParams.get('search') || undefined,
    };

    const tagsParam = url.searchParams.get('tags');
    if (tagsParam) {
      params.tags = tagsParam.split(',');
    }

    const isTemplateParam = url.searchParams.get('is_template');
    if (isTemplateParam !== null) {
      params.is_template = isTemplateParam === 'true';
    }

    return listDocuments(ctx, params);
  }

  // GET /documents/:id
  if (method === 'GET' && documentId) {
    return getDocument(ctx, documentId);
  }

  // POST /documents
  if (method === 'POST' && !documentId) {
    try {
      const input = await req.json() as CreateDocumentInput;
      return createDocument(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /documents/:id
  if (method === 'PATCH' && documentId) {
    try {
      const input = await req.json() as UpdateDocumentInput;
      return updateDocument(ctx, documentId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /documents/:id
  if (method === 'DELETE' && documentId) {
    return deleteDocument(ctx, documentId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') return ['documents:read'];
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') return ['documents:write'];
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
