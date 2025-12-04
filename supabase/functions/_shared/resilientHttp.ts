/**
 * Resilient HTTP Client Module
 * 
 * Provides HTTP requests with timeouts, retries, circuit breaker,
 * and structured error handling for external API calls.
 */

// ============================================
// CONSTANTS
// ============================================

// Default timeout for outbound requests
const DEFAULT_TIMEOUT_MS = 15_000; // 15 seconds

// Maximum retries for transient failures
const MAX_RETRIES = 2;

// Base delay for exponential backoff (ms)
const BASE_RETRY_DELAY_MS = 500;

// Circuit breaker thresholds
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_TIMEOUT_MS = 30_000; // 30 seconds

// ============================================
// TYPES
// ============================================

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
}

export interface FetchResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  statusCode: number | null;
  durationMs: number;
  retryCount: number;
}

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

// ============================================
// CIRCUIT BREAKER
// ============================================

// In-memory circuit breaker state per provider
// Note: This resets on cold start, but that's acceptable for rate limiting
const circuitBreakers: Map<string, CircuitState> = new Map();

function getCircuitState(provider: string): CircuitState {
  let state = circuitBreakers.get(provider);
  if (!state) {
    state = { failures: 0, lastFailureTime: 0, isOpen: false };
    circuitBreakers.set(provider, state);
  }
  return state;
}

function recordFailure(provider: string): void {
  const state = getCircuitState(provider);
  state.failures++;
  state.lastFailureTime = Date.now();
  
  if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    state.isOpen = true;
  }
}

function recordSuccess(provider: string): void {
  const state = getCircuitState(provider);
  state.failures = 0;
  state.isOpen = false;
}

function isCircuitOpen(provider: string): boolean {
  const state = getCircuitState(provider);
  
  if (!state.isOpen) {
    return false;
  }
  
  // Check if circuit should be reset (half-open)
  const timeSinceLastFailure = Date.now() - state.lastFailureTime;
  if (timeSinceLastFailure >= CIRCUIT_RESET_TIMEOUT_MS) {
    state.isOpen = false;
    state.failures = 0;
    return false;
  }
  
  return true;
}

// ============================================
// FETCH WITH TIMEOUT
// ============================================

/**
 * Fetch with timeout using AbortController.
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if an error is retryable.
 */
function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError) {
    return true;
  }
  
  // Abort errors (timeout)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  
  return false;
}

/**
 * Check if a status code is retryable.
 */
function isRetryableStatus(status: number): boolean {
  // Retry on server errors and rate limits
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Calculate exponential backoff delay.
 */
function getBackoffDelay(attempt: number): number {
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.min(delay + jitter, 5000); // Cap at 5 seconds
}

/**
 * Sleep for a given duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// RESILIENT FETCH
// ============================================

/**
 * Perform a resilient fetch with timeout, retries, and circuit breaker.
 */
export async function resilientFetch<T = unknown>(
  url: string,
  provider: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.retries ?? MAX_RETRIES;
  
  // Check circuit breaker
  if (isCircuitOpen(provider)) {
    return {
      success: false,
      data: null,
      error: `Service temporarily unavailable (circuit breaker open for ${provider})`,
      statusCode: null,
      durationMs: Date.now() - startTime,
      retryCount: 0,
    };
  }
  
  let lastError: string | null = null;
  let lastStatus: number | null = null;
  let retryCount = 0;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      
      // Check for success
      if (response.ok) {
        recordSuccess(provider);
        
        let data: T | null = null;
        try {
          data = await response.json() as T;
        } catch {
          // Not JSON, that's okay for some responses
        }
        
        return {
          success: true,
          data,
          error: null,
          statusCode: response.status,
          durationMs: Date.now() - startTime,
          retryCount,
        };
      }
      
      // Handle non-2xx responses
      lastStatus = response.status;
      
      // Get error message from response
      let errorText = '';
      try {
        const errorBody = await response.text();
        errorText = errorBody.substring(0, 500); // Limit error message size
      } catch {
        errorText = `HTTP ${response.status}`;
      }
      
      // Check if retryable
      if (isRetryableStatus(response.status) && attempt < maxRetries) {
        retryCount++;
        const delay = getBackoffDelay(attempt);
        await sleep(delay);
        continue;
      }
      
      // Non-retryable error
      recordFailure(provider);
      return {
        success: false,
        data: null,
        error: `${provider} error: ${response.status} - ${errorText}`,
        statusCode: response.status,
        durationMs: Date.now() - startTime,
        retryCount,
      };
      
    } catch (error) {
      // Handle timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = 'Request timed out';
        
        if (attempt < maxRetries) {
          retryCount++;
          const delay = getBackoffDelay(attempt);
          await sleep(delay);
          continue;
        }
        
        recordFailure(provider);
        return {
          success: false,
          data: null,
          error: `${provider} request timed out after ${timeoutMs}ms`,
          statusCode: null,
          durationMs: Date.now() - startTime,
          retryCount,
        };
      }
      
      // Handle other errors
      lastError = error instanceof Error ? error.message : 'Unknown error';
      
      if (isRetryableError(error) && attempt < maxRetries) {
        retryCount++;
        const delay = getBackoffDelay(attempt);
        await sleep(delay);
        continue;
      }
      
      recordFailure(provider);
      return {
        success: false,
        data: null,
        error: `${provider} error: ${lastError}`,
        statusCode: null,
        durationMs: Date.now() - startTime,
        retryCount,
      };
    }
  }
  
  // Exhausted all retries
  recordFailure(provider);
  return {
    success: false,
    data: null,
    error: lastError || `${provider} failed after ${retryCount} retries`,
    statusCode: lastStatus,
    durationMs: Date.now() - startTime,
    retryCount,
  };
}

// ============================================
// PROVIDER-SPECIFIC CLIENTS
// ============================================

/**
 * Call Groq API with resilience.
 */
export async function callGroqAPI<T>(
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<FetchResult<T>> {
  return resilientFetch<T>(endpoint, 'groq', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    timeoutMs,
    retries: 1, // Groq has per-minute limits, reduce retries
  });
}

/**
 * Call You.com Search API with resilience.
 */
export async function callYoucomAPI<T>(
  url: string,
  apiKey: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<FetchResult<T>> {
  return resilientFetch<T>(url, 'youcom', {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
    },
    timeoutMs,
    retries: 2,
  });
}

/**
 * Get circuit breaker status for observability.
 */
export function getCircuitBreakerStatus(): Record<string, { isOpen: boolean; failures: number }> {
  const status: Record<string, { isOpen: boolean; failures: number }> = {};
  
  for (const [provider, state] of circuitBreakers) {
    status[provider] = {
      isOpen: state.isOpen,
      failures: state.failures,
    };
  }
  
  return status;
}

export {
  DEFAULT_TIMEOUT_MS,
  MAX_RETRIES,
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_RESET_TIMEOUT_MS,
};
