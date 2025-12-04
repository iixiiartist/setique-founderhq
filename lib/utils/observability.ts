/**
 * Observability and Performance Metrics
 * ======================================
 * Track query sizes, payload bytes, response times, and rate-limit responses.
 * Helps catch performance regressions early.
 */

import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface QueryMetric {
  queryKey: string;
  duration: number; // ms
  payloadBytes: number;
  rowCount: number;
  timestamp: number;
  status: 'success' | 'error' | 'rate-limited';
  errorMessage?: string;
  httpStatus?: number;
}

export interface RateLimitEvent {
  endpoint: string;
  httpStatus: number;
  retryAfter?: number;
  timestamp: number;
}

export interface MetricsSummary {
  totalQueries: number;
  totalErrors: number;
  totalRateLimited: number;
  avgDuration: number;
  p95Duration: number;
  avgPayloadBytes: number;
  totalPayloadBytes: number;
  slowQueries: QueryMetric[];
  largePayloads: QueryMetric[];
  errors: QueryMetric[];
}

export interface PerformanceThresholds {
  /** Duration threshold for slow query warning (ms) */
  slowQueryMs: number;
  /** Payload size threshold for large payload warning (bytes) */
  largePayloadBytes: number;
  /** Row count threshold for large result set warning */
  largeRowCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  slowQueryMs: 2000, // 2 seconds
  largePayloadBytes: 500 * 1024, // 500KB
  largeRowCount: 500,
};

const MAX_METRICS_HISTORY = 1000;
const REPORT_INTERVAL_MS = 60000; // 1 minute
const RATE_LIMIT_ALERT_THRESHOLD = 5; // Alert if 5+ rate limits in a minute

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class MetricsCollector {
  private metrics: QueryMetric[] = [];
  private rateLimitEvents: RateLimitEvent[] = [];
  private thresholds: PerformanceThresholds;
  private reportInterval: NodeJS.Timeout | null = null;
  private onReport?: (summary: MetricsSummary) => void;
  private onRateLimitAlert?: (events: RateLimitEvent[]) => void;
  private enabled: boolean = false;

  constructor(thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Start collecting metrics with periodic reporting
   */
  start(options?: {
    onReport?: (summary: MetricsSummary) => void;
    onRateLimitAlert?: (events: RateLimitEvent[]) => void;
  }) {
    this.enabled = true;
    this.onReport = options?.onReport;
    this.onRateLimitAlert = options?.onRateLimitAlert;
    
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }

    this.reportInterval = setInterval(() => {
      if (this.metrics.length > 0) {
        const summary = this.getSummary();
        this.logSummary(summary);
        if (this.onReport) {
          this.onReport(summary);
        }
      }
      
      // Check for sustained rate limiting
      this.checkRateLimitAlert();
    }, REPORT_INTERVAL_MS);

    logger.info('[Metrics] Started collecting performance metrics');
  }

  /**
   * Stop collecting metrics
   */
  stop() {
    this.enabled = false;
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    logger.info('[Metrics] Stopped collecting performance metrics');
  }

  /**
   * Record a rate limit event
   */
  recordRateLimit(event: Omit<RateLimitEvent, 'timestamp'>) {
    if (!this.enabled) return;

    const fullEvent: RateLimitEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.rateLimitEvents.push(fullEvent);

    // Trim old events
    if (this.rateLimitEvents.length > MAX_METRICS_HISTORY) {
      this.rateLimitEvents = this.rateLimitEvents.slice(-MAX_METRICS_HISTORY);
    }

    logger.warn(`[Metrics] Rate limit hit: ${event.endpoint} (${event.httpStatus})`, {
      retryAfter: event.retryAfter,
    });
  }

  /**
   * Check for sustained rate limiting and alert
   */
  private checkRateLimitAlert() {
    const cutoff = Date.now() - REPORT_INTERVAL_MS;
    const recentEvents = this.rateLimitEvents.filter(e => e.timestamp >= cutoff);

    if (recentEvents.length >= RATE_LIMIT_ALERT_THRESHOLD) {
      logger.error(
        `[Metrics] 🚨 Rate limit alert: ${recentEvents.length} hits in the last minute!`,
        recentEvents.map(e => e.endpoint)
      );
      this.onRateLimitAlert?.(recentEvents);
    }
  }

  /**
   * Get recent rate limit events
   */
  getRecentRateLimits(withinMs: number = REPORT_INTERVAL_MS): RateLimitEvent[] {
    const cutoff = Date.now() - withinMs;
    return this.rateLimitEvents.filter(e => e.timestamp >= cutoff);
  }

  /**
   * Check if we should back off due to recent rate limits
   */
  shouldBackoff(): boolean {
    const recentLimits = this.getRecentRateLimits(30000); // Last 30 seconds
    return recentLimits.length >= 3;
  }

  /**
   * Record a query metric
   */
  record(metric: Omit<QueryMetric, 'timestamp'>) {
    if (!this.enabled) return;

    const fullMetric: QueryMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Trim old metrics
    if (this.metrics.length > MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-MAX_METRICS_HISTORY);
    }

    // Check thresholds and warn
    this.checkThresholds(fullMetric);
  }

  /**
   * Check if metric exceeds thresholds and log warnings
   */
  private checkThresholds(metric: QueryMetric) {
    if (metric.duration > this.thresholds.slowQueryMs) {
      logger.warn(`[Metrics] Slow query detected: ${metric.queryKey} took ${metric.duration}ms`);
    }

    if (metric.payloadBytes > this.thresholds.largePayloadBytes) {
      const kb = Math.round(metric.payloadBytes / 1024);
      logger.warn(`[Metrics] Large payload: ${metric.queryKey} returned ${kb}KB`);
    }

    if (metric.rowCount > this.thresholds.largeRowCount) {
      logger.warn(`[Metrics] Large result set: ${metric.queryKey} returned ${metric.rowCount} rows`);
    }

    if (metric.status === 'rate-limited') {
      logger.warn(`[Metrics] Rate limited: ${metric.queryKey}`);
    }
  }

  /**
   * Get summary of recent metrics
   */
  getSummary(since?: number): MetricsSummary {
    const cutoff = since || Date.now() - REPORT_INTERVAL_MS;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        totalErrors: 0,
        totalRateLimited: 0,
        avgDuration: 0,
        p95Duration: 0,
        avgPayloadBytes: 0,
        totalPayloadBytes: 0,
        slowQueries: [],
        largePayloads: [],
        errors: [],
      };
    }

    const durations = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = durations[p95Index] || durations[durations.length - 1];

    const totalPayloadBytes = recentMetrics.reduce((sum, m) => sum + m.payloadBytes, 0);
    const avgPayloadBytes = Math.round(totalPayloadBytes / recentMetrics.length);

    const avgDuration = Math.round(
      recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
    );

    const errors = recentMetrics.filter(m => m.status === 'error');
    const rateLimited = recentMetrics.filter(m => m.status === 'rate-limited');
    const slowQueries = recentMetrics.filter(m => m.duration > this.thresholds.slowQueryMs);
    const largePayloads = recentMetrics.filter(m => m.payloadBytes > this.thresholds.largePayloadBytes);

    return {
      totalQueries: recentMetrics.length,
      totalErrors: errors.length,
      totalRateLimited: rateLimited.length,
      avgDuration,
      p95Duration,
      avgPayloadBytes,
      totalPayloadBytes,
      slowQueries: slowQueries.slice(-10), // Last 10
      largePayloads: largePayloads.slice(-10),
      errors: errors.slice(-10),
    };
  }

  /**
   * Log summary to console
   */
  private logSummary(summary: MetricsSummary) {
    const {
      totalQueries,
      totalErrors,
      totalRateLimited,
      avgDuration,
      p95Duration,
      avgPayloadBytes,
      slowQueries,
    } = summary;

    const payloadKB = Math.round(avgPayloadBytes / 1024);

    logger.info(
      `[Metrics] Last minute: ${totalQueries} queries, ` +
      `avg ${avgDuration}ms, p95 ${p95Duration}ms, ` +
      `avg payload ${payloadKB}KB, ` +
      `${totalErrors} errors, ${totalRateLimited} rate-limited, ` +
      `${slowQueries.length} slow`
    );

    if (slowQueries.length > 0) {
      logger.debug('[Metrics] Slow queries:', slowQueries.map(q => `${q.queryKey}: ${q.duration}ms`));
    }
  }

  /**
   * Get all metrics for debugging
   */
  getAllMetrics(): QueryMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Update thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// ============================================================================
// SUPABASE QUERY WRAPPER
// ============================================================================

/**
 * Wrap a Supabase query with metrics collection
 */
export async function withMetrics<T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T | null; error: any; count?: number | null }>
): Promise<{ data: T | null; error: any; count?: number | null }> {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = Math.round(performance.now() - startTime);
    
    // Estimate payload size
    let payloadBytes = 0;
    let rowCount = 0;
    
    if (result.data) {
      try {
        const json = JSON.stringify(result.data);
        payloadBytes = new Blob([json]).size;
        rowCount = Array.isArray(result.data) ? result.data.length : 1;
      } catch {
        // Ignore serialization errors
      }
    }

    // Check for rate limit error
    const isRateLimited = result.error?.message?.includes('rate limit') ||
      result.error?.code === '429';

    metricsCollector.record({
      queryKey,
      duration,
      payloadBytes,
      rowCount: result.count ?? rowCount,
      status: result.error 
        ? (isRateLimited ? 'rate-limited' : 'error')
        : 'success',
      errorMessage: result.error?.message,
    });

    return result;
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime);
    
    metricsCollector.record({
      queryKey,
      duration,
      payloadBytes: 0,
      rowCount: 0,
      status: 'error',
      errorMessage: error.message,
    });

    throw error;
  }
}

// ============================================================================
// REACT QUERY INTEGRATION
// ============================================================================

import { QueryClient } from '@tanstack/react-query';

/**
 * Create a query client with metrics integration
 */
export function createMetricsQueryClient(options?: {
  thresholds?: Partial<PerformanceThresholds>;
  onMetricsReport?: (summary: MetricsSummary) => void;
  onRateLimitAlert?: (events: RateLimitEvent[]) => void;
}): QueryClient {
  if (options?.thresholds) {
    metricsCollector.setThresholds(options.thresholds);
  }

  // Start collecting
  metricsCollector.start({
    onReport: options?.onMetricsReport,
    onRateLimitAlert: options?.onRateLimitAlert,
  });

  return new QueryClient({
    defaultOptions: {
      queries: {
        // Add default query options here
      },
    },
  });
}

// ============================================================================
// NETWORK OBSERVER
// ============================================================================

export interface NetworkStats {
  totalRequests: number;
  totalBytes: number;
  avgLatency: number;
  errorRate: number;
}

/**
 * Observe network performance via PerformanceObserver
 */
export function startNetworkObserver(
  onStats?: (stats: NetworkStats) => void,
  intervalMs: number = 60000
): () => void {
  if (typeof PerformanceObserver === 'undefined') {
    logger.warn('[NetworkObserver] PerformanceObserver not available');
    return () => {};
  }

  const entries: PerformanceResourceTiming[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as PerformanceResourceTiming;
        // Only track Supabase requests
        if (resourceEntry.name.includes('supabase')) {
          entries.push(resourceEntry);
          
          // Trim old entries
          if (entries.length > 1000) {
            entries.splice(0, 500);
          }
        }
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['resource'] });
  } catch (e) {
    logger.warn('[NetworkObserver] Failed to start observer:', e);
    return () => {};
  }

  const interval = setInterval(() => {
    const cutoff = performance.now() - intervalMs;
    const recentEntries = entries.filter(e => e.startTime >= cutoff);

    if (recentEntries.length === 0) return;

    const totalBytes = recentEntries.reduce(
      (sum, e) => sum + (e.transferSize || 0),
      0
    );
    const avgLatency = Math.round(
      recentEntries.reduce((sum, e) => sum + e.duration, 0) / recentEntries.length
    );
    const errors = recentEntries.filter(e => e.responseStatus >= 400).length;

    const stats: NetworkStats = {
      totalRequests: recentEntries.length,
      totalBytes,
      avgLatency,
      errorRate: errors / recentEntries.length,
    };

    logger.info(
      `[Network] Last minute: ${stats.totalRequests} requests, ` +
      `${Math.round(stats.totalBytes / 1024)}KB, ` +
      `avg ${stats.avgLatency}ms, ` +
      `${(stats.errorRate * 100).toFixed(1)}% errors`
    );

    if (onStats) {
      onStats(stats);
    }
  }, intervalMs);

  return () => {
    observer.disconnect();
    clearInterval(interval);
  };
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to access performance metrics
 */
export function useMetrics() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);

  useEffect(() => {
    const updateSummary = () => {
      setSummary(metricsCollector.getSummary());
    };

    // Initial update
    updateSummary();

    // Update periodically
    const interval = setInterval(updateSummary, 10000);

    return () => clearInterval(interval);
  }, []);

  const getSummary = useCallback((since?: number) => {
    return metricsCollector.getSummary(since);
  }, []);

  const clear = useCallback(() => {
    metricsCollector.clear();
    setSummary(null);
  }, []);

  return { summary, getSummary, clear };
}

/**
 * Hook to track component render performance
 */
export function useRenderMetrics(componentName: string) {
  const renderStartRef = { current: performance.now() };

  useEffect(() => {
    const renderTime = Math.round(performance.now() - renderStartRef.current);
    
    if (renderTime > 100) {
      logger.warn(`[RenderMetrics] ${componentName} took ${renderTime}ms to render`);
    }
  });

  return null;
}

// ============================================================================
// DEBUGGING TOOLS (Available in dev console)
// ============================================================================

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

if (isDev && typeof window !== 'undefined') {
  (window as any).__metrics = {
    getSummary: () => metricsCollector.getSummary(),
    getAll: () => metricsCollector.getAllMetrics(),
    getRateLimits: () => metricsCollector.getRecentRateLimits(),
    shouldBackoff: () => metricsCollector.shouldBackoff(),
    clear: () => metricsCollector.clear(),
    setThresholds: (t: Partial<PerformanceThresholds>) => metricsCollector.setThresholds(t),
    start: () => metricsCollector.start(),
    stop: () => metricsCollector.stop(),
  };
  
  logger.info('📊 Metrics tools available: window.__metrics');
}

// ============================================================================
// EXPORTS
// ============================================================================

export { MetricsCollector, DEFAULT_THRESHOLDS };
