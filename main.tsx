import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import App from './App'
import { healthCheck } from './lib/config'
import { monitorWebVitals, perfMonitor } from './lib/performance'
import { disableProductionLogs } from './lib/logger'
import './index.css'

// Disable verbose console logs in production
disableProductionLogs()

// Initialize health check and performance monitoring
healthCheck()
monitorWebVitals()

// Track initial page load
perfMonitor.startTiming('initial-page-load')

const container = document.getElementById('root')!
const root = createRoot(container)

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

// Track when the app is fully loaded
window.addEventListener('load', () => {
  perfMonitor.endTiming('initial-page-load')
})