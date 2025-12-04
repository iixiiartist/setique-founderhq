/**
 * Rate Limiting and Mutation Queue
 * =================================
 * Throttles client mutations to prevent stampeding under multi-user usage.
 * Uses a token bucket algorithm with queue management.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum queue size before rejecting */
  maxQueueSize?: number;
  /** Retry delay after rate limit (ms) */
  retryDelayMs?: number;
}

export interface QueuedMutation<T = unknown> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
  createdAt: number;
  retries: number;
}

export interface RateLimiterState {
  tokens: number;
  lastRefill: number;
  queueSize: number;
  isProcessing: boolean;
}

// ============================================================================
// TOKEN BUCKET RATE LIMITER
// ============================================================================

class TokenBucket {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms
  private lastRefill: number;

  constructor(config: RateLimitConfig) {
    this.maxTokens = config.maxRequests;
    this.tokens = config.maxRequests;
    this.refillRate = config.maxRequests / config.windowMs;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  tryConsume(count: number = 1): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  getWaitTime(count: number = 1): number {
    this.refill();
    if (this.tokens >= count) return 0;
    const needed = count - this.tokens;
    return Math.ceil(needed / this.refillRate);
  }

  getState(): { tokens: number; maxTokens: number } {
    this.refill();
    return { tokens: Math.floor(this.tokens), maxTokens: this.maxTokens };
  }
}

// ============================================================================
// MUTATION QUEUE
// ============================================================================

class MutationQueue<T = unknown> {
  private queue: QueuedMutation<T>[] = [];
  private processing: boolean = false;
  private limiter: TokenBucket;
  private maxQueueSize: number;
  private retryDelayMs: number;
  private onStateChange?: (state: RateLimiterState) => void;

  constructor(
    config: RateLimitConfig,
    onStateChange?: (state: RateLimiterState) => void
  ) {
    this.limiter = new TokenBucket(config);
    this.maxQueueSize = config.maxQueueSize ?? 50;
    this.retryDelayMs = config.retryDelayMs ?? 1000;
    this.onStateChange = onStateChange;
  }

  private notifyStateChange() {
    if (this.onStateChange) {
      const { tokens } = this.limiter.getState();
      this.onStateChange({
        tokens,
        lastRefill: Date.now(),
        queueSize: this.queue.length,
        isProcessing: this.processing,
      });
    }
  }

  async enqueue<R>(
    execute: () => Promise<R>,
    priority: number = 0
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error('Rate limit: queue is full. Please try again later.'));
        return;
      }

      const mutation: QueuedMutation<any> = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        execute: execute as () => Promise<any>,
        resolve,
        reject,
        priority,
        createdAt: Date.now(),
        retries: 0,
      };

      // Insert by priority (higher priority first)
      const insertIndex = this.queue.findIndex(m => m.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(mutation);
      } else {
        this.queue.splice(insertIndex, 0, mutation);
      }

      this.notifyStateChange();
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    this.notifyStateChange();

    while (this.queue.length > 0) {
      const mutation = this.queue[0];

      // Check rate limit
      if (!this.limiter.tryConsume()) {
        const waitTime = this.limiter.getWaitTime();
        logger.debug(`[MutationQueue] Rate limited, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        continue;
      }

      // Remove from queue and execute
      this.queue.shift();
      this.notifyStateChange();

      try {
        const result = await mutation.execute();
        mutation.resolve(result);
      } catch (error: any) {
        // Handle retries for transient errors
        if (this.shouldRetry(error) && mutation.retries < 3) {
          mutation.retries++;
          logger.warn(`[MutationQueue] Retrying mutation (attempt ${mutation.retries})`);
          this.queue.unshift(mutation); // Re-add to front
          await this.sleep(this.retryDelayMs * mutation.retries);
          continue;
        }
        mutation.reject(error);
      }
    }

    this.processing = false;
    this.notifyStateChange();
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx status codes
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return true;
    }
    const status = error.status || error.code;
    return status >= 500 && status < 600;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clear() {
    this.queue.forEach(m => m.reject(new Error('Queue cleared')));
    this.queue = [];
    this.notifyStateChange();
  }

  getState(): RateLimiterState {
    const { tokens } = this.limiter.getState();
    return {
      tokens,
      lastRefill: Date.now(),
      queueSize: this.queue.length,
      isProcessing: this.processing,
    };
  }
}

// ============================================================================
// GLOBAL RATE LIMITERS
// ============================================================================

/** Rate limiter configurations by feature */
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Message sending: 10 per 10 seconds
  messages: { maxRequests: 10, windowMs: 10000, maxQueueSize: 20 },
  // AI calls: 5 per minute (matches Groq-style limiting)
  ai: { maxRequests: 5, windowMs: 60000, maxQueueSize: 10, retryDelayMs: 2000 },
  // CRM mutations: 20 per minute
  crm: { maxRequests: 20, windowMs: 60000, maxQueueSize: 30 },
  // Task mutations: 30 per minute
  tasks: { maxRequests: 30, windowMs: 60000, maxQueueSize: 50 },
  // Document saves: 10 per minute (autosave friendly)
  documents: { maxRequests: 10, windowMs: 60000, maxQueueSize: 15 },
  // Bulk operations: 3 per minute
  bulk: { maxRequests: 3, windowMs: 60000, maxQueueSize: 5 },
  // Default: 30 per minute
  default: { maxRequests: 30, windowMs: 60000, maxQueueSize: 50 },
};

// Global queue instances
const queues: Map<string, MutationQueue> = new Map();

function getQueue(
  name: string,
  onStateChange?: (state: RateLimiterState) => void
): MutationQueue {
  if (!queues.has(name)) {
    const config = RATE_LIMIT_CONFIGS[name] || RATE_LIMIT_CONFIGS.default;
    queues.set(name, new MutationQueue(config, onStateChange));
  }
  return queues.get(name)!;
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to access a rate-limited mutation queue
 */
export function useRateLimitedMutation<T = unknown>(
  queueName: 'messages' | 'ai' | 'crm' | 'tasks' | 'documents' | 'bulk' | 'default' = 'default'
) {
  const [state, setState] = useState<RateLimiterState>({
    tokens: 0,
    lastRefill: 0,
    queueSize: 0,
    isProcessing: false,
  });

  const queueRef = useRef<MutationQueue<T> | null>(null);

  useEffect(() => {
    queueRef.current = getQueue(queueName, setState) as MutationQueue<T>;
    setState(queueRef.current.getState());
    
    return () => {
      // Don't clear the queue on unmount, just stop listening
    };
  }, [queueName]);

  const mutate = useCallback(
    async <R>(fn: () => Promise<R>, priority: number = 0): Promise<R> => {
      if (!queueRef.current) {
        throw new Error('Queue not initialized');
      }
      return queueRef.current.enqueue(fn as () => Promise<any>, priority);
    },
    []
  );

  const clear = useCallback(() => {
    queueRef.current?.clear();
  }, []);

  return {
    mutate,
    clear,
    state,
    isRateLimited: state.tokens <= 0,
    queueSize: state.queueSize,
    isProcessing: state.isProcessing,
  };
}

/**
 * Higher-order function to wrap mutations with rate limiting
 */
export function withRateLimit<Args extends unknown[], Result>(
  queueName: keyof typeof RATE_LIMIT_CONFIGS,
  fn: (...args: Args) => Promise<Result>,
  priority: number = 0
): (...args: Args) => Promise<Result> {
  const queue = getQueue(queueName);
  
  return async (...args: Args): Promise<Result> => {
    return queue.enqueue(() => fn(...args), priority);
  };
}

// ============================================================================
// THROTTLE & DEBOUNCE UTILITIES
// ============================================================================

/**
 * Throttle function calls to at most once per interval
 */
export function throttle<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  intervalMs: number
): (...args: Args) => Result | undefined {
  let lastCall = 0;
  let lastResult: Result | undefined;

  return (...args: Args): Result | undefined => {
    const now = Date.now();
    if (now - lastCall >= intervalMs) {
      lastCall = now;
      lastResult = fn(...args);
    }
    return lastResult;
  };
}

/**
 * Leading-edge throttle (execute immediately, then throttle)
 */
export function throttleLeading<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  intervalMs: number
): (...args: Args) => Result {
  let lastCall = 0;
  let lastResult: Result;

  return (...args: Args): Result => {
    const now = Date.now();
    if (now - lastCall >= intervalMs) {
      lastCall = now;
      lastResult = fn(...args);
    }
    return lastResult;
  };
}

/**
 * Debounce async function with cancellation
 */
export function debounceAsync<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  delayMs: number
): {
  call: (...args: Args) => Promise<Result>;
  cancel: () => void;
  flush: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: {
    resolve: (value: Result) => void;
    reject: (error: Error) => void;
    args: Args;
  } | null = null;

  const call = (...args: Args): Promise<Result> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        // Reject previous pending promise
        if (pendingPromise) {
          pendingPromise.reject(new Error('Debounced'));
        }
      }

      pendingPromise = { resolve, reject, args };

      timeoutId = setTimeout(async () => {
        if (pendingPromise) {
          try {
            const result = await fn(...pendingPromise.args);
            pendingPromise.resolve(result);
          } catch (error) {
            pendingPromise.reject(error as Error);
          }
          pendingPromise = null;
        }
        timeoutId = null;
      }, delayMs);
    });
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pendingPromise) {
      pendingPromise.reject(new Error('Cancelled'));
      pendingPromise = null;
    }
  };

  const flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pendingPromise) {
      fn(...pendingPromise.args).then(pendingPromise.resolve).catch(pendingPromise.reject);
      pendingPromise = null;
    }
  };

  return { call, cancel, flush };
}

// ============================================================================
// BATCH MUTATION UTILITY
// ============================================================================

export interface BatchConfig {
  /** Maximum items per batch */
  maxBatchSize: number;
  /** Time to wait for more items before executing batch (ms) */
  batchDelayMs: number;
  /** Maximum time to wait before executing (ms) */
  maxWaitMs: number;
}

/**
 * Batch multiple mutations into fewer database calls
 */
export function createBatcher<Item, Result>(
  executeBatch: (items: Item[]) => Promise<Result[]>,
  config: BatchConfig = { maxBatchSize: 50, batchDelayMs: 100, maxWaitMs: 1000 }
): {
  add: (item: Item) => Promise<Result>;
  flush: () => Promise<void>;
} {
  let batch: Item[] = [];
  let resolvers: Array<{ resolve: (r: Result) => void; reject: (e: Error) => void }> = [];
  let batchTimeout: NodeJS.Timeout | null = null;
  let maxWaitTimeout: NodeJS.Timeout | null = null;

  const execute = async () => {
    if (batchTimeout) clearTimeout(batchTimeout);
    if (maxWaitTimeout) clearTimeout(maxWaitTimeout);
    batchTimeout = null;
    maxWaitTimeout = null;

    if (batch.length === 0) return;

    const currentBatch = batch;
    const currentResolvers = resolvers;
    batch = [];
    resolvers = [];

    try {
      const results = await executeBatch(currentBatch);
      currentResolvers.forEach((r, i) => r.resolve(results[i]));
    } catch (error) {
      currentResolvers.forEach(r => r.reject(error as Error));
    }
  };

  const add = (item: Item): Promise<Result> => {
    return new Promise((resolve, reject) => {
      batch.push(item);
      resolvers.push({ resolve, reject });

      // Execute immediately if batch is full
      if (batch.length >= config.maxBatchSize) {
        execute();
        return;
      }

      // Set batch delay timer
      if (!batchTimeout) {
        batchTimeout = setTimeout(execute, config.batchDelayMs);
      }

      // Set max wait timer on first item
      if (!maxWaitTimeout) {
        maxWaitTimeout = setTimeout(execute, config.maxWaitMs);
      }
    });
  };

  return { add, flush: execute };
}

// Export types
export { TokenBucket, MutationQueue };
