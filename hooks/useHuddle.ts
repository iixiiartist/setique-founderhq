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
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
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
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      console.log('[useHuddleMessages] Fetching messages for room:', roomId, 'thread:', threadRootId || 'main');
      if (!roomId) return [];
      const { data, error } = await huddleService.getRoomMessages(roomId, { threadRootId });
      if (error) throw error;
      console.log('[useHuddleMessages] Received', data?.length || 0, 'messages');
      return data || [];
    },
    enabled: !!roomId,
    staleTime: 10000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
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
    retry: 2, // Only retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce load
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
  const [moderationStatus, setModerationStatus] = useState<{ blocked?: boolean; reason?: string } | null>(null);
  const queryClient = useQueryClient();
  
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Invalidate caches based on what tool was used
  const invalidateToolCaches = useCallback((toolName: string) => {
    switch (toolName) {
      case 'create_task':
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        break;
      case 'create_contact':
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        break;
      case 'create_account':
        queryClient.invalidateQueries({ queryKey: ['crm'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        break;
      case 'create_deal':
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        break;
      case 'create_expense':
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['financials'] });
        break;
      case 'create_revenue':
        queryClient.invalidateQueries({ queryKey: ['revenue'] });
        queryClient.invalidateQueries({ queryKey: ['financials'] });
        break;
      case 'create_note':
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        break;
      case 'create_calendar_event':
        queryClient.invalidateQueries({ queryKey: ['calendar'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        break;
      case 'create_marketing_campaign':
        queryClient.invalidateQueries({ queryKey: ['marketing'] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        break;
    }
  }, [queryClient]);

  const invoke = useCallback(async (request: AIRunRequest) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsStreaming(true);
    setStreamContent('');
    setToolCalls([]);
    setWebSources([]);
    setError(null);
    setModerationStatus(null);

    const { error } = await huddleService.invokeAI(
      request, 
      (event: AIStreamEvent) => {
        switch (event.type) {
          case 'content':
            setStreamContent(prev => prev + (event.content || ''));
            break;
          case 'tool_result':
            setToolCalls(prev => [...prev, { name: event.tool, result: event.result, error: event.error, cached: event.cached }]);
            // Invalidate relevant caches when tool completes successfully
            if (event.result?.success && event.tool) {
              invalidateToolCaches(event.tool);
            }
            break;
          case 'moderation_blocked':
            setModerationStatus({ blocked: true, reason: event.reason });
            break;
          case 'complete':
            console.log('[useInvokeAI] Complete event received, invalidating queries for room:', request.room_id);
            setIsStreaming(false);
            if (event.tool_calls) {
              setToolCalls(event.tool_calls);
              // Invalidate caches for all completed tools
              event.tool_calls.forEach((tc: any) => {
                if (tc.result?.success) {
                  invalidateToolCaches(tc.name);
                }
              });
            }
            if (event.web_sources) setWebSources(event.web_sources);
            // Refresh messages - invalidate both main timeline and thread (if applicable)
            console.log('[useInvokeAI] Invalidating query key:', ['huddle', 'messages', request.room_id, 'main']);
            queryClient.invalidateQueries({ queryKey: ['huddle', 'messages', request.room_id, 'main'] });
            if (request.thread_root_id) {
              queryClient.invalidateQueries({ queryKey: ['huddle', 'messages', request.room_id, request.thread_root_id] });
            }
            break;
          case 'error':
            setError(event.error || 'Unknown error');
            setIsStreaming(false);
            break;
          case 'cancelled':
            setIsStreaming(false);
            break;
        }
      },
      abortControllerRef.current.signal
    );

    // Always invalidate queries after the stream ends (safety net in case 'complete' event was missed)
    queryClient.invalidateQueries({ queryKey: ['huddle', 'messages', request.room_id, 'main'] });
    if (request.thread_root_id) {
      queryClient.invalidateQueries({ queryKey: ['huddle', 'messages', request.room_id, request.thread_root_id] });
    }
    setIsStreaming(false);

    if (error) {
      setError(error.message);
    }
  }, [queryClient, invalidateToolCaches]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setStreamContent('');
    setToolCalls([]);
    setWebSources([]);
    setError(null);
    setModerationStatus(null);
  }, [cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    invoke,
    cancel,
    reset,
    isStreaming,
    streamContent,
    toolCalls,
    webSources,
    error,
    moderationStatus,
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
  // Track last invalidation time to debounce rapid updates
  const lastInvalidationRef = useRef<number>(0);
  const DEBOUNCE_MS = 2000; // Minimum 2 seconds between invalidations
  
  // Backoff state for error handling
  const backoffRef = useRef({
    attempts: 0,
    nextRetry: 0,
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
  });

  useEffect(() => {
    if (!roomId || !enabled) return;

    let subscription: any = null;
    let retryTimeoutId: NodeJS.Timeout | null = null;
    
    const subscribe = () => {
      // Check if we should wait before retrying
      const now = Date.now();
      if (now < backoffRef.current.nextRetry) {
        const waitTime = backoffRef.current.nextRetry - now;
        console.log(`[Huddle Realtime] Backing off for ${waitTime}ms before retry`);
        retryTimeoutId = setTimeout(subscribe, waitTime);
        return;
      }
      
      subscription = huddleService.subscribeToRoomMessages(
        roomId,
        (message) => {
          // Reset backoff on successful message
          backoffRef.current.attempts = 0;
          backoffRef.current.nextRetry = 0;
          
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
          
          // Debounce invalidations to prevent excessive API calls
          const currentTime = Date.now();
          if (currentTime - lastInvalidationRef.current > DEBOUNCE_MS) {
            lastInvalidationRef.current = currentTime;
            // Invalidate unread counts
            queryClient.invalidateQueries({ queryKey: ['huddle', 'unread'] });
            // Invalidate rooms for last_message_at
            queryClient.invalidateQueries({ queryKey: ['huddle', 'rooms'] });
          }
        },
        (messageId) => {
          // Remove deleted message from cache
          queryClient.setQueryData<HuddleMessage[]>(
            ['huddle', 'messages', roomId, 'main'],
            (old) => old?.filter(m => m.id !== messageId) || []
          );
        }
      );
      
      // Handle subscription errors with exponential backoff
      subscription.on('error', (error: any) => {
        console.error('[Huddle Realtime] Subscription error:', error);
        
        backoffRef.current.attempts++;
        
        if (backoffRef.current.attempts >= backoffRef.current.maxAttempts) {
          console.error('[Huddle Realtime] Max retry attempts reached, giving up');
          return;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(
          backoffRef.current.baseDelay * Math.pow(2, backoffRef.current.attempts - 1),
          backoffRef.current.maxDelay
        );
        backoffRef.current.nextRetry = Date.now() + delay;
        
        console.log(`[Huddle Realtime] Will retry in ${delay}ms (attempt ${backoffRef.current.attempts})`);
        
        // Unsubscribe and retry
        subscription?.unsubscribe();
        retryTimeoutId = setTimeout(subscribe, delay);
      });
      
      // Handle channel closure
      subscription.on('close', () => {
        console.log('[Huddle Realtime] Channel closed');
        // Only retry if we haven't exceeded max attempts
        if (backoffRef.current.attempts < backoffRef.current.maxAttempts) {
          backoffRef.current.attempts++;
          const delay = Math.min(
            backoffRef.current.baseDelay * Math.pow(2, backoffRef.current.attempts - 1),
            backoffRef.current.maxDelay
          );
          retryTimeoutId = setTimeout(subscribe, delay);
        }
      });
    };
    
    subscribe();

    return () => {
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      subscription?.unsubscribe();
      // Reset backoff on cleanup
      backoffRef.current.attempts = 0;
      backoffRef.current.nextRetry = 0;
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
