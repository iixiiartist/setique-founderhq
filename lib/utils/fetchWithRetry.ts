/**
 * Fetch with Retry and Rate Limit Handling
 * =========================================
 * Wraps fetch calls with exponential backoff, jitter, and rate limit awareness.
 * Integrates with observability for tracking.
 */

import { metricsCollector } from './observability';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in ms (will be multiplied exponentially) */
  baseDelay: number;
  /** Maximum delay between retries in ms */
  maxDelay: number;
  /** Jitter factor (0-1) to randomize delays */
  jitterFactor: number;
  /** HTTP status codes that should trigger retry */
  retryableStatuses: number[];
  /** Whether to respect Retry-After header */
  respectRetryAfter: boolean;
}

export interface FetchWithRetryOptions extends RequestInit {
  /** Operation name for logging/metrics */
  operationName?: string;
  /** Custom retry config */
  retryConfig?: Partial<RetryConfig>;
  /** Timeout in ms */
  timeout?: number;
  /** Skip retry logic entirely */
  skipRetry?: boolean;
}

export interface FetchResult<T = unknown> {
  data: T | null;
  error: Error | null;
  status: number;
  retryCount: number;
  duration: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  jitterFactor: 0.3,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  respectRetryAfter: true,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig,
  retryAfterMs?: number
): number {
  // If we have a Retry-After header, respect it
  if (retryAfterMs && config.respectRetryAfter) {
    return Math.min(retryAfterMs, config.maxDelay);
  }

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter: delay * (1 - jitter + random * 2 * jitter)
  const jitter = config.jitterFactor;
  const randomFactor = 1 - jitter + Math.random() * 2 * jitter;
  
  return Math.round(cappedDelay * randomFactor);
}

/**
 * Parse Retry-After header (can be seconds or HTTP date)
 */
function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;

  // Try to parse as seconds
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try to parse as HTTP date
  const date = Date.parse(header);
  if (!isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return undefined;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN FETCH WRAPPER
// ============================================================================

/**
 * Fetch with automatic retry, backoff, and rate limit handling
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<FetchResult<T>> {
  const {
    operationName = url.split('/').pop() || 'fetch',
    retryConfig: customConfig,
    timeout = 30000,
    skipRetry = false,
    ...fetchOptions
  } = options;

  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...customConfig };
  const startTime = performance.now();
  let lastError: Error | null = null;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= (skipRetry ? 0 : config.maxRetries); attempt++) {
    try {
      // Check if we should back off due to recent rate limits
      if (attempt === 0 && metricsCollector.shouldBackoff()) {
        logger.warn(`[Retry] Backing off due to recent rate limits: ${operationName}`);
        await sleep(config.baseDelay);
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatus = response.status;

      // Check for rate limit
      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
        
        metricsCollector.recordRateLimit({
          endpoint: operationName,
          httpStatus: 429,
          retryAfter: retryAfter ? retryAfter / 1000 : undefined,
        });

        if (attempt < config.maxRetries && !skipRetry) {
          const delay = calculateDelay(attempt, config, retryAfter);
          logger.warn(
            `[Retry] Rate limited on ${operationName}, attempt ${attempt + 1}/${config.maxRetries + 1}, ` +
            `waiting ${delay}ms`
          );
          await sleep(delay);
          continue;
        }
      }

      // Check for other retryable errors
      if (config.retryableStatuses.includes(response.status)) {
        if (attempt < config.maxRetries && !skipRetry) {
          const delay = calculateDelay(attempt, config);
          logger.warn(
            `[Retry] Retryable error ${response.status} on ${operationName}, ` +
            `attempt ${attempt + 1}/${config.maxRetries + 1}, waiting ${delay}ms`
          );
          await sleep(delay);
          continue;
        }
      }

      // Success or non-retryable error
      let data: T | null = null;
      try {
        data = await response.json();
      } catch {
        // Response might not be JSON
      }

      const duration = Math.round(performance.now() - startTime);

      return {
        data,
        error: response.ok ? null : new Error(`HTTP ${response.status}`),
        status: response.status,
        retryCount: attempt,
        duration,
      };

    } catch (error: any) {
      lastError = error;
      lastStatus = 0;

      // Don't retry abort errors (timeout)
      if (error.name === 'AbortError') {
        logger.error(`[Retry] Timeout on ${operationName} after ${timeout}ms`);
        break;
      }

      // Network errors are retryable
      if (attempt < config.maxRetries && !skipRetry) {
        const delay = calculateDelay(attempt, config);
        logger.warn(
          `[Retry] Network error on ${operationName}, attempt ${attempt + 1}/${config.maxRetries + 1}, ` +
          `waiting ${delay}ms: ${error.message}`
        );
        await sleep(delay);
        continue;
      }
    }
  }

  const duration = Math.round(performance.now() - startTime);

  return {
    data: null,
    error: lastError || new Error(`Request failed with status ${lastStatus}`),
    status: lastStatus,
    retryCount: config.maxRetries,
    duration,
  };
}

// ============================================================================
// SUPABASE-SPECIFIC WRAPPER
// ============================================================================

/**
 * Wrapper for Supabase Edge Function calls with retry
 */
export async function invokeEdgeFunctionWithRetry<T = unknown>(
  functionName: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    method?: string;
    accessToken?: string;
  } = {}
): Promise<FetchResult<T>> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.accessToken) {
    headers['Authorization'] = `Bearer ${options.accessToken}`;
  }

  return fetchWithRetry<T>(url, {
    method: options.method || 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    operationName: `edge:${functionName}`,
  });
}

// ============================================================================
// REACT QUERY INTEGRATION
// ============================================================================

/**
 * Create a query function with built-in retry
 * For use with React Query's queryFn
 */
export function createRetryQueryFn<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<{ data: TResult | null; error: any }>,
  operationName: string
): (...args: TArgs) => Promise<{ data: TResult | null; error: any }> {
  return async (...args: TArgs) => {
    // Check backoff before making request
    if (metricsCollector.shouldBackoff()) {
      logger.warn(`[QueryFn] Backing off due to rate limits: ${operationName}`);
      await sleep(DEFAULT_RETRY_CONFIG.baseDelay);
    }

    const startTime = performance.now();
    const result = await fn(...args);
    const duration = Math.round(performance.now() - startTime);

    // Record metric
    const payloadBytes = result.data ? new Blob([JSON.stringify(result.data)]).size : 0;
    const rowCount = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0;
    
    const isRateLimited = result.error?.message?.includes('rate limit') ||
      result.error?.code === '429' ||
      result.error?.status === 429;

    metricsCollector.record({
      queryKey: operationName,
      duration,
      payloadBytes,
      rowCount,
      status: result.error 
        ? (isRateLimited ? 'rate-limited' : 'error')
        : 'success',
      errorMessage: result.error?.message,
      httpStatus: result.error?.status,
    });

    if (isRateLimited) {
      metricsCollector.recordRateLimit({
        endpoint: operationName,
        httpStatus: 429,
      });
    }

    return result;
  };
}
