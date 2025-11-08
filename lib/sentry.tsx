import * as Sentry from '@sentry/react';
import React from 'react';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * 
 * Features:
 * - Automatic error capture for unhandled exceptions
 * - Performance monitoring with tracing
 * - Breadcrumbs for user actions
 * - Release tracking for source maps
 * - User context for debugging
 */
export const initializeSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';
  
  // Only initialize if DSN is provided and not in development
  if (!dsn || dsn === 'your_sentry_dsn_here') {
    console.log('[Sentry] Skipping initialization - no DSN configured');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    
    // Capture 100% of errors in development, 100% in production (adjust as needed)
    sampleRate: 1.0,
    
    // Release tracking for source maps (set via build process)
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    
    // Ignore common errors that don't require tracking
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'atomicFindClose',
      // Random network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      // Supabase session errors (handled gracefully)
      'Invalid Refresh Token',
      'Auth session missing',
    ],
    
    // Don't send personally identifiable information
    beforeSend(event, hint) {
      // Filter out sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
          // Don't send console logs with sensitive keywords
          if (breadcrumb.category === 'console') {
            const message = breadcrumb.message || '';
            if (message.includes('password') || message.includes('token') || message.includes('secret')) {
              return false;
            }
          }
          return true;
        });
      }
      
      // Redact sensitive form data
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data.password) data.password = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.apiKey) data.apiKey = '[REDACTED]';
      }
      
      return event;
    },
  });

  console.log(`[Sentry] Initialized in ${environment} mode`);
};

/**
 * Set user context for Sentry error tracking
 */
export const setUser = (user: { id: string; email: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Set workspace context for Sentry error tracking
 */
export const setWorkspaceContext = (workspace: { id: string; name: string; planType: string } | null) => {
  if (workspace) {
    Sentry.setContext('workspace', {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.planType,
    });
  } else {
    Sentry.setContext('workspace', null);
  }
};

/**
 * Track critical user actions as breadcrumbs
 */
export const trackAction = (action: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: action,
    level: 'info',
    data: data || {},
  });
};

/**
 * Manually capture an error
 */
export const captureError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    contexts: {
      custom: context || {},
    },
  });
};

/**
 * Capture a message (for non-error logging)
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Create an error boundary component with Sentry
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Fallback component for error boundaries
 * Matches Sentry's errorData signature
 */
export const ErrorFallback = ({ error, componentStack, eventId, resetError }: {
  error: unknown;
  componentStack: string;
  eventId: string;
  resetError: () => void;
}) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white border-4 border-black shadow-neo-lg p-8 max-w-lg w-full">
        <div className="text-6xl mb-4 text-center">⚠️</div>
        <h1 className="text-3xl font-bold mb-4 text-center">Something went wrong</h1>
        <p className="text-gray-600 mb-6 text-center">
          We've been notified of this error and will fix it as soon as possible.
        </p>
        
        <div className="bg-gray-100 border-2 border-black p-4 mb-6 font-mono text-sm overflow-auto max-h-40">
          <strong>Error:</strong> {errorMessage}
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={resetError}
            className="flex-1 px-6 py-3 bg-yellow-400 text-black font-bold border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-6 py-3 bg-white text-black font-bold border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            Go Home
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-6 text-center">
          Error ID: {eventId || 'N/A'}
        </p>
      </div>
    </div>
  );
};

/**
 * Performance monitoring helpers (simplified)
 * For advanced performance monitoring, upgrade to @sentry/tracing
 */
export const measurePerformance = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name} completed in ${duration.toFixed(2)}ms`,
      level: 'info',
      data: { duration },
    });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name} failed after ${duration.toFixed(2)}ms`,
      level: 'error',
      data: { duration },
    });
    throw error;
  }
};
