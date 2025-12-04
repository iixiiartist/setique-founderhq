// services/huddleService.ts
// Service layer for Huddle chat functionality

import { supabase } from '../lib/supabase';
import { withMetrics, metricsCollector } from '../lib/utils/observability';
import type {
  HuddleRoom,
  HuddleMember,
  HuddleMessage,
  HuddleReaction,
  HuddleSummary,
  HuddleAttachment,
  HuddleLinkedEntities,
  CreateRoomRequest,
  SendMessageRequest,
  AIRunRequest,
  AIStreamEvent,
  HuddleRoomSettings,
} from '../types/huddle';

// ============================================================================
// ROOMS
// ============================================================================

/**
 * Get workspace rooms with pagination and current user filtering
 * @param workspaceId - The workspace ID
 * @param options - Pagination and filtering options
 */
export async function getWorkspaceRooms(
  workspaceId: string,
  options?: {
    limit?: number;
    offset?: number;
    currentUserId?: string; // Filter to rooms user belongs to
    includeMembers?: boolean; // Lazy-load members (default: false for list view)
  }
): Promise<{ data: HuddleRoom[] | null; error: any; hasMore?: boolean }> {
  return withMetrics('getWorkspaceRooms', async () => {
  const limit = options?.limit ?? 30;
  const offset = options?.offset ?? 0;
  const includeMembers = options?.includeMembers ?? false;

  // Build select clause - only include members if requested
  const selectClause = includeMembers
    ? `
      id, workspace_id, type, name, slug, description, is_private, created_by, settings, archived_at, last_message_at, created_at, updated_at,
      members:huddle_members(
        user_id,
        role,
        user:profiles(id, full_name, avatar_url)
      )
    `
    : 'id, workspace_id, type, name, slug, description, is_private, created_by, settings, archived_at, last_message_at, created_at, updated_at';

  let query = supabase
    .from('huddle_rooms')
    .select(selectClause, { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  // If currentUserId provided, filter to rooms user belongs to
  if (options?.currentUserId) {
    // Build select clause respecting includeMembers option
    // BUGFIX: Previously this branch ignored includeMembers entirely
    const userFilterSelectClause = includeMembers
      ? `
        id, workspace_id, type, name, slug, description, is_private, created_by, settings, archived_at, last_message_at, created_at, updated_at,
        huddle_members!inner(user_id, role, user:profiles(id, full_name, avatar_url))
      `
      : `
        id, workspace_id, type, name, slug, description, is_private, created_by, settings, archived_at, last_message_at, created_at, updated_at,
        huddle_members!inner(user_id)
      `;
    
    // Use inner join via the members relation filter
    query = supabase
      .from('huddle_rooms')
      .select(userFilterSelectClause, { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('huddle_members.user_id', options.currentUserId)
      .is('archived_at', null)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query;

  return { 
    data, 
    error, 
    hasMore: (count ?? 0) > offset + limit 
  };
  });
}

export async function getRoom(roomId: string): Promise<{ data: HuddleRoom | null; error: any }> {
  const { data, error } = await supabase
    .from('huddle_rooms')
    .select(`
      *,
      members:huddle_members(
        user_id,
        role,
        notifications,
        user:profiles(id, full_name, avatar_url, email)
      )
    `)
    .eq('id', roomId)
    .single();

  return { data, error };
}

export async function createRoom(request: CreateRoomRequest): Promise<{ data: HuddleRoom | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };

  // Generate unique slug from name for channels (add short random suffix to prevent conflicts)
  const baseSlug = request.name 
    ? request.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : null;
  const uniqueSuffix = Math.random().toString(36).substring(2, 6);
  const slug = baseSlug ? `${baseSlug}-${uniqueSuffix}` : null;

  const { data: room, error: roomError } = await supabase
    .from('huddle_rooms')
    .insert({
      workspace_id: request.workspace_id,
      type: request.type,
      name: request.name || null,
      slug: request.type === 'channel' ? slug : null,
      description: request.description || null,
      is_private: request.is_private || request.type === 'dm',
      created_by: user.id,
      settings: {
        ai_allowed: true,
        auto_summarize: false,
        ai_can_write: false,
        retention_days: null,
        ...request.settings,
      },
    })
    .select()
    .single();

  if (roomError) return { data: null, error: roomError };

  // Add creator as admin
  await supabase
    .from('huddle_members')
    .insert({
      room_id: room.id,
      workspace_id: request.workspace_id,
      user_id: user.id,
      role: 'admin',
    });

  // Add other members if specified
  if (request.member_ids?.length) {
    const otherMembers = request.member_ids.filter(id => id !== user.id);
    if (otherMembers.length > 0) {
      await supabase
        .from('huddle_members')
        .insert(otherMembers.map(userId => ({
          room_id: room.id,
          workspace_id: request.workspace_id,
          user_id: userId,
          role: 'member',
        })));
    }
  }

  return { data: room, error: null };
}

/**
 * Get or create a DM room atomically using RPC
 * Falls back to client-side logic if RPC not available
 */
export async function getOrCreateDMRoom(workspaceId: string, userIds: string[]): Promise<{ data: { room_id: string } | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };

  // Sort user IDs for consistent lookup
  const sortedUserIds = [...userIds].sort();
  
  try {
    // Try RPC first (atomic, race-condition safe)
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_or_create_dm_room', {
        p_workspace_id: workspaceId,
        p_user_ids: sortedUserIds,
        p_created_by: user.id
      });

    if (!rpcError && rpcResult) {
      return { data: { room_id: rpcResult }, error: null };
    }

    // Log RPC error but continue with fallback
    if (rpcError) {
      console.warn('[Huddle] RPC get_or_create_dm_room not available, using fallback:', rpcError.message);
    }

    // Fallback: Client-side logic (less safe for races)
    const { data: existingRooms, error: searchError } = await supabase
      .from('huddle_rooms')
      .select(`
        id,
        huddle_members!inner(user_id)
      `)
      .eq('workspace_id', workspaceId)
      .eq('type', 'dm')
      .is('archived_at', null);

    if (searchError) {
      console.error('Error searching for existing DM room:', searchError);
    }

    // Check if any existing room has exactly the same members
    if (existingRooms) {
      for (const room of existingRooms) {
        const roomMemberIds = (room.huddle_members as { user_id: string }[])
          .map(m => m.user_id)
          .sort();
        
        // Check if member lists match exactly
        if (roomMemberIds.length === sortedUserIds.length && 
            roomMemberIds.every((id, idx) => id === sortedUserIds[idx])) {
          return { data: { room_id: room.id }, error: null };
        }
      }
    }

    // No existing room found, create one
    const { data: newRoom, error: createError } = await createRoom({
      workspace_id: workspaceId,
      type: 'dm',
      is_private: true,
      member_ids: userIds,
      settings: {
        ai_allowed: true,
        auto_summarize: false,
        ai_can_write: false,
      },
    });

    if (createError) {
      console.error('Error creating DM room:', createError);
      return { data: null, error: createError };
    }

    if (!newRoom) {
      return { data: null, error: { message: 'Failed to create room' } };
    }

    return { data: { room_id: newRoom.id }, error: null };
  } catch (err) {
    console.error('Unexpected error in getOrCreateDMRoom:', err);
    return { data: null, error: err };
  }
}

export async function updateRoomSettings(roomId: string, settings: Partial<HuddleRoomSettings>): Promise<{ error: any }> {
  const { data: room, error: loadError } = await supabase
    .from('huddle_rooms')
    .select('settings')
    .eq('id', roomId)
    .single();

  if (loadError) return { error: loadError };

  const mergedSettings = { ...(room?.settings || {}), ...settings };

  const { error } = await supabase
    .from('huddle_rooms')
    .update({
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  return { error };
}

export async function archiveRoom(roomId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('huddle_rooms')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', roomId);

  return { error };
}

// ============================================================================
// MEMBERS
// ============================================================================

export async function addRoomMember(roomId: string, userId: string, role: 'member' | 'admin' = 'member'): Promise<{ error: any }> {
  // Get workspace_id from room
  const { data: room } = await supabase
    .from('huddle_rooms')
    .select('workspace_id')
    .eq('id', roomId)
    .single();

  if (!room) return { error: { message: 'Room not found' } };

  const { error } = await supabase
    .from('huddle_members')
    .insert({
      room_id: roomId,
      workspace_id: room.workspace_id,
      user_id: userId,
      role,
    });

  return { error };
}

export async function removeRoomMember(roomId: string, userId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('huddle_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);

  return { error };
}

export async function updateMemberNotifications(
  roomId: string, 
  userId: string, 
  notifications: 'all' | 'mentions' | 'none'
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('huddle_members')
    .update({ notifications })
    .eq('room_id', roomId)
    .eq('user_id', userId);

  return { error };
}

// ============================================================================
// MESSAGES
// ============================================================================

export async function getRoomMessages(
  roomId: string,
  options?: {
    limit?: number;
    before?: string; // message id for pagination
    threadRootId?: string;
  }
): Promise<{ data: HuddleMessage[] | null; error: any }> {
  return withMetrics(`getRoomMessages:${roomId.slice(0, 8)}`, async () => {
  let query = supabase
    .from('huddle_messages')
    .select(`
      *,
      user:profiles!huddle_messages_user_id_fkey(id, full_name, avatar_url),
      reactions:huddle_message_reactions(emoji, user_id, user:profiles(id, full_name))
    `)
    .eq('room_id', roomId)
    .is('deleted_at', null);

  if (options?.threadRootId) {
    // Get thread messages
    query = query.or(`id.eq.${options.threadRootId},thread_root_id.eq.${options.threadRootId}`);
  } else {
    // Get main timeline (exclude thread replies)
    query = query.is('thread_root_id', null);
  }

  if (options?.before) {
    const { data: beforeMsg } = await supabase
      .from('huddle_messages')
      .select('created_at')
      .eq('id', options.before)
      .single();
    
    if (beforeMsg) {
      query = query.lt('created_at', beforeMsg.created_at);
    }
  }

  query = query
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);

  const { data, error } = await query;

  // Reverse to get chronological order
  return { data: data?.reverse() || null, error };
  });
}

export async function sendMessage(request: SendMessageRequest): Promise<{ data: HuddleMessage | null; error: any }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: { message: 'Not authenticated' } };

  const startTime = performance.now();
  let lastError: any = null;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if we should back off due to recent rate limits
      if (attempt > 0 || metricsCollector.shouldBackoff()) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/huddle-send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      // Track rate limits
      if (response.status === 429) {
        metricsCollector.recordRateLimit({
          endpoint: 'huddle-send',
          httpStatus: 429,
          retryAfter: parseInt(response.headers.get('Retry-After') || '0') || undefined,
        });
        
        if (attempt < maxRetries) {
          continue; // Retry
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: { message: errorText || 'Failed to send message' } };
      }

      const payload = await response.json();
      
      // Record success metric
      metricsCollector.record({
        queryKey: 'sendMessage',
        duration: Math.round(performance.now() - startTime),
        payloadBytes: new Blob([JSON.stringify(payload)]).size,
        rowCount: 1,
        status: 'success',
      });

      return { data: payload.message || null, error: null };
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        continue; // Retry on network errors
      }
    }
  }

  // Record failure metric
  metricsCollector.record({
    queryKey: 'sendMessage',
    duration: Math.round(performance.now() - startTime),
    payloadBytes: 0,
    rowCount: 0,
    status: 'error',
    errorMessage: lastError?.message,
  });

  return { data: null, error: { message: lastError?.message || 'Failed to send message' } };
}

export async function editMessage(messageId: string, newBody: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('huddle_messages')
    .update({
      body: newBody.trim(),
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  return { error };
}

export async function deleteMessage(messageId: string): Promise<{ error: any }> {
  // Soft delete
  const { error } = await supabase
    .from('huddle_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  return { error };
}

export async function pinMessage(messageId: string, pinned: boolean): Promise<{ error: any }> {
  const { error } = await supabase
    .from('huddle_messages')
    .update({ is_pinned: pinned })
    .eq('id', messageId);

  return { error };
}

// ============================================================================
// REACTIONS
// ============================================================================

export async function addReaction(messageId: string, emoji: string): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  const { error } = await supabase
    .from('huddle_message_reactions')
    .insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    });

  return { error };
}

export async function removeReaction(messageId: string, emoji: string): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  const { error } = await supabase
    .from('huddle_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji);

  return { error };
}

// ============================================================================
// READ RECEIPTS / UNREAD
// ============================================================================

export async function getUnreadCounts(workspaceId: string): Promise<{ data: Record<string, number> | null; error: any }> {
  const { data, error } = await supabase
    .rpc('get_huddle_unread_counts', { p_workspace_id: workspaceId });

  if (error) return { data: null, error };

  // Convert array to object
  const counts: Record<string, number> = {};
  (data || []).forEach((row: { room_id: string; unread_count: number }) => {
    counts[row.room_id] = row.unread_count;
  });

  return { data: counts, error: null };
}

export async function markRoomAsRead(roomId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .rpc('mark_huddle_room_read', { p_room_id: roomId });

  return { error };
}

// ============================================================================
// AI INTEGRATION
// ============================================================================

export async function invokeAI(
  request: AIRunRequest,
  onEvent: (event: AIStreamEvent) => void,
  abortSignal?: AbortSignal
): Promise<{ error: any }> {
  console.log('[huddleService] invokeAI called', { roomId: request.room_id, prompt: request.prompt?.substring(0, 50) });
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[huddleService] No session found');
      return { error: { message: 'Not authenticated' } };
    }
    console.log('[huddleService] Session found, calling huddle-ai-run...');

    // Create abort controller that can be triggered externally
    const controller = new AbortController();
    
    // Link external abort signal if provided
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => controller.abort());
    }
    
    // Set a client-side timeout as backup (5 minutes max)
    const timeoutId = setTimeout(() => {
      controller.abort();
      onEvent({ type: 'error', error: 'Request timed out. Please try again.' });
    }, 5 * 60 * 1000);

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/huddle-ai-run`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    console.log('[huddleService] Response received', { ok: response.ok, status: response.status });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[huddleService] Error response:', errorText);
      return { error: { message: errorText } };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.error('[huddleService] No response stream');
      return { error: { message: 'No response stream' } };
    }

    console.log('[huddleService] Starting to read stream...');
    const decoder = new TextDecoder();
    let buffer = '';
    let lastHeartbeat = Date.now();
    let eventCount = 0;
    
    // Heartbeat check interval - if no activity for 30s, consider it stale
    const HEARTBEAT_TIMEOUT = 30000;

    while (true) {
      // Check if aborted
      if (controller.signal.aborted) {
        reader.cancel();
        return { error: { message: 'Request cancelled' } };
      }
      
      const { done, value } = await reader.read();
      if (done) {
        console.log('[huddleService] Stream done, total events:', eventCount);
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      console.log('[huddleService] Received chunk:', chunk.substring(0, 200));
      buffer += chunk;
      lastHeartbeat = Date.now();
      
      // Process complete lines only
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) line in buffer
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          eventCount++;
          console.log('[huddleService] Event received:', data.type, data);
          
          // Handle heartbeat events (don't surface to UI)
          if (data.type === 'heartbeat') {
            lastHeartbeat = Date.now();
            continue;
          }
          
          // Handle cancellation
          if (data.type === 'cancelled') {
            return { error: { message: 'Request was cancelled' } };
          }
          
          onEvent(data);
        } catch (e) {
          console.warn('[huddleService] Failed to parse line:', line, e);
        }
      }
    }
    
    // Process any remaining buffer content
    if (buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(6));
        if (data.type !== 'heartbeat') {
          onEvent(data);
        }
      } catch {
        // Skip unparseable lines
      }
    }

    return { error: null };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { error: { message: 'Request cancelled' } };
    }
    return { error: { message: error.message } };
  }
}

// ============================================================================
// SUMMARIES
// ============================================================================

export async function getRoomSummaries(roomId: string): Promise<{ data: HuddleSummary[] | null; error: any }> {
  const { data, error } = await supabase
    .from('huddle_summaries')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function getPinnedSummaries(roomId: string): Promise<{ data: HuddleSummary[] | null; error: any }> {
  const { data, error } = await supabase
    .from('huddle_summaries')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_pinned', true)
    .order('created_at', { ascending: false });

  return { data, error };
}

// ============================================================================
// SEARCH
// ============================================================================

export async function searchMessages(
  workspaceId: string,
  query: string,
  options?: {
    roomId?: string;
    limit?: number;
  }
): Promise<{ data: HuddleMessage[] | null; error: any }> {
  let dbQuery = supabase
    .from('huddle_messages')
    .select(`
      *,
      user:profiles!huddle_messages_user_id_fkey(id, full_name, avatar_url),
      room:huddle_rooms(id, name, slug, type)
    `)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .textSearch('body', query);

  if (options?.roomId) {
    dbQuery = dbQuery.eq('room_id', options.roomId);
  }

  dbQuery = dbQuery
    .order('created_at', { ascending: false })
    .limit(options?.limit || 20);

  const { data, error } = await dbQuery;
  return { data, error };
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

// Import shared profile cache
import { profileCache } from '../lib/utils/profileCache';

/**
 * Preload users into cache (call when room opens)
 */
export async function preloadRoomUsers(roomId: string): Promise<void> {
  try {
    const { data: members } = await supabase
      .from('huddle_members')
      .select('user:profiles(id, full_name, avatar_url, email)')
      .eq('room_id', roomId);

    if (members) {
      for (const member of members) {
        const user = member.user as { id: string; full_name: string | null; avatar_url: string | null; email?: string | null } | null;
        if (user?.id) {
          profileCache.set({
            id: user.id,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            email: user.email,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Huddle] Failed to preload room users:', err);
  }
}

/**
 * Clear user cache (call on logout or workspace switch)
 * @deprecated Use profileCache.clear() directly
 */
export function clearUserCache(): void {
  profileCache.clear();
}

export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (message: HuddleMessage) => void,
  onDelete: (messageId: string) => void
) {
  return supabase
    .channel(`huddle:messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'huddle_messages',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const newMsg = payload.new as any;
        
        // Try to use cached profile first to avoid per-message DB query
        const cachedProfile = newMsg.user_id ? profileCache.get(newMsg.user_id) : null;
        
        if (cachedProfile || !newMsg.user_id) {
          // Use cached profile or AI message (no user)
          onMessage({
            ...newMsg,
            user: cachedProfile || null,
          } as HuddleMessage);
          return;
        }

        // Fallback: Fetch user and cache for future messages
        const { data, error } = await supabase
          .from('huddle_messages')
          .select(`
            *,
            user:profiles!huddle_messages_user_id_fkey(id, full_name, avatar_url)
          `)
          .eq('id', newMsg.id)
          .single();

        if (error) {
          console.error('[Huddle Realtime] Error fetching message:', error);
          // Still emit the message without user data
          onMessage(newMsg as HuddleMessage);
          return;
        }

        // Cache the user for future messages
        if (data?.user && typeof data.user === 'object' && 'id' in data.user) {
          const userData = data.user as { id: string; full_name: string | null; avatar_url: string | null };
          profileCache.set(userData.id, userData);
        }

        if (data) {
          onMessage(data);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'huddle_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new.deleted_at) {
          onDelete(payload.new.id);
        }
      }
    )
    .subscribe();
}

export function subscribeToTypingIndicators(
  roomId: string,
  userId: string,
  onTypingChange: (typingUsers: { id: string; name: string }[]) => void
) {
  const channel = supabase.channel(`huddle:typing:${roomId}`, {
    config: { presence: { key: userId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const typing: { id: string; name: string }[] = [];
      
      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (presence.typing && presence.user_id !== userId) {
            typing.push({ id: presence.user_id, name: presence.user_name });
          }
        });
      });

      onTypingChange(typing);
    })
    .subscribe();

  return {
    channel,
    setTyping: (typing: boolean, userName: string) => {
      channel.track({ typing, user_id: userId, user_name: userName });
    },
    unsubscribe: () => channel.unsubscribe(),
  };
}

// ============================================================================
// WORKSPACE MEMBERS (for user picker)
// ============================================================================

export async function getWorkspaceMembers(workspaceId: string): Promise<{ data: any[] | null; error: any }> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      role,
      user:profiles(id, full_name, avatar_url, email)
    `)
    .eq('workspace_id', workspaceId);

  return { data, error };
}
