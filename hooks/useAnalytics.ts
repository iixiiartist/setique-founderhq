import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics, EventProperties, UserProperties } from '../lib/services/analytics';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to track page views on route changes
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    analytics.page({
      path: location.pathname,
      title: document.title,
    });
  }, [location]);
}

/**
 * Hook to identify user when authenticated
 */
export function useUserTracking() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      analytics.identify(user.id, {
        email: user.email,
        userId: user.id,
      });
    } else {
      analytics.reset();
    }
  }, [user?.id, user?.email]);
}

/**
 * Hook to track events with convenience methods
 */
export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, properties?: EventProperties) => {
    analytics.track(eventName, properties);
  }, []);

  const trackClick = useCallback((elementName: string, properties?: EventProperties) => {
    analytics.track('click', {
      element: elementName,
      ...properties,
    });
  }, []);

  const trackFormSubmit = useCallback((formName: string, properties?: EventProperties) => {
    analytics.track('form_submit', {
      form: formName,
      ...properties,
    });
  }, []);

  const trackError = useCallback((error: Error, context?: EventProperties) => {
    analytics.trackError(error, context);
  }, []);

  const trackPerformance = useCallback((metric: string, duration: number, metadata?: EventProperties) => {
    analytics.trackPerformance({
      metric: metric as any,
      duration,
      metadata,
    });
  }, []);

  return {
    track: trackEvent,
    trackClick,
    trackFormSubmit,
    trackError,
    trackPerformance,
  };
}

/**
 * Hook to track component mount/unmount
 */
export function useComponentTracking(componentName: string) {
  const { track } = useAnalytics();

  useEffect(() => {
    const mountTime = Date.now();
    track('component_mount', { component: componentName });

    return () => {
      const duration = Date.now() - mountTime;
      track('component_unmount', {
        component: componentName,
        duration_ms: duration,
      });
    };
  }, [componentName, track]);
}

/**
 * Hook to track feature usage
 */
export function useFeatureTracking(featureName: string) {
  const { track } = useAnalytics();

  const trackFeatureUse = useCallback((action: string, properties?: EventProperties) => {
    track('feature_use', {
      feature: featureName,
      action,
      ...properties,
    });
  }, [featureName, track]);

  return { trackFeatureUse };
}
