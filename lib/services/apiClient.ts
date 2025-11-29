// lib/services/apiClient.ts
// Centralized API client for all Edge Function calls
// Abstracts away Supabase URLs and sanitizes error messages

import { supabase } from '../supabase';

// ============================================
// CONFIGURATION
// ============================================

// Internal: actual functions URL (hidden from user-facing code)
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// User-friendly API name for error messages
const API_NAME = 'FounderHQ API';

// ============================================
// ERROR SANITIZATION
// ============================================

/**
 * Patterns to detect and remove from error messages
 * These help prevent exposing internal infrastructure details
 */
const SENSITIVE_PATTERNS = [
  // Supabase project IDs (24 char alphanumeric)
  /[a-z]{20,30}/gi,
  // Supabase URLs
  /https?:\/\/[a-z0-9-]+\.supabase\.co[^\s]*/gi,
  // Function URLs
  /\/functions\/v1\/[a-z-]+/gi,
  // Stack traces
  /at\s+[\w.]+\s+\([^)]+\)/gi,
  // File paths
  /\/[a-z_-]+\/[a-z_-]+\/index\.ts/gi,
  // Deno/Node internals
  /deno[^\s]*/gi,
  /node_modules[^\s]*/gi,
];

/**
 * Map of technical errors to user-friendly messages
 */
const ERROR_MAPPINGS: Record<string, string> = {
  'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
  'NetworkError': 'Network error. Please check your connection and try again.',
  'CORS': 'Request blocked. Please try again or contact support.',
  'Not authenticated': 'Your session has expired. Please sign in again.',
  '401': 'Authentication required. Please sign in.',
  '403': 'You don\'t have permission to perform this action.',
  '404': 'The requested resource was not found.',
  '429': 'Too many requests. Please wait a moment and try again.',
  '500': 'Something went wrong on our end. Please try again later.',
  '502': 'Server temporarily unavailable. Please try again.',
  '503': 'Service temporarily unavailable. Please try again later.',
};

/**
 * Sanitize an error message to remove sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  
  // Apply all sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }
  
  // Check for known error mappings
  for (const [key, friendly] of Object.entries(ERROR_MAPPINGS)) {
    if (sanitized.toLowerCase().includes(key.toLowerCase())) {
      return friendly;
    }
  }
  
  // If still contains [redacted], provide generic message
  if (sanitized.includes('[redacted]')) {
    return 'An error occurred. Please try again or contact support.';
  }
  
  // Truncate very long messages
  if (sanitized.length > 200) {
    return sanitized.substring(0, 200) + '...';
  }
  
  return sanitized;
}

/**
 * Create a user-friendly error from any error type
 */
function createUserFriendlyError(error: unknown): Error {
  if (error instanceof Error) {
    return new Error(sanitizeErrorMessage(error.message));
  }
  if (typeof error === 'string') {
    return new Error(sanitizeErrorMessage(error));
  }
  return new Error('An unexpected error occurred. Please try again.');
}

// ============================================
// API CLIENT
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface ApiCallOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request body (will be JSON stringified) */
  body?: Record<string, unknown>;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Skip authentication (for public endpoints) */
  skipAuth?: boolean;
}

/**
 * Make an authenticated API call to an Edge Function
 * 
 * @param endpoint - The function name (e.g., 'api-balance-topup')
 * @param options - Request options
 * @returns Response data or error
 */
export async function callApi<T>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'POST', body, headers = {}, skipAuth = false } = options;
  
  try {
    // Get auth token if needed
    let authHeader = '';
    if (!skipAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { data: null, error: 'Please sign in to continue.' };
      }
      authHeader = `Bearer ${session.access_token}`;
    }
    
    // Build request
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    
    if (authHeader) {
      requestHeaders['Authorization'] = authHeader;
    }
    
    // Make request
    const response = await fetch(`${FUNCTIONS_URL}/${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // Parse response
    let responseData: T | null = null;
    let responseError: string | null = null;
    
    try {
      const json = await response.json();
      if (response.ok) {
        responseData = json as T;
      } else {
        // Extract error message from response
        responseError = json.error || json.message || `Request failed (${response.status})`;
        responseError = sanitizeErrorMessage(responseError);
      }
    } catch {
      if (!response.ok) {
        responseError = sanitizeErrorMessage(`Request failed (${response.status})`);
      }
    }
    
    return { data: responseData, error: responseError };
  } catch (err) {
    const friendlyError = createUserFriendlyError(err);
    return { data: null, error: friendlyError.message };
  }
}

// ============================================
// TYPED ENDPOINT HELPERS
// ============================================

/**
 * Balance top-up endpoint
 */
export interface TopupParams {
  workspaceId: string;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface TopupResponse {
  url: string;
  sessionId: string;
}

export async function createBalanceTopup(params: TopupParams): Promise<ApiResponse<TopupResponse>> {
  return callApi<TopupResponse>('api-balance-topup', {
    body: params as unknown as Record<string, unknown>,
  });
}

/**
 * Auto-reload setup endpoint
 */
export interface AutoReloadSetupParams {
  action: 'setup' | 'toggle' | 'update' | 'remove';
  workspaceId: string;
  thresholdCents?: number;
  reloadAmountCents?: number;
  successUrl?: string;
  cancelUrl?: string;
  enabled?: boolean;
}

export interface AutoReloadSetupResponse {
  url?: string;
  success?: boolean;
}

export async function manageAutoReload(params: AutoReloadSetupParams): Promise<ApiResponse<AutoReloadSetupResponse>> {
  return callApi<AutoReloadSetupResponse>('api-balance-auto-reload', {
    body: params as unknown as Record<string, unknown>,
  });
}

/**
 * Stripe checkout endpoint
 */
export interface CheckoutParams {
  workspaceId: string;
  planType: 'team-pro';
  seatCount?: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

export async function createCheckoutSession(params: CheckoutParams): Promise<ApiResponse<CheckoutResponse>> {
  return callApi<CheckoutResponse>('create-checkout-session', {
    body: params as unknown as Record<string, unknown>,
  });
}

/**
 * Stripe portal endpoint
 */
export interface PortalParams {
  customerId: string;
  returnUrl: string;
}

export interface PortalResponse {
  url: string;
}

export async function createPortalSession(params: PortalParams): Promise<ApiResponse<PortalResponse>> {
  return callApi<PortalResponse>('create-portal-session', {
    body: params as unknown as Record<string, unknown>,
  });
}

/**
 * Update subscription seats endpoint
 */
export interface UpdateSeatsParams {
  subscriptionId: string;
  workspaceId: string;
  seatCount: number;
}

export async function updateSubscriptionSeats(params: UpdateSeatsParams): Promise<ApiResponse<{ success: boolean }>> {
  return callApi<{ success: boolean }>('update-subscription-seats', {
    body: params as unknown as Record<string, unknown>,
  });
}

/**
 * Cancel subscription endpoint
 */
export interface CancelParams {
  subscriptionId: string;
  workspaceId: string;
  immediate?: boolean;
}

export async function cancelSubscription(params: CancelParams): Promise<ApiResponse<{ success: boolean; status: string }>> {
  return callApi<{ success: boolean; status: string }>('cancel-subscription', {
    body: params as unknown as Record<string, unknown>,
  });
}

/**
 * Reactivate subscription endpoint
 */
export interface ReactivateParams {
  subscriptionId: string;
  workspaceId: string;
}

export async function reactivateSubscription(params: ReactivateParams): Promise<ApiResponse<{ success: boolean; status: string }>> {
  return callApi<{ success: boolean; status: string }>('reactivate-subscription', {
    body: params as unknown as Record<string, unknown>,
  });
}

// ============================================
// EXPORTS
// ============================================

export default {
  callApi,
  createBalanceTopup,
  manageAutoReload,
  createCheckoutSession,
  createPortalSession,
  updateSubscriptionSeats,
  cancelSubscription,
  reactivateSubscription,
  // Utilities
  sanitizeErrorMessage,
};
