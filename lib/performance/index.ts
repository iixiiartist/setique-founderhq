/**
 * Performance Utilities Index
 * 
 * Central export for all performance optimization utilities.
 * Import from 'lib/performance' for:
 * - Query key management
 * - Cursor-based pagination
 * - Rate limiting & mutation queues
 * - Realtime channel management
 * - Observability & metrics
 * - Virtual list rendering
 */

// =============================================================================
// Query Keys & Cache Management
// =============================================================================

export { 
  queryKeys, 
  staleTimes, 
  gcTimes,
  retryConfig,
  invalidateMatchers,
  createQueryDefaults,
  type QueryKeys,
} from '../queryKeys';

// =============================================================================
// Aggregated Server Queries
// =============================================================================

export {
  useDashboardSummary,
  useCrmOverview,
  useTaskSummary,
  useHuddleSidebarData,
  useDocumentLibrarySummary,
  useMessagesCursor,
  usePrefetchDashboard,
  usePrefetchCrm,
  usePrefetchHuddle,
  type DashboardSummary,
  type CrmOverview,
  type TaskSummary,
  type HuddleSidebarData,
  type HuddleSidebarRoom,
  type DocumentLibrarySummary,
  type CursorMessage,
  type CursorMessagesResult,
} from '../hooks/useAggregatedQueries';

// =============================================================================
// Cursor-Based Pagination
// =============================================================================

export {
  useCursorPagination,
  useInfiniteScroll,
  useScrollRestoration,
  createCursor,
  parseCursor,
  compareCursors,
  buildKeysetQuery,
  processKeysetResults,
  type CursorPage,
  type CursorPaginationOptions,
  type UseCursorPaginationResult,
  type UseInfiniteScrollOptions,
} from '../utils/cursorPagination';

// =============================================================================
// Rate Limiting & Mutation Queue
// =============================================================================

export {
  MutationQueue,
  useRateLimitedMutation,
  withRateLimit,
  throttle,
  throttleLeading,
  debounceAsync,
  createBatcher,
  type RateLimitConfig,
  type QueuedMutation,
  type RateLimiterState,
  type BatchConfig,
} from '../utils/rateLimiting';

// =============================================================================
// Realtime Channel Management
// =============================================================================

export {
  realtimeManager,
  useRealtimeChannel,
  useTableChanges,
  useRoomMessages,
  usePresence,
  useTypingIndicator,
  type ChannelConfig,
} from '../utils/realtimeManager';

// =============================================================================
// Observability & Metrics
// =============================================================================

export {
  metricsCollector,
  useMetrics,
  useRenderMetrics,
  createMetricsQueryClient,
  startNetworkObserver,
  type QueryMetric,
  type MetricsSummary,
  type PerformanceThresholds,
  type NetworkStats,
} from '../utils/observability';

// =============================================================================
// Virtual List Rendering
// =============================================================================

export {
  useVirtualList,
  useInfiniteVirtualList,
  useMessageList,
  useVirtualListMetrics,
  WindowedScroll,
  WindowedInfiniteScroll,
  createLazyComponent,
  type VirtualItem,
  type VirtualListConfig,
  type UseVirtualListOptions,
  type UseVirtualListResult,
  type UseInfiniteVirtualListOptions,
  type MessageItem,
  type WindowedScrollProps,
} from '../utils/virtualList';

// =============================================================================
// Existing Performance Hooks
// =============================================================================

export {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useMemoizedCallback,
  useOptimizedList,
  useIntersectionObserver,
  useOptimizedSearch,
} from '../hooks/usePerformance';

// =============================================================================
// Usage Examples & Documentation
// =============================================================================

/**
 * USAGE EXAMPLES:
 * 
 * 1. Dashboard with server-side aggregation:
 * ```tsx
 * import { useDashboardSummary } from '@/lib/performance';
 * 
 * function Dashboard() {
 *   const { data: summary } = useDashboardSummary(workspaceId);
 *   // Single query replaces multiple client-side fetches
 * }
 * ```
 * 
 * 2. Infinite scroll with cursor pagination:
 * ```tsx
 * import { useCursorPagination, WindowedInfiniteScroll } from '@/lib/performance';
 * 
 * function MessageList() {
 *   const { allItems, fetchNextPage, hasNextPage, isLoading } = useCursorPagination(
 *     ['messages', roomId],
 *     async (cursor, limit) => fetchMessages(roomId, cursor, limit),
 *     { limit: 50 }
 *   );
 * 
 *   return (
 *     <WindowedInfiniteScroll
 *       items={allItems}
 *       itemHeight={60}
 *       renderItem={(msg) => <MessageRow message={msg} />}
 *       loadMore={fetchNextPage}
 *       hasMore={hasNextPage}
 *       isLoading={isLoading}
 *     />
 *   );
 * }
 * ```
 * 
 * 3. Rate-limited mutations:
 * ```tsx
 * import { withRateLimit } from '@/lib/performance';
 * 
 * const sendMessage = withRateLimit(
 *   async (content: string) => api.sendMessage(content),
 *   { maxTokens: 10, refillRate: 1, refillInterval: 1000 }
 * );
 * ```
 * 
 * 4. Managed realtime channels:
 * ```tsx
 * import { useRealtimeChannel, usePresence } from '@/lib/performance';
 * 
 * function ChatRoom({ roomId }) {
 *   useRealtimeChannel({
 *     channelName: `room:${roomId}`,
 *     event: 'new_message',
 *     callback: (payload) => addMessage(payload.new),
 *   });
 * 
 *   const { presenceState, updatePresence } = usePresence({
 *     channelName: `room:${roomId}`,
 *     userId,
 *     debounceMs: 2000,
 *   });
 * }
 * ```
 */

export const performanceUtils = {
  version: '1.0.0',
  description: 'Performance optimization utilities for Setique Founder Dashboard',
};
