import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { SupabaseErrorFallback } from './components/shared/SupabaseErrorFallback'
import App from './App'
import { healthCheck } from './lib/config'
import { monitorWebVitals, perfMonitor } from './lib/performance'
import { disableProductionLogs } from './lib/logger'
import { validateEnvironment } from './lib/config/env'
import { metricsCollector } from './lib/utils/observability'
import './index.css'

// Force cache invalidation - build 1762568900

// Validate environment variables before app starts
try {
  validateEnvironment()
} catch (error) {
  console.error(error)
  // In production, show user-friendly error instead of blank screen
  if (import.meta.env.VITE_ENVIRONMENT === 'production') {
    document.getElementById('root')!.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; padding: 20px; text-align: center;">
        <div>
          <h1 style="color: #e53e3e; margin-bottom: 16px;">Configuration Error</h1>
          <p style="color: #4a5568; margin-bottom: 24px;">The application is not properly configured. Please contact support.</p>
          <p style="color: #718096; font-size: 14px;">Error details have been logged to the console.</p>
        </div>
      </div>
    `
  }
  throw error
}

// Try to initialize Supabase early to catch configuration errors
// Wrapped in async IIFE for broader browser compatibility (avoids top-level await)
let supabaseInitError: Error | null = null;

(async () => {
  try {
    // Import supabase to trigger initialization and validation
    await import('./lib/supabase')
  } catch (error) {
    console.error('Supabase initialization error:', error)
    supabaseInitError = error as Error
    
    // Re-render if initialization failed after initial render
    if (container && root) {
      root.render(
        <React.StrictMode>
          <SupabaseErrorFallback error={supabaseInitError} />
        </React.StrictMode>
      )
    }
  }
})()

// Disable verbose console logs in production
disableProductionLogs()

// Start metrics collection for observability
metricsCollector.start({
  onReport: (summary) => {
    // In production, you could send this to an analytics service
    if (summary.totalRateLimited > 0 || summary.slowQueries.length > 0) {
      console.warn('[Metrics] Performance issues detected:', {
        rateLimited: summary.totalRateLimited,
        slowQueries: summary.slowQueries.length,
        avgDuration: summary.avgDuration,
      });
    }
  },
  onRateLimitAlert: (events) => {
    console.error('[Metrics] 🚨 Rate limit alert!', events.length, 'hits');
  },
});

// Initialize health check and performance monitoring
healthCheck()
monitorWebVitals()

// Track initial page load
perfMonitor.startTiming('initial-page-load')

const container = document.getElementById('root')!
const root = createRoot(container)

// If Supabase failed to initialize, show error fallback
if (supabaseInitError) {
  root.render(
    <React.StrictMode>
      <SupabaseErrorFallback error={supabaseInitError} />
    </React.StrictMode>
  )
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
}

// Track when the app is fully loaded
window.addEventListener('load', () => {
  perfMonitor.endTiming('initial-page-load')
})