/**
 * Production-safe logging utility
 * 
 * In production, only error logs are emitted.
 * In development, all log levels are available.
 * 
 * Usage:
 *   import { logger } from '@/lib/utils/logger'
 *   logger.info('User logged in', { userId })
 *   logger.warn('API rate limit approaching', { remaining: 10 })
 *   logger.error('Failed to save data', error)
 *   logger.debug('Component rendered', { props })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  timestamp: boolean;
}

class Logger {
  private config: LoggerConfig;
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    const env = import.meta.env.VITE_ENVIRONMENT || 'development';
    const isProduction = env === 'production';

    this.config = {
      enabled: !isProduction,
      level: isProduction ? 'error' : 'debug',
      timestamp: !isProduction,
    };
  }

  /**
   * Check if a log level should be emitted based on current config
   */
  private shouldLog(level: LogLevel): boolean {
    if (level === 'error') {
      // Always log errors, even in production
      return true;
    }

    if (!this.config.enabled) {
      return false;
    }

    return this.levelPriority[level] >= this.levelPriority[this.config.level];
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, context?: any): any[] {
    const parts: any[] = [];

    if (this.config.timestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }

    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);

    if (context !== undefined) {
      parts.push(context);
    }

    return parts;
  }

  /**
   * Log debug information (development only)
   * Use for detailed debugging information
   */
  debug(message: string, context?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage('debug', message, context));
    }
  }

  /**
   * Log informational messages (development only)
   * Use for general application flow information
   */
  info(message: string, context?: any): void {
    if (this.shouldLog('info')) {
      console.log(...this.formatMessage('info', message, context));
    }
  }

  /**
   * Log warning messages (development only)
   * Use for recoverable issues or deprecation warnings
   */
  warn(message: string, context?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, context));
    }
  }

  /**
   * Log error messages (always logged, including production)
   * Use for errors and exceptions that need attention
   */
  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      const context = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      
      console.error(...this.formatMessage('error', message, context));
    }
  }

  /**
   * Create a namespaced logger for a specific module/component
   * Example: const log = logger.namespace('AuthService')
   */
  namespace(name: string): NamespacedLogger {
    return new NamespacedLogger(name, this);
  }

  /**
   * Configure logger at runtime (useful for testing)
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current logger configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

/**
 * Namespaced logger that prefixes all messages with a namespace
 */
class NamespacedLogger {
  constructor(
    private namespace: string,
    private parent: Logger
  ) {}

  debug(message: string, context?: any): void {
    this.parent.debug(`[${this.namespace}] ${message}`, context);
  }

  info(message: string, context?: any): void {
    this.parent.info(`[${this.namespace}] ${message}`, context);
  }

  warn(message: string, context?: any): void {
    this.parent.warn(`[${this.namespace}] ${message}`, context);
  }

  error(message: string, error?: Error | any): void {
    this.parent.error(`[${this.namespace}] ${message}`, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for consumers who want to create namespaced loggers
export type { Logger, NamespacedLogger };
