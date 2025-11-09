/**
 * Console utility for managing logging levels
 * In production, only errors are shown
 * In development, you can control verbosity
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.VITE_ENVIRONMENT === 'production';
const ENABLE_DEBUG_LOGS = false; // Set to true to enable debug logs in development

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

/**
 * Logger that respects environment and settings
 * Usage: logger.info('Message', optionalContext)
 */
export const logger = {
  /**
   * Always show errors - these are logged in all environments
   * Use for critical issues that need immediate attention
   */
  error: (...args: any[]) => {
    originalConsole.error(...args);
  },

  /**
   * Show warnings in development only
   * Use for deprecations, potential issues, or recoverable errors
   */
  warn: (...args: any[]) => {
    if (!isProduction) {
      originalConsole.warn(...args);
    }
  },

  /**
   * Show info only in development
   * Use for general application flow information
   */
  info: (...args: any[]) => {
    if (!isProduction) {
      originalConsole.info(...args);
    }
  },

  /**
   * Show debug logs only when explicitly enabled in development
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDev && ENABLE_DEBUG_LOGS) {
      originalConsole.debug(...args);
    }
  },

  /**
   * Show regular logs only in development when debug is enabled
   * Use for general purpose logging during development
   */
  log: (...args: any[]) => {
    if (!isProduction) {
      originalConsole.log(...args);
    }
  },
};

/**
 * Disable console.log in production to clean up console
 * Keeps errors visible for debugging
 */
export const disableProductionLogs = () => {
  if (!isDev) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    // Keep console.warn and console.error for important messages
  }
};

/**
 * Performance logger - only logs if operation takes longer than threshold
 */
export const logPerformance = (label: string, startTime: number, threshold: number = 1000) => {
  const duration = Date.now() - startTime;
  if (duration > threshold && isDev) {
    originalConsole.warn(`⚠️ [Performance] ${label} took ${duration}ms (threshold: ${threshold}ms)`);
  }
};

/**
 * Grouped console logs for better organization
 */
export const logGroup = (title: string, callback: () => void) => {
  if (isDev && ENABLE_DEBUG_LOGS) {
    console.group(title);
    callback();
    console.groupEnd();
  }
};
