// lib/utils/operationQueue.ts
// Operation queue to prevent duplicate/rapid actions and manage concurrency

import { logger } from '../logger';

export interface QueuedOperation<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

export interface OperationQueueOptions {
  /** Maximum concurrent operations (default: 3) */
  maxConcurrent?: number;
  /** Minimum delay between same-key operations in ms (default: 500) */
  dedupeDelayMs?: number;
  /** Operation timeout in ms (default: 30000) */
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<OperationQueueOptions> = {
  maxConcurrent: 3,
  dedupeDelayMs: 500,
  timeoutMs: 30000,
};

/**
 * Operation queue that prevents duplicate rapid operations
 * and manages concurrency limits
 */
export class OperationQueue {
  private queue: QueuedOperation<unknown>[] = [];
  private running = new Map<string, Promise<unknown>>();
  private lastOperationTime = new Map<string, number>();
  private options: Required<OperationQueueOptions>;

  constructor(options?: OperationQueueOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Enqueue an operation with deduplication
   * If the same key is already running or was run recently, returns the existing promise
   */
  async enqueue<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const lastRun = this.lastOperationTime.get(key) || 0;

    // Check if operation with same key is already running
    const existingPromise = this.running.get(key);
    if (existingPromise) {
      logger.debug(`[OperationQueue] Deduping "${key}" - already running`);
      return existingPromise as Promise<T>;
    }

    // Check if operation was run too recently (debounce)
    if (now - lastRun < this.options.dedupeDelayMs) {
      logger.debug(`[OperationQueue] Skipping "${key}" - too recent (${now - lastRun}ms ago)`);
      throw new OperationQueueError(
        'Operation skipped - please wait before retrying',
        'debounced'
      );
    }

    // Create the queued operation
    return new Promise<T>((resolve, reject) => {
      const queuedOp: QueuedOperation<T> = {
        id: key,
        execute: operation,
        resolve,
        reject,
        timestamp: now,
      };

      this.queue.push(queuedOp as QueuedOperation<unknown>);
      this.processQueue();
    });
  }

  /**
   * Process the queue, respecting concurrency limits
   */
  private async processQueue(): Promise<void> {
    // Check if we can run more operations
    if (this.running.size >= this.options.maxConcurrent) {
      return;
    }

    // Get next operation
    const op = this.queue.shift();
    if (!op) {
      return;
    }

    // Execute the operation
    const executeWithTimeout = async (): Promise<unknown> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new OperationQueueError('Operation timed out', 'timeout'));
        }, this.options.timeoutMs);
      });

      return Promise.race([op.execute(), timeoutPromise]);
    };

    const promise = executeWithTimeout();
    this.running.set(op.id, promise);
    this.lastOperationTime.set(op.id, Date.now());

    try {
      const result = await promise;
      op.resolve(result);
    } catch (error) {
      op.reject(error);
    } finally {
      this.running.delete(op.id);
      // Process next item in queue
      this.processQueue();
    }
  }

  /**
   * Check if an operation is currently running
   */
  isRunning(key: string): boolean {
    return this.running.has(key);
  }

  /**
   * Get the number of currently running operations
   */
  get runningCount(): number {
    return this.running.size;
  }

  /**
   * Get the number of queued operations
   */
  get queuedCount(): number {
    return this.queue.length;
  }

  /**
   * Clear all pending operations (does not cancel running ones)
   */
  clearPending(): void {
    const pending = this.queue.splice(0);
    for (const op of pending) {
      op.reject(new OperationQueueError('Operation cancelled', 'cancelled'));
    }
  }
}

export class OperationQueueError extends Error {
  constructor(
    message: string,
    public readonly code: 'debounced' | 'timeout' | 'cancelled'
  ) {
    super(message);
    this.name = 'OperationQueueError';
  }
}

// Singleton instance for global use
let globalQueue: OperationQueue | null = null;

/**
 * Get the global operation queue instance
 */
export function getOperationQueue(): OperationQueue {
  if (!globalQueue) {
    globalQueue = new OperationQueue();
  }
  return globalQueue;
}

/**
 * Convenience function to enqueue an operation on the global queue
 */
export async function enqueueOperation<T>(
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  return getOperationQueue().enqueue(key, operation);
}
