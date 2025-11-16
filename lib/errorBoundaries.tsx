/**
 * Component-Level Error Boundaries
 * Wraps individual features to prevent full app crashes
 */

import React, { Component, ReactNode } from 'react';
import { logger } from './utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  level?: 'component' | 'section' | 'page';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Granular error boundary for component isolation
 * Prevents single component errors from crashing the entire app
 */
export class ComponentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, level = 'component' } = this.props;

    // Log error
    logger.error(`[ErrorBoundary:${level}] Caught error:`, {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys = [] } = this.props;
    const { hasError } = this.state;

    // Reset error boundary if resetKeys change
    if (hasError && resetKeys.length > 0) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback based on level
      return <DefaultErrorFallback error={error} onReset={this.reset} level={level} />;
    }

    return children;
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  onReset,
  level,
}: {
  error: Error;
  onReset: () => void;
  level: string;
}) {
  const isComponent = level === 'component';

  return (
    <div
      className={`${
        isComponent ? 'p-4 border-2' : 'p-6 border-4'
      } border-red-500 bg-red-50 rounded-none`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-bold text-red-900 mb-1">
            {isComponent ? 'Component Error' : 'Section Error'}
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={onReset}
            className="text-sm px-3 py-1 bg-red-600 text-white border-2 border-red-900 font-bold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for imperative error boundary reset
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    throw error;
  }

  const showError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { showError, resetError };
}

/**
 * Async error boundary wrapper for Suspense
 */
export function AsyncBoundary({
  children,
  fallback,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}) {
  return (
    <ComponentErrorBoundary
      fallback={fallback}
      onError={(error) => onError?.(error)}
      level="section"
    >
      <React.Suspense
        fallback={
          fallback || (
            <div className="p-6 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ComponentErrorBoundary>
  );
}

/**
 * Wrapper for sections that might fail independently
 */
export function SectionBoundary({
  children,
  sectionName,
}: {
  children: ReactNode;
  sectionName: string;
}) {
  return (
    <ComponentErrorBoundary
      level="section"
      onError={(error) => {
        logger.error(`[Section:${sectionName}] Error:`, error);
      }}
    >
      {children}
    </ComponentErrorBoundary>
  );
}
