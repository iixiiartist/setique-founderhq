/**
 * Rate Limit Alert Component
 * 
 * Listens for rate limit events from the metrics collector and displays
 * user-friendly warnings when sustained rate limiting is detected.
 */

import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { metricsCollector, RateLimitEvent } from '../../lib/utils/observability';
import { toastConfig } from '../../lib/utils/toast';

// Minimum interval between alert toasts (prevent spam)
const ALERT_COOLDOWN_MS = 30000; // 30 seconds

export const RateLimitAlert: React.FC = () => {
  const lastAlertTime = useRef(0);
  const dismissedUntil = useRef(0);

  useEffect(() => {
    // Subscribe to rate limit alerts
    const checkRateLimits = () => {
      // Check if we're in cooldown
      const now = Date.now();
      if (now < dismissedUntil.current) return;
      if (now - lastAlertTime.current < ALERT_COOLDOWN_MS) return;

      // Check for recent rate limits
      const recentLimits = metricsCollector.getRecentRateLimits(60000); // Last minute
      
      if (recentLimits.length >= 3) {
        lastAlertTime.current = now;
        showRateLimitToast(recentLimits);
      }
    };

    // Check periodically
    const interval = setInterval(checkRateLimits, 10000);

    return () => clearInterval(interval);
  }, []);

  const showRateLimitToast = (events: RateLimitEvent[]) => {
    toast(
      (t) => (
        <div className="flex items-start gap-3 max-w-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Slow down there!</p>
            <p className="text-sm text-gray-600 mt-1">
              We're receiving a lot of requests. Please wait a moment before trying again.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  // Dismiss alerts for 5 minutes
                  dismissedUntil.current = Date.now() + 5 * 60 * 1000;
                }}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded font-medium transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  // Suggest page refresh
                  toast(
                    'Refreshing the page may help if you\'re experiencing issues.',
                    { icon: <RefreshCw className="w-4 h-4" />, duration: 5000 }
                  );
                }}
                className="text-xs px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded font-medium transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      ),
      {
        ...toastConfig,
        duration: 10000,
        style: {
          ...toastConfig.style,
          padding: '16px',
          maxWidth: '400px',
        },
      }
    );
  };

  // This component doesn't render anything visible
  return null;
};

/**
 * Hook version for components that need programmatic access
 */
export function useRateLimitWarning() {
  const shouldBackoff = metricsCollector.shouldBackoff();
  const recentLimits = metricsCollector.getRecentRateLimits(30000);

  return {
    isRateLimited: shouldBackoff,
    recentHits: recentLimits.length,
    shouldDelay: shouldBackoff,
  };
}

export default RateLimitAlert;
