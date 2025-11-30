// hooks/useHuddle.ts
// React Query hooks for Huddle chat functionality

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as huddleService from '../services/huddleService';
import type {
  HuddleRoom,
  HuddleMessage,
  HuddleSummary,
  CreateRoomRequest,
  SendMessageRequest,
  AIRunRequest,
  AIStreamEvent,
  HuddleRoomSettings,
} from '../types/huddle';

// ============================================================================
// ROOMS
// ============================================================================

export function useHuddleRooms(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['huddle', 'rooms', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await huddleService.getWorkspaceRooms(workspaceId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
    staleTime: 30000,
  });
}

export function useHuddleRoom(roomId: string | undefined) {
  return useQuery({
    queryKey: ['huddle', 'room', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const { data, error } = await huddleService.getRoom(roomId);
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateRoomRequest) => {
      const { data, error } = await huddleService.createRoom(request);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'rooms', variables.workspace_id] });
    },
  });
}

export function useGetOrCreateDM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, userIds }: { workspaceId: string; userIds: string[] }) => {
      const { data, error } = await huddleService.getOrCreateDMRoom(workspaceId, userIds);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'rooms', variables.workspaceId] });
    },
  });
}

export function useUpdateRoomSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, settings }: { roomId: string; settings: Partial<HuddleRoomSettings> }) => {
      const { error } = await huddleService.updateRoomSettings(roomId, settings);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'room', variables.roomId] });
    },
  });
}

export function useArchiveRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await huddleService.archiveRoom(roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'rooms'] });
    },
  });
}

// ============================================================================
// MEMBERS
// ============================================================================

export function useAddRoomMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, userId, role }: { roomId: string; userId: string; role?: 'member' | 'admin' }) => {
      const { error } = await huddleService.addRoomMember(roomId, userId, role);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'room', variables.roomId] });
    },
  });
}

export function useRemoveRoomMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: string; userId: string }) => {
      const { error } = await huddleService.removeRoomMember(roomId, userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'room', variables.roomId] });
    },
  });
}

// ============================================================================
// MESSAGES
// ============================================================================

export function useHuddleMessages(roomId: string | undefined, threadRootId?: string) {
  return useQuery({
    queryKey: ['huddle', 'messages', roomId, threadRootId || 'main'],
    queryFn: async () => {
      if (!roomId) return [];
      const { data, error } = await huddleService.getRoomMessages(roomId, { threadRootId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!roomId,
    staleTime: 10000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SendMessageRequest) => {
      const { data, error } = await huddleService.sendMessage(request);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate main timeline and thread if replying
      queryClient.invalidateQueries({ queryKey: ['huddle', 'messages', variables.room_id, 'main'] });
      if (variables.thread_root_id) {
        queryClient.invalidateQueries({ queryKey: ['huddle', 'messages', variables.room_id, variables.thread_root_id] });
      }
      // Update room list for last_message_at
      queryClient.invalidateQueries({ queryKey: ['huddle', 'rooms'] });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, newBody }: { messageId: string; newBody: string }) => {
      const { error } = await huddleService.editMessage(messageId, newBody);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'messages'] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await huddleService.deleteMessage(messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'messages'] });
    },
  });
}

export function usePinMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, pinned }: { messageId: string; pinned: boolean }) => {
      const { error } = await huddleService.pinMessage(messageId, pinned);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'messages'] });
    },
  });
}

// ============================================================================
// REACTIONS
// ============================================================================

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { error } = await huddleService.addReaction(messageId, emoji);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'messages'] });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { error } = await huddleService.removeReaction(messageId, emoji);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'messages'] });
    },
  });
}

// ============================================================================
// UNREAD / READ RECEIPTS
// ============================================================================

export function useUnreadCounts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['huddle', 'unread', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return {};
      const { data, error } = await huddleService.getUnreadCounts(workspaceId);
      if (error) throw error;
      return data || {};
    },
    enabled: !!workspaceId,
    staleTime: 15000,
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await huddleService.markRoomAsRead(roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'unread'] });
    },
  });
}

// ============================================================================
// AI INTEGRATION
// ============================================================================

export function useInvokeAI() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const [webSources, setWebSources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const invoke = useCallback(async (request: AIRunRequest) => {
    setIsStreaming(true);
    setStreamContent('');
    setToolCalls([]);
    setWebSources([]);
    setError(null);

    const { error } = await huddleService.invokeAI(request, (event: AIStreamEvent) => {
      switch (event.type) {
        case 'content':
          setStreamContent(prev => prev + (event.content || ''));
          break;
        case 'tool_result':
          setToolCalls(prev => [...prev, { name: event.tool, result: event.result }]);
          break;
        case 'complete':
          setIsStreaming(false);
          if (event.tool_calls) setToolCalls(event.tool_calls);
          if (event.web_sources) setWebSources(event.web_sources);
          // Refresh messages - invalidate both main timeline and thread (if applicable)
          queryClient.invalidateQueries({ queryKey: ['huddle', 'messages', request.room_id, 'main'] });
          if (request.thread_root_id) {
            queryClient.invalidateQueries({ queryKey: ['huddle', 'messages', request.room_id, request.thread_root_id] });
          }
          break;
        case 'error':
          setError(event.error || 'Unknown error');
          setIsStreaming(false);
          break;
      }
    });

    if (error) {
      setError(error.message);
      setIsStreaming(false);
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setIsStreaming(false);
    setStreamContent('');
    setToolCalls([]);
    setWebSources([]);
    setError(null);
  }, []);

  return {
    invoke,
    reset,
    isStreaming,
    streamContent,
    toolCalls,
    webSources,
    error,
  };
}

// ============================================================================
// SUMMARIES
// ============================================================================

export function useRoomSummaries(roomId: string | undefined) {
  return useQuery({
    queryKey: ['huddle', 'summaries', roomId],
    queryFn: async () => {
      if (!roomId) return [];
      const { data, error } = await huddleService.getRoomSummaries(roomId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!roomId,
  });
}

export function usePinnedSummaries(roomId: string | undefined) {
  return useQuery({
    queryKey: ['huddle', 'summaries', roomId, 'pinned'],
    queryFn: async () => {
      if (!roomId) return [];
      const { data, error } = await huddleService.getPinnedSummaries(roomId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!roomId,
  });
}

// ============================================================================
// SEARCH
// ============================================================================

export function useSearchMessages(workspaceId: string | undefined, query: string, roomId?: string) {
  return useQuery({
    queryKey: ['huddle', 'search', workspaceId, query, roomId],
    queryFn: async () => {
      if (!workspaceId || !query.trim()) return [];
      const { data, error } = await huddleService.searchMessages(workspaceId, query, { roomId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId && query.trim().length >= 2,
  });
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export function useRealtimeMessages(
  roomId: string | undefined,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roomId || !enabled) return;

    const subscription = huddleService.subscribeToRoomMessages(
      roomId,
      (message) => {
        // Add new message to cache
        queryClient.setQueryData<HuddleMessage[]>(
          ['huddle', 'messages', roomId, message.thread_root_id || 'main'],
          (old) => {
            if (!old) return [message];
            // Check if message already exists (avoid duplicates)
            if (old.some(m => m.id === message.id)) return old;
            return [...old, message];
          }
        );
        // Invalidate unread counts
        queryClient.invalidateQueries({ queryKey: ['huddle', 'unread'] });
        // Invalidate rooms for last_message_at
        queryClient.invalidateQueries({ queryKey: ['huddle', 'rooms'] });
      },
      (messageId) => {
        // Remove deleted message from cache
        queryClient.setQueryData<HuddleMessage[]>(
          ['huddle', 'messages', roomId, 'main'],
          (old) => old?.filter(m => m.id !== messageId) || []
        );
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId, enabled, queryClient]);
}

export function useTypingIndicators(
  roomId: string | undefined,
  userId: string | undefined,
  userName: string
) {
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
  const channelRef = useRef<ReturnType<typeof huddleService.subscribeToTypingIndicators> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    channelRef.current = huddleService.subscribeToTypingIndicators(
      roomId,
      userId,
      setTypingUsers
    );

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [roomId, userId]);

  const setTyping = useCallback((typing: boolean) => {
    if (!channelRef.current) return;

    channelRef.current.setTyping(typing, userName);

    // Auto-clear typing after 3 seconds of inactivity
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.setTyping(false, userName);
      }, 3000);
    }
  }, [userName]);

  return { typingUsers, setTyping };
}

// ============================================================================
// WORKSPACE MEMBERS
// ============================================================================

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace', 'members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await huddleService.getWorkspaceMembers(workspaceId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
    staleTime: 60000,
  });
}
