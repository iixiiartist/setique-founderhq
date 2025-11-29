// supabase/functions/api-v1-calendar/index.ts
// Premium API - Calendar endpoint
// GET /api/v1/calendar - List calendar events (aggregates from tasks, marketing, CRM)
// POST /api/v1/calendar - Create a calendar event
// GET /api/v1/calendar/:id - Get single calendar event
// PATCH /api/v1/calendar/:id - Update calendar event
// DELETE /api/v1/calendar/:id - Delete calendar event

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

type EventType = 'task' | 'marketing' | 'meeting' | 'crm-action' | 'custom';

interface ListCalendarParams {
  start_date: string;
  end_date: string;
  types?: string; // comma-separated: task,marketing,meeting,crm-action,custom
  limit?: number;
  offset?: number;
}

interface CreateCalendarEventInput {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  end_date?: string;
  end_time?: string;
  all_day?: boolean;
  location?: string;
  event_type?: string;
  color?: string;
  reminder_minutes?: number;
  recurrence?: string;
  attendees?: string[];
  linked_contact_id?: string;
  linked_crm_item_id?: string;
  linked_deal_id?: string;
  tags?: string[];
}

interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  event_date?: string;
  event_time?: string;
  end_date?: string;
  end_time?: string;
  all_day?: boolean;
  location?: string;
  event_type?: string;
  color?: string;
  reminder_minutes?: number;
  recurrence?: string;
  attendees?: string[];
  linked_contact_id?: string;
  linked_crm_item_id?: string;
  linked_deal_id?: string;
  tags?: string[];
  is_completed?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  end_date?: string;
  end_time?: string;
  all_day: boolean;
  type: EventType;
  source_type: string;
  source_id: string;
  color?: string;
  location?: string;
  tags?: string[];
  linked_contact_id?: string;
  linked_crm_item_id?: string;
  priority?: string;
  status?: string;
}

// ============================================
// HANDLERS
// ============================================

async function listCalendarEvents(
  ctx: ApiRequestContext,
  params: ListCalendarParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  if (!params.start_date || !params.end_date) {
    return errorResponse('start_date and end_date are required', 400, 'validation_error');
  }

  const events: CalendarEvent[] = [];
  const typeFilter = params.types?.split(',') || ['task', 'marketing', 'meeting', 'crm-action', 'custom'];

  // 1. Fetch Tasks with due dates
  if (typeFilter.includes('task')) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, due_time, priority, status, tags')
      .eq('workspace_id', workspaceId)
      .gte('due_date', params.start_date)
      .lte('due_date', params.end_date)
      .not('due_date', 'is', null);

    if (tasks) {
      for (const task of tasks) {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          description: task.description,
          date: task.due_date,
          time: task.due_time,
          all_day: !task.due_time,
          type: 'task',
          source_type: 'task',
          source_id: task.id,
          color: task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#f97316' : '#3b82f6',
          tags: task.tags,
          priority: task.priority,
          status: task.status,
        });
      }
    }
  }

  // 2. Fetch Marketing items with due dates
  if (typeFilter.includes('marketing')) {
    const { data: marketing } = await supabase
      .from('marketing_items')
      .select('id, title, type, status, due_date, due_time, tags')
      .eq('workspace_id', workspaceId)
      .gte('due_date', params.start_date)
      .lte('due_date', params.end_date)
      .not('due_date', 'is', null);

    if (marketing) {
      for (const item of marketing) {
        events.push({
          id: `marketing-${item.id}`,
          title: item.title,
          date: item.due_date,
          time: item.due_time,
          all_day: !item.due_time,
          type: 'marketing',
          source_type: 'marketing',
          source_id: item.id,
          color: '#a855f7', // Purple for marketing
          tags: item.tags,
          status: item.status,
        });
      }
    }
  }

  // 3. Fetch CRM items with next_action_date
  if (typeFilter.includes('crm-action')) {
    const { data: crmItems } = await supabase
      .from('crm_items')
      .select('id, name, type, stage, next_action_date, next_action')
      .eq('workspace_id', workspaceId)
      .gte('next_action_date', params.start_date)
      .lte('next_action_date', params.end_date)
      .not('next_action_date', 'is', null);

    if (crmItems) {
      for (const item of crmItems) {
        events.push({
          id: `crm-${item.id}`,
          title: item.next_action || `Follow up: ${item.name}`,
          description: `${item.type} - ${item.stage}`,
          date: item.next_action_date,
          all_day: true,
          type: 'crm-action',
          source_type: 'crm_item',
          source_id: item.id,
          color: '#10b981', // Green for CRM
          linked_crm_item_id: item.id,
        });
      }
    }
  }

  // 4. Fetch custom calendar events
  if (typeFilter.includes('custom') || typeFilter.includes('meeting')) {
    const { data: customEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('event_date', params.start_date)
      .lte('event_date', params.end_date);

    if (customEvents) {
      for (const event of customEvents) {
        events.push({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.event_date,
          time: event.event_time,
          end_date: event.end_date,
          end_time: event.end_time,
          all_day: event.all_day || !event.event_time,
          type: event.event_type === 'meeting' ? 'meeting' : 'custom',
          source_type: 'calendar_event',
          source_id: event.id,
          color: event.color || '#6b7280',
          location: event.location,
          tags: event.tags,
          linked_contact_id: event.linked_contact_id,
          linked_crm_item_id: event.linked_crm_item_id,
        });
      }
    }
  }

  // Sort by date and time
  events.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Apply pagination
  const offset = params.offset || 0;
  const limit = Math.min(params.limit || 100, 500);
  const paginatedEvents = events.slice(offset, offset + limit);

  return successResponse({
    events: paginatedEvents,
    pagination: {
      total: events.length,
      limit,
      offset,
      has_more: events.length > offset + limit,
    },
  });
}

async function getCalendarEvent(
  ctx: ApiRequestContext,
  id: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Parse the ID to determine source type
  if (id.startsWith('task-')) {
    const taskId = id.replace('task-', '');
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) {
      return errorResponse('Event not found', 404, 'not_found');
    }

    return successResponse({
      event: {
        id,
        title: data.title,
        description: data.description,
        date: data.due_date,
        time: data.due_time,
        type: 'task',
        source_type: 'task',
        source_id: data.id,
        source_data: data,
      },
    });
  }

  if (id.startsWith('marketing-')) {
    const marketingId = id.replace('marketing-', '');
    const { data, error } = await supabase
      .from('marketing_items')
      .select('*')
      .eq('id', marketingId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) {
      return errorResponse('Event not found', 404, 'not_found');
    }

    return successResponse({
      event: {
        id,
        title: data.title,
        date: data.due_date,
        time: data.due_time,
        type: 'marketing',
        source_type: 'marketing',
        source_id: data.id,
        source_data: data,
      },
    });
  }

  if (id.startsWith('crm-')) {
    const crmId = id.replace('crm-', '');
    const { data, error } = await supabase
      .from('crm_items')
      .select('*')
      .eq('id', crmId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) {
      return errorResponse('Event not found', 404, 'not_found');
    }

    return successResponse({
      event: {
        id,
        title: data.next_action || `Follow up: ${data.name}`,
        date: data.next_action_date,
        type: 'crm-action',
        source_type: 'crm_item',
        source_id: data.id,
        source_data: data,
      },
    });
  }

  // Custom calendar event
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    return errorResponse('Event not found', 404, 'not_found');
  }

  return successResponse({ event: data });
}

async function createCalendarEvent(
  ctx: ApiRequestContext,
  input: CreateCalendarEventInput
): Promise<Response> {
  const { supabase, workspaceId, keyId } = ctx;

  // Validate required fields
  if (!input.title || input.title.trim() === '') {
    return errorResponse('Title is required', 400, 'validation_error');
  }
  if (!input.event_date) {
    return errorResponse('Event date is required', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      workspace_id: workspaceId,
      user_id: keyId, // Use API key ID as creator reference
      title: input.title.trim(),
      description: input.description || null,
      event_date: input.event_date,
      event_time: input.event_time || null,
      end_date: input.end_date || input.event_date,
      end_time: input.end_time || null,
      all_day: input.all_day || !input.event_time,
      location: input.location || null,
      event_type: input.event_type || 'custom',
      color: input.color || null,
      reminder_minutes: input.reminder_minutes || null,
      recurrence: input.recurrence || null,
      attendees: input.attendees || null,
      linked_contact_id: input.linked_contact_id || null,
      linked_crm_item_id: input.linked_crm_item_id || null,
      linked_deal_id: input.linked_deal_id || null,
      tags: input.tags || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-calendar] Create error:', error);
    return errorResponse('Failed to create calendar event', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'calendar.created',
    entityId: data.id,
    payload: { event: data },
  }).catch(err => console.error('[api-v1-calendar] Webhook error:', err));

  return successResponse({ event: data }, 201);
}

async function updateCalendarEvent(
  ctx: ApiRequestContext,
  id: string,
  input: UpdateCalendarEventInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Handle virtual events (task-, marketing-, crm- prefixes)
  if (id.startsWith('task-')) {
    const taskId = id.replace('task-', '');
    const updates: Record<string, unknown> = {};
    
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.event_date !== undefined) updates.due_date = input.event_date;
    if (input.event_time !== undefined) updates.due_time = input.event_time;
    if (input.is_completed !== undefined) updates.status = input.is_completed ? 'completed' : 'pending';

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error || !data) {
      return errorResponse('Event not found', 404, 'not_found');
    }

    return successResponse({ event: { ...data, id, type: 'task' } });
  }

  if (id.startsWith('marketing-')) {
    const marketingId = id.replace('marketing-', '');
    const updates: Record<string, unknown> = {};
    
    if (input.title !== undefined) updates.title = input.title;
    if (input.event_date !== undefined) updates.due_date = input.event_date;
    if (input.event_time !== undefined) updates.due_time = input.event_time;

    const { data, error } = await supabase
      .from('marketing_items')
      .update(updates)
      .eq('id', marketingId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error || !data) {
      return errorResponse('Event not found', 404, 'not_found');
    }

    return successResponse({ event: { ...data, id, type: 'marketing' } });
  }

  if (id.startsWith('crm-')) {
    const crmId = id.replace('crm-', '');
    const updates: Record<string, unknown> = {};
    
    if (input.title !== undefined) updates.next_action = input.title;
    if (input.event_date !== undefined) updates.next_action_date = input.event_date;

    const { data, error } = await supabase
      .from('crm_items')
      .update(updates)
      .eq('id', crmId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error || !data) {
      return errorResponse('Event not found', 404, 'not_found');
    }

    return successResponse({ event: { ...data, id, type: 'crm-action' } });
  }

  // Custom calendar event
  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description;
  if (input.event_date !== undefined) updates.event_date = input.event_date;
  if (input.event_time !== undefined) updates.event_time = input.event_time;
  if (input.end_date !== undefined) updates.end_date = input.end_date;
  if (input.end_time !== undefined) updates.end_time = input.end_time;
  if (input.all_day !== undefined) updates.all_day = input.all_day;
  if (input.location !== undefined) updates.location = input.location;
  if (input.event_type !== undefined) updates.event_type = input.event_type;
  if (input.color !== undefined) updates.color = input.color;
  if (input.reminder_minutes !== undefined) updates.reminder_minutes = input.reminder_minutes;
  if (input.recurrence !== undefined) updates.recurrence = input.recurrence;
  if (input.attendees !== undefined) updates.attendees = input.attendees;
  if (input.linked_contact_id !== undefined) updates.linked_contact_id = input.linked_contact_id;
  if (input.linked_crm_item_id !== undefined) updates.linked_crm_item_id = input.linked_crm_item_id;
  if (input.linked_deal_id !== undefined) updates.linked_deal_id = input.linked_deal_id;
  if (input.tags !== undefined) updates.tags = input.tags;

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return errorResponse('Event not found', 404, 'not_found');
    }
    console.error('[api-v1-calendar] Update error:', error);
    return errorResponse('Failed to update calendar event', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'calendar.updated',
    entityId: data.id,
    payload: { event: data },
  }).catch(err => console.error('[api-v1-calendar] Webhook error:', err));

  return successResponse({ event: data });
}

async function deleteCalendarEvent(
  ctx: ApiRequestContext,
  id: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Cannot delete virtual events
  if (id.startsWith('task-') || id.startsWith('marketing-') || id.startsWith('crm-')) {
    return errorResponse(
      'Cannot delete virtual events. Delete the source item (task, marketing item, or CRM item) instead.',
      400,
      'validation_error'
    );
  }

  // Check if exists
  const { data: existing } = await supabase
    .from('calendar_events')
    .select('id, title')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (!existing) {
    return errorResponse('Event not found', 404, 'not_found');
  }

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-calendar] Delete error:', error);
    return errorResponse('Failed to delete calendar event', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'calendar.deleted',
    entityId: id,
    payload: { id, title: existing.title },
  }).catch(err => console.error('[api-v1-calendar] Webhook error:', err));

  return successResponse({ deleted: true, id });
}

// ============================================
// ROUTER
// ============================================

async function handleRequest(ctx: ApiRequestContext, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  const eventId = pathParts[1];

  // GET /calendar - List events
  if (method === 'GET' && !eventId) {
    const params: ListCalendarParams = {
      start_date: url.searchParams.get('start_date') || '',
      end_date: url.searchParams.get('end_date') || '',
      types: url.searchParams.get('types') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '100'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    };
    return listCalendarEvents(ctx, params);
  }

  // GET /calendar/:id
  if (method === 'GET' && eventId) {
    return getCalendarEvent(ctx, eventId);
  }

  // POST /calendar
  if (method === 'POST' && !eventId) {
    try {
      const input = await req.json() as CreateCalendarEventInput;
      return createCalendarEvent(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /calendar/:id
  if (method === 'PATCH' && eventId) {
    try {
      const input = await req.json() as UpdateCalendarEventInput;
      return updateCalendarEvent(ctx, eventId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /calendar/:id
  if (method === 'DELETE' && eventId) {
    return deleteCalendarEvent(ctx, eventId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') {
    return ['calendar:read'];
  }
  return ['calendar:write'];
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
