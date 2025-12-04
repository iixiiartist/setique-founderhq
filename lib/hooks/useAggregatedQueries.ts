/**
 * Centralized React Query Hooks for Aggregated Server Data
 * =========================================================
 * These hooks call server-side RPC functions that aggregate data,
 * reducing client-side queries and connection overhead.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys, staleTimes, gcTimes, createQueryDefaults } from '../queryKeys';
import { logger } from '../logger';

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

export interface DashboardSummary {
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  };
  crm: {
    investors: number;
    customers: number;
    partners: number;
    totalContacts: number;
    overdueFollowups: number;
  };
  marketing: {
    activeCampaigns: number;
    pendingItems: number;
    inProgressItems: number;
  };
  documents: {
    total: number;
    recentActivity: number;
  };
  huddle: {
    activeRooms: number;
    unreadTotal: number;
  };
  recentActivity: {
    tasksCreated: number;
    tasksCompleted: number;
    crmItemsCreated: number;
    documentsEdited: number;
  };
  generatedAt: string;
}

/**
 * Fetch aggregated dashboard summary from server
 * Replaces 10+ individual queries with a single RPC call
 */
export function useDashboardSummary(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(workspaceId || ''),
    queryFn: async (): Promise<DashboardSummary | null> => {
      if (!workspaceId) return null;

      logger.info('[useDashboardSummary] Fetching aggregated data for:', workspaceId);
      
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_workspace_id: workspaceId,
      });

      if (error) {
        logger.error('[useDashboardSummary] RPC error:', error);
        throw error;
      }

      return data as DashboardSummary;
    },
    enabled: !!workspaceId,
    ...createQueryDefaults('dashboard'),
    // Refetch on window focus for up-to-date data
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// CRM OVERVIEW
// ============================================================================

export interface CrmOverview {
  pipeline: Record<string, number>;
  byPriority: Record<string, number>;
  metrics: {
    totalItems: number;
    totalContacts: number;
    totalValue: number;
    overdueCount: number;
    upcomingActions: number;
  };
  recentItems: Array<{
    id: string;
    company: string;
    type: string;
    stage: string;
    createdAt: string;
  }>;
  byAssignment: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
}

/**
 * Fetch CRM overview with pipeline stages, metrics, and recent items
 */
export function useCrmOverview(
  workspaceId: string | undefined,
  type?: 'investor' | 'customer' | 'partner'
) {
  return useQuery({
    queryKey: queryKeys.crm.overview(workspaceId || '', type),
    queryFn: async (): Promise<CrmOverview | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_crm_overview', {
        p_workspace_id: workspaceId,
        p_type: type || null,
      });

      if (error) {
        logger.error('[useCrmOverview] RPC error:', error);
        throw error;
      }

      return data as CrmOverview;
    },
    enabled: !!workspaceId,
    ...createQueryDefaults('standard'),
  });
}

// ============================================================================
// TASK SUMMARY
// ============================================================================

export interface TaskSummary {
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  dueDates: {
    overdue: number;
    today: number;
    thisWeek: number;
    later: number;
    noDueDate: number;
  };
  completionTrend: Array<{
    date: string;
    completed: number;
  }>;
}

/**
 * Fetch task summary with breakdowns and completion trends
 */
export function useTaskSummary(
  workspaceId: string | undefined,
  userId?: string
) {
  return useQuery({
    queryKey: queryKeys.tasks.summary(workspaceId || '', userId),
    queryFn: async (): Promise<TaskSummary | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_task_summary', {
        p_workspace_id: workspaceId,
        p_user_id: userId || null,
      });

      if (error) {
        logger.error('[useTaskSummary] RPC error:', error);
        throw error;
      }

      return data as TaskSummary;
    },
    enabled: !!workspaceId,
    ...createQueryDefaults('standard'),
  });
}

// ============================================================================
// HUDDLE SIDEBAR DATA
// ============================================================================

export interface HuddleSidebarRoom {
  id: string;
  type: 'channel' | 'dm';
  name: string | null;
  slug: string | null;
  isPrivate: boolean;
  lastMessageAt: string | null;
  unreadCount: number;
  memberCount: number;
  lastMessage: {
    body: string;
    isAi: boolean;
    createdAt: string;
    userName: string;
  } | null;
}

export interface HuddleSidebarData {
  rooms: HuddleSidebarRoom[];
  totalUnread: number;
}

/**
 * Fetch huddle sidebar data with rooms, unread counts, and last messages
 * Single query replaces separate room list + unread counts + message fetches
 */
export function useHuddleSidebarData(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.huddle.sidebar(workspaceId || ''),
    queryFn: async (): Promise<HuddleSidebarData | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_huddle_sidebar_data', {
        p_workspace_id: workspaceId,
      });

      if (error) {
        logger.error('[useHuddleSidebarData] RPC error:', error);
        throw error;
      }

      return data as HuddleSidebarData;
    },
    enabled: !!workspaceId,
    ...createQueryDefaults('chat'),
    // Poll for updates when tab is focused
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// DOCUMENT LIBRARY SUMMARY
// ============================================================================

export interface DocumentLibrarySummary {
  byModule: Record<string, number>;
  totalDocuments: number;
  recentDocuments: Array<{
    id: string;
    title: string;
    module: string;
    updatedAt: string;
    createdBy: string;
  }>;
  topContributors: Array<{
    userId: string;
    userName: string;
    editCount: number;
  }>;
}

/**
 * Fetch document library summary with module breakdown and recent docs
 */
export function useDocumentLibrarySummary(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.documents.summary(workspaceId || ''),
    queryFn: async (): Promise<DocumentLibrarySummary | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_document_library_summary', {
        p_workspace_id: workspaceId,
      });

      if (error) {
        logger.error('[useDocumentLibrarySummary] RPC error:', error);
        throw error;
      }

      return data as DocumentLibrarySummary;
    },
    enabled: !!workspaceId,
    ...createQueryDefaults('standard'),
  });
}

// ============================================================================
// CURSOR-BASED MESSAGE PAGINATION
// ============================================================================

export interface CursorMessage {
  id: string;
  roomId: string;
  userId: string | null;
  body: string;
  bodyFormat: 'markdown' | 'plain';
  threadRootId: string | null;
  replyCount: number;
  metadata: Record<string, unknown>;
  attachments: unknown[];
  isSystem: boolean;
  isAi: boolean;
  isPinned: boolean;
  createdAt: string;
  editedAt: string | null;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
  reactions: Array<{
    emoji: string;
    userId: string;
    userName: string;
  }>;
}

export interface CursorMessagesResult {
  messages: CursorMessage[];
  hasMore: boolean;
  cursor: string | null;
}

/**
 * Fetch messages with cursor-based pagination
 * More efficient than offset pagination for large message histories
 */
export function useMessagesCursor(
  roomId: string | undefined,
  cursor?: string,
  direction: 'before' | 'after' = 'before',
  limit: number = 50
) {
  return useQuery({
    queryKey: queryKeys.huddle.messagesCursor(roomId || '', cursor),
    queryFn: async (): Promise<CursorMessagesResult | null> => {
      if (!roomId) return null;

      const { data, error } = await supabase.rpc('get_messages_cursor', {
        p_room_id: roomId,
        p_cursor: cursor || null,
        p_limit: limit,
        p_direction: direction,
      });

      if (error) {
        logger.error('[useMessagesCursor] RPC error:', error);
        throw error;
      }

      return data as CursorMessagesResult;
    },
    enabled: !!roomId,
    staleTime: staleTimes.chat,
    gcTime: gcTimes.short,
  });
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * Prefetch dashboard data before navigating to dashboard
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();

  return async (workspaceId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.summary(workspaceId),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_dashboard_summary', {
          p_workspace_id: workspaceId,
        });
        if (error) throw error;
        return data;
      },
      staleTime: staleTimes.dashboard,
    });
  };
}

/**
 * Prefetch CRM data before navigating to CRM tab
 */
export function usePrefetchCrm() {
  const queryClient = useQueryClient();

  return async (workspaceId: string, type?: 'investor' | 'customer' | 'partner') => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.crm.overview(workspaceId, type),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_crm_overview', {
          p_workspace_id: workspaceId,
          p_type: type || null,
        });
        if (error) throw error;
        return data;
      },
      staleTime: staleTimes.standard,
    });
  };
}

/**
 * Prefetch huddle sidebar before navigating to chat
 */
export function usePrefetchHuddle() {
  const queryClient = useQueryClient();

  return async (workspaceId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.huddle.sidebar(workspaceId),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_huddle_sidebar_data', {
          p_workspace_id: workspaceId,
        });
        if (error) throw error;
        return data;
      },
      staleTime: staleTimes.chat,
    });
  };
}
