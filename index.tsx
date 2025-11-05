
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import App from './App';
import { healthCheck } from './lib/config';
import { monitorWebVitals, perfMonitor } from './lib/performance';

// Initialize health check and performance monitoring
healthCheck();
monitorWebVitals();

// Track initial page load
perfMonitor.startTiming('initial-page-load');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Track when the app is fully loaded
window.addEventListener('load', () => {
  perfMonitor.endTiming('initial-page-load');
});
