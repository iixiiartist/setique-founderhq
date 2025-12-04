/**
 * Debug logger that only outputs in development mode.
 * Use this instead of console.log/warn/error for debug statements.
 * 
 * SECURITY: This ensures sensitive data (prompts, AI responses, workspace stats)
 * is not logged in production builds.
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

interface LoggerContext {
  [key: string]: unknown;
}

/**
 * Debug logger - only logs in development mode
 */
export const debug = {
  log: (tag: string, message: string, context?: LoggerContext) => {
    if (isDev) {
      console.log(`[${tag}] ${message}`, context ?? '');
    }
  },
  
  warn: (tag: string, message: string, context?: LoggerContext) => {
    if (isDev) {
      console.warn(`[${tag}] ${message}`, context ?? '');
    }
  },
  
  error: (tag: string, message: string, error?: unknown) => {
    // Errors are always logged, but with sanitized output in production
    if (isDev) {
      console.error(`[${tag}] ${message}`, error);
    } else {
      // In production, log minimal error info without sensitive data
      console.error(`[${tag}] ${message}`);
    }
  },
  
  info: (tag: string, message: string, context?: LoggerContext) => {
    if (isDev) {
      console.info(`[${tag}] ${message}`, context ?? '');
    }
  },
};

/**
 * For errors that should be tracked but not expose sensitive data
 * Use this for production-safe error logging
 */
export const logError = (tag: string, message: string, error?: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[${tag}] ${message}: ${errorMessage}`);
};

export default debug;
