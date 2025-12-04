/**
 * Enrichment Observability Module
 * 
 * Provides structured logging, metrics, and monitoring for enrichment operations.
 * Scrubs sensitive data from logs in production.
 */

// ============================================
// TYPES
// ============================================

export interface EnrichmentMetrics {
  requestId: string;
  workspaceId: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  cached: boolean;
  provider: string | null;
  errorType: string | null;
  retryCount: number;
  confidenceScore: number | null;
  fieldsEnriched: string[];
}

export interface LogContext {
  requestId: string;
  workspaceId?: string;
  userId?: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================
// CONFIGURATION
// ============================================

// Environment detection (Deno)
const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || 
                     Deno.env.get('NODE_ENV') === 'production';

// Fields to scrub in production
const SENSITIVE_FIELDS = new Set([
  'url',
  'urls',
  'domain',
  'companyName',
  'company',
  'description',
  'keyPeople',
  'email',
  'linkedin',
  'twitter',
  'github',
  'apiKey',
  'token',
  'authorization',
]);

// ============================================
// REQUEST ID GENERATION
// ============================================

/**
 * Generate a unique request ID for tracing.
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `enr-${timestamp}-${random}`;
}

// ============================================
// DATA SCRUBBING
// ============================================

/**
 * Scrub sensitive data from log payload in production.
 */
function scrubSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  if (!isProduction) {
    return data;
  }
  
  const scrubbed: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      if (typeof value === 'string') {
        // Show length but not content
        scrubbed[key] = `[SCRUBBED:${value.length}chars]`;
      } else if (Array.isArray(value)) {
        scrubbed[key] = `[SCRUBBED:${value.length}items]`;
      } else {
        scrubbed[key] = '[SCRUBBED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively scrub nested objects
      if (Array.isArray(value)) {
        scrubbed[key] = value.map(item => 
          typeof item === 'object' && item !== null
            ? scrubSensitiveData(item as Record<string, unknown>)
            : item
        );
      } else {
        scrubbed[key] = scrubSensitiveData(value as Record<string, unknown>);
      }
    } else {
      scrubbed[key] = value;
    }
  }
  
  return scrubbed;
}

/**
 * Mask a domain for logging (show TLD only in prod).
 */
export function maskDomain(domain: string): string {
  if (!isProduction) {
    return domain;
  }
  
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return `***.${parts.slice(-2).join('.')}`;
  }
  return '***';
}

// ============================================
// STRUCTURED LOGGING
// ============================================

/**
 * Log a structured message with context.
 */
function logStructured(
  level: LogLevel,
  message: string,
  context: LogContext,
  data?: Record<string, unknown>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'fetch-company-content',
    requestId: context.requestId,
    workspaceId: context.workspaceId ? maskId(context.workspaceId) : undefined,
    userId: context.userId ? maskId(context.userId) : undefined,
    message,
    ...(data ? scrubSensitiveData(data) : {}),
  };
  
  // Use appropriate console method
  switch (level) {
    case 'debug':
      if (!isProduction) console.debug(JSON.stringify(logEntry));
      break;
    case 'info':
      console.info(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
  }
}

/**
 * Mask a UUID for logging (show last 4 chars).
 */
function maskId(id: string): string {
  if (!isProduction || id.length < 8) {
    return id;
  }
  return `***${id.slice(-4)}`;
}

// ============================================
// LOGGER FACTORY
// ============================================

export interface Logger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  withContext: (ctx: Partial<LogContext>) => Logger;
}

/**
 * Create a logger with request context.
 */
export function createLogger(context: LogContext): Logger {
  return {
    debug: (message, data) => logStructured('debug', message, context, data),
    info: (message, data) => logStructured('info', message, context, data),
    warn: (message, data) => logStructured('warn', message, context, data),
    error: (message, data) => logStructured('error', message, context, data),
    withContext: (ctx) => createLogger({ ...context, ...ctx }),
  };
}

// ============================================
// METRICS RECORDING
// ============================================

/**
 * Record enrichment metrics for monitoring.
 * In a production setup, this would send to a metrics service.
 */
export async function recordMetrics(metrics: EnrichmentMetrics): Promise<void> {
  // Log metrics in structured format
  console.info(JSON.stringify({
    type: 'ENRICHMENT_METRICS',
    ...metrics,
    workspaceId: maskId(metrics.workspaceId),
  }));
  
  // In production, you would also:
  // 1. Send to a metrics service (Datadog, CloudWatch, etc.)
  // 2. Update aggregated counters in database
  // 3. Trigger alerts if error rate exceeds threshold
  
  // Store metrics in database for dashboards
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('enrichment_metrics')
        .insert({
          request_id: metrics.requestId,
          workspace_id: metrics.workspaceId,
          duration_ms: metrics.durationMs,
          success: metrics.success,
          cached: metrics.cached,
          provider: metrics.provider,
          error_type: metrics.errorType,
          retry_count: metrics.retryCount,
          confidence_score: metrics.confidenceScore,
          fields_enriched: metrics.fieldsEnriched,
          created_at: metrics.timestamp,
        });
    }
  } catch (err) {
    // Don't fail the request if metrics recording fails
    console.warn('Failed to record metrics:', err);
  }
}

// ============================================
// ERROR CATEGORIZATION
// ============================================

export type ErrorCategory = 
  | 'auth_error'
  | 'rate_limit'
  | 'balance_error'
  | 'validation_error'
  | 'provider_error'
  | 'timeout_error'
  | 'circuit_breaker'
  | 'cache_error'
  | 'internal_error';

/**
 * Categorize an error for metrics and alerting.
 */
export function categorizeError(error: string): ErrorCategory {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('auth') || lowerError.includes('session') || lowerError.includes('unauthorized')) {
    return 'auth_error';
  }
  if (lowerError.includes('rate limit') || lowerError.includes('too many requests') || lowerError.includes('429')) {
    return 'rate_limit';
  }
  if (lowerError.includes('balance') || lowerError.includes('insufficient') || lowerError.includes('payment')) {
    return 'balance_error';
  }
  if (lowerError.includes('invalid') || lowerError.includes('validation') || lowerError.includes('required')) {
    return 'validation_error';
  }
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return 'timeout_error';
  }
  if (lowerError.includes('circuit') || lowerError.includes('breaker')) {
    return 'circuit_breaker';
  }
  if (lowerError.includes('groq') || lowerError.includes('youcom') || lowerError.includes('provider')) {
    return 'provider_error';
  }
  if (lowerError.includes('cache')) {
    return 'cache_error';
  }
  
  return 'internal_error';
}

/**
 * Format error for user display (hide internal details).
 */
export function formatUserError(error: string, category: ErrorCategory): string {
  switch (category) {
    case 'auth_error':
      return 'Authentication required. Please sign in and try again.';
    case 'rate_limit':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'balance_error':
      return 'Insufficient API balance. Please top up your account.';
    case 'validation_error':
      // Return the actual validation error as it's user-facing
      return error;
    case 'timeout_error':
      return 'The enrichment service is temporarily slow. Please try again.';
    case 'circuit_breaker':
      return 'Enrichment service is temporarily unavailable. Please try again later.';
    case 'provider_error':
      return 'Unable to fetch company information. Please try again later.';
    case 'cache_error':
    case 'internal_error':
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

export { isProduction };
