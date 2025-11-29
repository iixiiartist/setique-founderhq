// lib/services/errorService.ts
// Centralized error handling service for consistent error management

import { logger } from '../utils/logger';
import { showError } from '../utils/toast';

// Error categories for structured handling
export type ErrorCategory = 
  | 'network'      // Network/connectivity issues
  | 'auth'         // Authentication/authorization failures
  | 'validation'   // Input validation errors
  | 'api'          // API response errors
  | 'timeout'      // Operation timeout errors
  | 'rate_limit'   // Rate limiting errors
  | 'permission'   // Permission denied errors
  | 'not_found'    // Resource not found errors
  | 'conflict'     // Data conflict errors
  | 'unknown';     // Uncategorized errors

export interface AppError extends Error {
  category: ErrorCategory;
  code?: string;
  context?: Record<string, unknown>;
  recoverable?: boolean;
  retryable?: boolean;
  userMessage?: string;
}

export interface ErrorHandlerOptions {
  /** Show toast notification to user (default: true) */
  showToast?: boolean;
  /** Custom user-facing message */
  userMessage?: string;
  /** Additional context for logging */
  context?: Record<string, unknown>;
  /** Whether to rethrow the error (default: false) */
  rethrow?: boolean;
  /** Operation name for logging */
  operation?: string;
}

const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  showToast: true,
  rethrow: false,
};

/**
 * Classify an error into a category based on its properties
 */
export function classifyError(error: unknown): ErrorCategory {
  if (!error) return 'unknown';

  // Check for AppError with category
  if (isAppError(error)) {
    return error.category;
  }

  // Check error object properties
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; status?: number; message?: string; name?: string };

    // Network errors
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      return 'network';
    }
    if (err.name === 'AbortError') {
      return 'timeout';
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return 'network';
    }

    // HTTP status based classification
    if (err.status === 401 || err.status === 403 || err.code === 'auth') {
      return 'auth';
    }
    if (err.status === 429 || err.code === 'rate_limit') {
      return 'rate_limit';
    }
    if (err.status === 404 || err.code === 'PGRST116') {
      return 'not_found';
    }
    if (err.status === 409 || err.code === '23505') {
      return 'conflict';
    }
    if (err.status === 504 || err.code === 'timeout') {
      return 'timeout';
    }
    if (err.status && err.status >= 400 && err.status < 500) {
      return 'validation';
    }
    if (err.status && err.status >= 500) {
      return 'api';
    }

    // Message based classification
    if (err.message) {
      const msg = err.message.toLowerCase();
      if (msg.includes('network') || msg.includes('connection')) return 'network';
      if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
      if (msg.includes('unauthorized') || msg.includes('forbidden')) return 'auth';
      if (msg.includes('not found')) return 'not_found';
      if (msg.includes('rate limit')) return 'rate_limit';
    }
  }

  return 'unknown';
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    'category' in error &&
    typeof (error as AppError).category === 'string'
  );
}

/**
 * Create a structured AppError
 */
export function createAppError(
  message: string,
  category: ErrorCategory,
  options?: {
    code?: string;
    context?: Record<string, unknown>;
    recoverable?: boolean;
    retryable?: boolean;
    userMessage?: string;
    cause?: Error;
  }
): AppError {
  const error = new Error(message) as AppError;
  error.name = 'AppError';
  error.category = category;
  error.code = options?.code;
  error.context = options?.context;
  error.recoverable = options?.recoverable ?? true;
  error.retryable = options?.retryable ?? isRetryableCategory(category);
  error.userMessage = options?.userMessage;
  if (options?.cause) {
    error.cause = options.cause;
  }
  return error;
}

/**
 * Check if an error category is typically retryable
 */
function isRetryableCategory(category: ErrorCategory): boolean {
  return ['network', 'timeout', 'api'].includes(category);
}

/**
 * Get user-friendly message for error category
 */
function getUserMessage(category: ErrorCategory, originalMessage?: string): string {
  const categoryMessages: Record<ErrorCategory, string> = {
    network: 'Network connection issue. Please check your internet and try again.',
    auth: 'Authentication required. Please sign in again.',
    validation: 'Please check your input and try again.',
    api: 'Service temporarily unavailable. Please try again.',
    timeout: 'The operation timed out. Please try again.',
    rate_limit: 'Too many requests. Please wait a moment before trying again.',
    permission: 'You don\'t have permission to perform this action.',
    not_found: 'The requested resource was not found.',
    conflict: 'There was a data conflict. Please refresh and try again.',
    unknown: 'An unexpected error occurred. Please try again.',
  };

  return categoryMessages[category] || originalMessage || categoryMessages.unknown;
}

/**
 * Central error handler - use this for all error handling
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const category = classifyError(error);
  
  // Extract error details
  let message = 'An unknown error occurred';
  let stack: string | undefined;
  let errorContext: Record<string, unknown> = {};

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    message = (error as { message?: string }).message || JSON.stringify(error);
    errorContext = error as Record<string, unknown>;
  }

  // Build log context
  const logContext = {
    category,
    operation: opts.operation,
    ...opts.context,
    ...errorContext,
    stack,
  };

  // Log the error
  const logPrefix = opts.operation ? `[${opts.operation}]` : '[Error]';
  logger.error(`${logPrefix} ${message}`, logContext);

  // Show toast notification if enabled
  if (opts.showToast) {
    const userMessage = opts.userMessage || 
      (isAppError(error) ? error.userMessage : undefined) ||
      getUserMessage(category, message);
    
    showError(userMessage);
  }

  // Rethrow if requested
  if (opts.rethrow) {
    throw error;
  }
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: ErrorHandlerOptions
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      return undefined;
    }
  }) as T;
}

/**
 * React hook-friendly error handler that returns error state
 */
export function createErrorHandler(baseOptions?: ErrorHandlerOptions) {
  return {
    handle: (error: unknown, options?: ErrorHandlerOptions) => {
      handleError(error, { ...baseOptions, ...options });
    },
    classify: classifyError,
    create: createAppError,
    isAppError,
  };
}

/**
 * Global unhandled error listener setup
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('[Unhandled Promise Rejection]', {
      reason: event.reason,
      promise: event.promise,
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logger.error('[Uncaught Error]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });
}
