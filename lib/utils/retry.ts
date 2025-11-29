// lib/utils/retry.ts
// Retry utility for transient failures

import { logger } from '../logger';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in ms between retries (default: 10000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Function to determine if error is retryable (default: network/5xx errors) */
  isRetryable?: (error: unknown) => boolean;
  /** Optional callback on each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  isRetryable: isTransientError,
  onRetry: () => {},
};

/**
 * Default check for transient/retryable errors
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  // Network errors (fetch failures, timeouts)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // AbortError (timeout)
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  // Check for error objects with code property
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; status?: number; message?: string };
    
    // Supabase/PostgreSQL transient errors
    if (err.code === 'PGRST301' || err.code === '40001' || err.code === '57P01') {
      return true;
    }

    // HTTP 5xx errors (server errors) - but not 501/505 which are permanent
    if (err.status && err.status >= 500 && err.status !== 501 && err.status !== 505) {
      return true;
    }

    // Network error messages
    if (err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('connection') ||
        err.message?.toLowerCase().includes('timeout') ||
        err.message?.toLowerCase().includes('econnrefused') ||
        err.message?.toLowerCase().includes('enotfound')) {
      return true;
    }
  }

  return false;
}

/**
 * Check if error is a rate limit error (should not retry immediately)
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; status?: number };
    if (err.status === 429 || err.code === 'rate_limit') {
      return true;
    }
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  // Exponential backoff
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  // Add jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  // Clamp to max delay
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Execute a function with automatic retry on transient failures
 * 
 * @example
 * const result = await withRetry(
 *   () => fetchData(),
 *   { maxAttempts: 3, onRetry: (n, err) => console.log(`Retry ${n}`) }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry rate limit errors
      if (isRateLimitError(error)) {
        logger.warn('[retry] Rate limit error, not retrying');
        throw error;
      }

      // Check if we should retry
      if (attempt < opts.maxAttempts && opts.isRetryable(error)) {
        const delayMs = calculateDelay(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.backoffMultiplier
        );

        logger.info(`[retry] Attempt ${attempt} failed, retrying in ${Math.round(delayMs)}ms`);
        opts.onRetry(attempt, error, delayMs);

        await sleep(delayMs);
      } else {
        // No more retries or error not retryable
        break;
      }
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 * 
 * @example
 * const retryableFetch = createRetryable(fetchData, { maxAttempts: 3 });
 * const result = await retryableFetch();
 */
export function createRetryable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: RetryOptions
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}
