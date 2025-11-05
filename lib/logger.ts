/**
 * Console utility for managing logging levels
 * In production, only errors are shown
 * In development, you can control verbosity
 */

const isDev = import.meta.env.DEV;
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
 */
export const logger = {
  // Always show errors
  error: (...args: any[]) => {
    originalConsole.error(...args);
  },

  // Show warnings in development or when important
  warn: (...args: any[]) => {
    if (isDev) {
      originalConsole.warn(...args);
    }
  },

  // Show info only in development
  info: (...args: any[]) => {
    if (isDev) {
      originalConsole.info(...args);
    }
  },

  // Show debug logs only when explicitly enabled
  debug: (...args: any[]) => {
    if (isDev && ENABLE_DEBUG_LOGS) {
      originalConsole.debug(...args);
    }
  },

  // Show regular logs only in development
  log: (...args: any[]) => {
    if (isDev && ENABLE_DEBUG_LOGS) {
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
