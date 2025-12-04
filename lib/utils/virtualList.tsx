/**
 * Virtual List Utilities
 * 
 * Efficient rendering for long lists using windowing/virtualization.
 * Only renders items visible in the viewport.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo, ReactNode, ReactElement } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface VirtualItem<T> {
  item: T;
  index: number;
  style: {
    position: 'absolute';
    top: number;
    left: number;
    right: number;
    height: number;
  };
}

export interface VirtualListConfig {
  /** Fixed item height (or estimated height for variable) */
  itemHeight: number;
  /** Number of items to render outside viewport (buffer) */
  overscan?: number;
  /** Enable variable height items */
  variableHeight?: boolean;
}

export interface VirtualListState {
  scrollTop: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  totalHeight: number;
}

export interface UseVirtualListOptions<T> extends VirtualListConfig {
  items: T[];
  /** Get height for specific item (for variable height mode) */
  getItemHeight?: (item: T, index: number) => number;
}

export interface UseVirtualListResult<T> {
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  isItemVisible: (index: number) => boolean;
}

// =============================================================================
// Height Cache for Variable Height Items
// =============================================================================

class HeightCache {
  private cache: Map<number, number> = new Map();
  private defaultHeight: number;

  constructor(defaultHeight: number) {
    this.defaultHeight = defaultHeight;
  }

  get(index: number): number {
    return this.cache.get(index) ?? this.defaultHeight;
  }

  set(index: number, height: number): void {
    this.cache.set(index, height);
  }

  has(index: number): boolean {
    return this.cache.has(index);
  }

  getOffsetForIndex(index: number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this.get(i);
    }
    return offset;
  }

  getTotalHeight(itemCount: number): number {
    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      total += this.get(i);
    }
    return total;
  }

  getIndexForOffset(offset: number, itemCount: number): number {
    let currentOffset = 0;
    for (let i = 0; i < itemCount; i++) {
      const height = this.get(i);
      if (currentOffset + height > offset) {
        return i;
      }
      currentOffset += height;
    }
    return itemCount - 1;
  }

  clear(): void {
    this.cache.clear();
  }
}

// =============================================================================
// Use Virtual List Hook
// =============================================================================

/**
 * Hook for virtualized list rendering
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  variableHeight = false,
  getItemHeight,
}: UseVirtualListOptions<T>): UseVirtualListResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const heightCache = useMemo(() => new HeightCache(itemHeight), [itemHeight]);

  // Update height cache for variable height items
  useEffect(() => {
    if (variableHeight && getItemHeight) {
      items.forEach((item, index) => {
        const height = getItemHeight(item, index);
        heightCache.set(index, height);
      });
    }
  }, [items, variableHeight, getItemHeight, heightCache]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (variableHeight) {
      return heightCache.getTotalHeight(items.length);
    }
    return items.length * itemHeight;
  }, [items.length, itemHeight, variableHeight, heightCache]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (variableHeight) {
      const start = Math.max(0, heightCache.getIndexForOffset(scrollTop, items.length) - overscan);
      const visibleEnd = heightCache.getIndexForOffset(scrollTop + containerHeight, items.length);
      const end = Math.min(items.length - 1, visibleEnd + overscan);
      return { startIndex: start, endIndex: end };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, containerHeight, items.length, itemHeight, overscan, variableHeight, heightCache]);

  // Generate virtual items
  const virtualItems = useMemo<VirtualItem<T>[]>(() => {
    const result: VirtualItem<T>[] = [];
    
    for (let index = startIndex; index <= endIndex; index++) {
      if (index >= 0 && index < items.length) {
        const top = variableHeight
          ? heightCache.getOffsetForIndex(index)
          : index * itemHeight;
        const height = variableHeight
          ? heightCache.get(index)
          : itemHeight;

        result.push({
          item: items[index],
          index,
          style: {
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height,
          },
        });
      }
    }
    
    return result;
  }, [items, startIndex, endIndex, itemHeight, variableHeight, heightCache]);

  // Handle scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    container.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(container);

    // Initial measurement
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    if (!container) return;

    const top = variableHeight
      ? heightCache.getOffsetForIndex(index)
      : index * itemHeight;

    container.scrollTo({ top, behavior });
  }, [itemHeight, variableHeight, heightCache]);

  // Check if item is visible
  const isItemVisible = useCallback((index: number): boolean => {
    return index >= startIndex && index <= endIndex;
  }, [startIndex, endIndex]);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    scrollToIndex,
    isItemVisible,
  };
}

// =============================================================================
// Infinite Scroll Virtual List
// =============================================================================

export interface UseInfiniteVirtualListOptions<T> extends UseVirtualListOptions<T> {
  /** Load more items */
  loadMore: () => void | Promise<void>;
  /** Whether more items are available */
  hasMore: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Distance from bottom to trigger load (in pixels) */
  loadThreshold?: number;
}

export interface UseInfiniteVirtualListResult<T> extends UseVirtualListResult<T> {
  isLoading: boolean;
  hasMore: boolean;
}

/**
 * Hook for virtualized infinite scroll list
 */
export function useInfiniteVirtualList<T>({
  items,
  loadMore,
  hasMore,
  isLoading,
  loadThreshold = 200,
  ...options
}: UseInfiniteVirtualListOptions<T>): UseInfiniteVirtualListResult<T> {
  const result = useVirtualList({ items, ...options });
  const { containerRef, totalHeight } = result;

  // Trigger load more when scrolled near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isLoading || !hasMore) return;

      const { scrollTop, clientHeight } = container;
      const distanceFromBottom = totalHeight - scrollTop - clientHeight;

      if (distanceFromBottom < loadThreshold) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, totalHeight, loadMore, hasMore, isLoading, loadThreshold]);

  return {
    ...result,
    isLoading,
    hasMore,
  };
}

// =============================================================================
// Message List Virtualizer (Optimized for Chat)
// =============================================================================

export interface MessageItem {
  id: string;
  content: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface UseMessageListOptions<T extends MessageItem> {
  messages: T[];
  estimatedItemHeight?: number;
  overscan?: number;
}

/**
 * Specialized virtualizer for message lists
 * Handles reverse scroll (newest at bottom) and variable heights
 */
export function useMessageList<T extends MessageItem>({
  messages,
  estimatedItemHeight = 60,
  overscan = 10,
}: UseMessageListOptions<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const heightCache = useMemo(() => new HeightCache(estimatedItemHeight), [estimatedItemHeight]);
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());

  // Measure actual heights after render
  const measureItem = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      const height = element.getBoundingClientRect().height;
      if (height > 0) {
        measuredHeightsRef.current.set(id, height);
        const index = messages.findIndex(m => m.id === id);
        if (index !== -1) {
          heightCache.set(index, height);
        }
      }
    }
  }, [messages, heightCache]);

  // Calculate visible range
  const totalHeight = heightCache.getTotalHeight(messages.length);
  
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, heightCache.getIndexForOffset(scrollTop, messages.length) - overscan);
    const visibleEnd = heightCache.getIndexForOffset(scrollTop + containerHeight, messages.length);
    const end = Math.min(messages.length - 1, visibleEnd + overscan);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, containerHeight, messages.length, overscan, heightCache]);

  // Generate virtual messages
  const virtualMessages = useMemo<VirtualItem<T>[]>(() => {
    const result: VirtualItem<T>[] = [];
    
    for (let index = startIndex; index <= endIndex; index++) {
      if (index >= 0 && index < messages.length) {
        const message = messages[index];
        const top = heightCache.getOffsetForIndex(index);
        const height = heightCache.get(index);

        result.push({
          item: message,
          index,
          style: {
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height,
          },
        });
      }
    }
    
    return result;
  }, [messages, startIndex, endIndex, heightCache]);

  // Handle scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    container.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(container);

    // Initial measurement
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  // Scroll to bottom (for new messages)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: totalHeight, behavior });
  }, [totalHeight]);

  // Scroll to specific message
  const scrollToMessage = useCallback((messageId: string, behavior: ScrollBehavior = 'auto') => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    const container = containerRef.current;
    if (!container) return;

    const top = heightCache.getOffsetForIndex(index);
    container.scrollTo({ top, behavior });
  }, [messages, heightCache]);

  return {
    containerRef,
    virtualMessages,
    totalHeight,
    measureItem,
    scrollToBottom,
    scrollToMessage,
    isAtBottom: scrollTop + containerHeight >= totalHeight - 50,
  };
}

// =============================================================================
// Window Virtual Scroll Component Props
// =============================================================================

export interface WindowedScrollProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  loadMore?: () => void | Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
  loadingIndicator?: ReactNode;
  className?: string;
}

/**
 * Virtualized infinite scroll component (with load more)
 */
export function WindowedInfiniteScroll<T>(props: WindowedScrollProps<T> & { loadMore: () => void | Promise<void> }): ReactElement {
  const {
    items,
    itemHeight,
    renderItem,
    loadMore,
    hasMore = false,
    isLoading = false,
    loadingIndicator,
    className,
  } = props;
  
  const { virtualItems, totalHeight, containerRef } = useInfiniteVirtualList({
    items,
    itemHeight,
    loadMore,
    hasMore,
    isLoading,
  });

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={className}
      style={{ overflow: 'auto', height: '100%' }}
    >
      <div style={{ height: totalHeight + (isLoading ? 50 : 0), position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loadingIndicator || <span>Loading...</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Virtualized scroll component (simple, no load more)
 */
export function WindowedScroll<T>(props: Omit<WindowedScrollProps<T>, 'loadMore' | 'hasMore' | 'isLoading' | 'loadingIndicator'>): ReactElement {
  const {
    items,
    itemHeight,
    renderItem,
    className,
  } = props;
  
  const { virtualItems, totalHeight, containerRef } = useVirtualList({
    items,
    itemHeight,
  });

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={className}
      style={{ overflow: 'auto', height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Lazy Loading Utilities
// =============================================================================

export interface LazyComponentProps {
  load: () => Promise<{ default: React.ComponentType<unknown> }>;
  fallback?: ReactNode;
}

/**
 * Simple lazy loading wrapper for components
 */
export function createLazyComponent<P extends object>(
  load: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: ReactNode
): React.LazyExoticComponent<React.ComponentType<P>> {
  const LazyComponent = React.lazy(load);
  
  // Note: Wrap with Suspense when using
  // <Suspense fallback={fallback}><LazyComponent /></Suspense>
  
  return LazyComponent;
}

// Pre-built lazy loaders for heavy components
export const lazyComponents = {
  // Example: Charts, editors, etc.
  // Chart: createLazyComponent(() => import('@/components/Chart')),
  // RichEditor: createLazyComponent(() => import('@/components/RichEditor')),
};

// =============================================================================
// Performance Measurement
// =============================================================================

export interface RenderMetrics {
  itemsRendered: number;
  renderTime: number;
  scrollPosition: number;
}

/**
 * Track virtual list render performance
 */
export function useVirtualListMetrics<T>(
  virtualItems: VirtualItem<T>[],
  enabled = true
): RenderMetrics {
  const renderStartTime = useRef(0);
  const [metrics, setMetrics] = useState<RenderMetrics>({
    itemsRendered: 0,
    renderTime: 0,
    scrollPosition: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    if (!enabled) return;
    
    const renderTime = performance.now() - renderStartTime.current;
    
    setMetrics({
      itemsRendered: virtualItems.length,
      renderTime,
      scrollPosition: virtualItems[0]?.index ?? 0,
    });
  }, [virtualItems, enabled]);

  return metrics;
}
