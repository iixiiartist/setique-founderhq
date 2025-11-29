// supabase/functions/api-v1-tasks/index.ts
// Premium API - Tasks endpoint
// GET /api/v1/tasks - List tasks
// GET /api/v1/tasks/:id - Get single task
// POST /api/v1/tasks - Create task
// PATCH /api/v1/tasks/:id - Update task
// DELETE /api/v1/tasks/:id - Delete task

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

type TaskStatus = 'Todo' | 'InProgress' | 'Done';
type TaskPriority = 'Low' | 'Medium' | 'High';

interface Task {
  id: string;
  workspace_id: string;
  text: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string | null;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  crm_item_id: string | null;
  contact_id: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  subtasks: Record<string, unknown>[] | null;
  notes: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface CreateTaskInput {
  text: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  due_date?: string;
  due_time?: string;
  crm_item_id?: string;
  contact_id?: string;
  assigned_to?: string;
  subtasks?: Record<string, unknown>[];
  notes?: Record<string, unknown>;
}

interface UpdateTaskInput {
  text?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  due_date?: string | null;
  due_time?: string | null;
  crm_item_id?: string | null;
  contact_id?: string | null;
  assigned_to?: string | null;
  subtasks?: Record<string, unknown>[];
  notes?: Record<string, unknown>;
}

interface ListTasksParams {
  limit?: number;
  offset?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  crm_item_id?: string;
  contact_id?: string;
  assigned_to?: string;
  due_before?: string;
  due_after?: string;
  search?: string;
  include_completed?: boolean;
}

// ============================================
// HANDLERS
// ============================================

async function listTasks(
  ctx: ApiRequestContext,
  params: ListTasksParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;

  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filters
  if (params.status) {
    query = query.eq('status', params.status);
  } else if (!params.include_completed) {
    query = query.neq('status', 'Done');
  }

  if (params.priority) {
    query = query.eq('priority', params.priority);
  }

  if (params.category) {
    query = query.eq('category', params.category);
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

  if (params.due_before) {
    query = query.lte('due_date', params.due_before);
  }

  if (params.due_after) {
    query = query.gte('due_date', params.due_after);
  }

  if (params.search) {
    query = query.ilike('text', `%${params.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[api-v1-tasks] List error:', error);
    return errorResponse('Failed to fetch tasks', 500, 'database_error');
  }

  return successResponse({
    tasks: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

async function getTask(
  ctx: ApiRequestContext,
  taskId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Task not found', 404, 'not_found');
    }
    console.error('[api-v1-tasks] Get error:', error);
    return errorResponse('Failed to fetch task', 500, 'database_error');
  }

  return successResponse({ task: data });
}

async function createTask(
  ctx: ApiRequestContext,
  input: CreateTaskInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  if (!input.text || input.text.trim() === '') {
    return errorResponse('Text is required', 400, 'validation_error');
  }

  // Validate status
  const validStatuses: TaskStatus[] = ['Todo', 'InProgress', 'Done'];
  if (input.status && !validStatuses.includes(input.status)) {
    return errorResponse('Invalid status. Must be Todo, InProgress, or Done', 400, 'validation_error');
  }

  // Validate priority
  const validPriorities: TaskPriority[] = ['Low', 'Medium', 'High'];
  if (input.priority && !validPriorities.includes(input.priority)) {
    return errorResponse('Invalid priority. Must be Low, Medium, or High', 400, 'validation_error');
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

  // Validate contact_id if provided
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
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      user_id: ctx.keyId,
      text: input.text.trim(),
      status: input.status || 'Todo',
      priority: input.priority || 'Medium',
      category: input.category || null,
      due_date: input.due_date || null,
      due_time: input.due_time || null,
      crm_item_id: input.crm_item_id || null,
      contact_id: input.contact_id || null,
      assigned_to: input.assigned_to || null,
      subtasks: input.subtasks || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-tasks] Create error:', error);
    return errorResponse('Failed to create task', 500, 'database_error');
  }

  return successResponse({ task: data }, 201);
}

async function updateTask(
  ctx: ApiRequestContext,
  taskId: string,
  input: UpdateTaskInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Validate status if provided
  const validStatuses: TaskStatus[] = ['Todo', 'InProgress', 'Done'];
  if (input.status && !validStatuses.includes(input.status)) {
    return errorResponse('Invalid status. Must be Todo, InProgress, or Done', 400, 'validation_error');
  }

  // Validate priority if provided
  const validPriorities: TaskPriority[] = ['Low', 'Medium', 'High'];
  if (input.priority && !validPriorities.includes(input.priority)) {
    return errorResponse('Invalid priority. Must be Low, Medium, or High', 400, 'validation_error');
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  
  if (input.text !== undefined) updates.text = input.text.trim();
  if (input.status !== undefined) {
    updates.status = input.status;
    // Set completed_at when marking as Done
    if (input.status === 'Done') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }
  }
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.category !== undefined) updates.category = input.category;
  if (input.due_date !== undefined) updates.due_date = input.due_date;
  if (input.due_time !== undefined) updates.due_time = input.due_time;
  if (input.crm_item_id !== undefined) updates.crm_item_id = input.crm_item_id;
  if (input.contact_id !== undefined) updates.contact_id = input.contact_id;
  if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to;
  if (input.subtasks !== undefined) updates.subtasks = input.subtasks;
  if (input.notes !== undefined) updates.notes = input.notes;

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
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Task not found', 404, 'not_found');
    }
    console.error('[api-v1-tasks] Update error:', error);
    return errorResponse('Failed to update task', 500, 'database_error');
  }

  return successResponse({ task: data });
}

async function deleteTask(
  ctx: ApiRequestContext,
  taskId: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-tasks] Delete error:', error);
    return errorResponse('Failed to delete task', 500, 'database_error');
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
  const taskId = pathParts[1];

  // GET /tasks
  if (method === 'GET' && !taskId) {
    const params: ListTasksParams = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      status: url.searchParams.get('status') as TaskStatus || undefined,
      priority: url.searchParams.get('priority') as TaskPriority || undefined,
      category: url.searchParams.get('category') || undefined,
      crm_item_id: url.searchParams.get('crm_item_id') || undefined,
      contact_id: url.searchParams.get('contact_id') || undefined,
      assigned_to: url.searchParams.get('assigned_to') || undefined,
      due_before: url.searchParams.get('due_before') || undefined,
      due_after: url.searchParams.get('due_after') || undefined,
      search: url.searchParams.get('search') || undefined,
      include_completed: url.searchParams.get('include_completed') === 'true',
    };
    
    return listTasks(ctx, params);
  }

  // GET /tasks/:id
  if (method === 'GET' && taskId) {
    return getTask(ctx, taskId);
  }

  // POST /tasks
  if (method === 'POST' && !taskId) {
    try {
      const input = await req.json() as CreateTaskInput;
      return createTask(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /tasks/:id
  if (method === 'PATCH' && taskId) {
    try {
      const input = await req.json() as UpdateTaskInput;
      return updateTask(ctx, taskId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /tasks/:id
  if (method === 'DELETE' && taskId) {
    return deleteTask(ctx, taskId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') return ['tasks:read'];
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') return ['tasks:write'];
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
