// services/huddleService.ts
// Service layer for Huddle chat functionality

import { supabase } from '../lib/supabase';
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

export async function getWorkspaceRooms(workspaceId: string): Promise<{ data: HuddleRoom[] | null; error: any }> {
  const { data, error } = await supabase
    .from('huddle_rooms')
    .select(`
      *,
      members:huddle_members(
        user_id,
        role,
        user:profiles(id, full_name, avatar_url)
      )
    `)
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  return { data, error };
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

export async function getOrCreateDMRoom(workspaceId: string, userIds: string[]): Promise<{ data: { room_id: string } | null; error: any }> {
  const { data, error } = await supabase
    .rpc('get_or_create_dm_room', {
      p_workspace_id: workspaceId,
      p_user_ids: userIds,
    });

  return { data: data ? { room_id: data } : null, error };
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
}

export async function sendMessage(request: SendMessageRequest): Promise<{ data: HuddleMessage | null; error: any }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: { message: 'Not authenticated' } };

  try {
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

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: { message: errorText || 'Failed to send message' } };
    }

    const payload = await response.json();
    return { data: payload.message || null, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
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
  onEvent: (event: AIStreamEvent) => void
): Promise<{ error: any }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: { message: 'Not authenticated' } };

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/huddle-ai-run`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { error: { message: errorText } };
    }

    const reader = response.body?.getReader();
    if (!reader) return { error: { message: 'No response stream' } };

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));
          onEvent(data);
        } catch {
          // Skip unparseable lines
        }
      }
    }

    return { error: null };
  } catch (error: any) {
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
        // Fetch full message with user
        const { data } = await supabase
          .from('huddle_messages')
          .select(`
            *,
            user:profiles!huddle_messages_user_id_fkey(id, full_name, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();

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
