/**
 * Analytics & Tracking Service
 * 
 * Provides a unified interface for tracking user events, page views, and errors
 * across multiple analytics providers (Google Analytics, Mixpanel, Segment, etc.)
 */

import { logger } from '../logger';
import { consentManager } from './consentManager';

// Analytics providers
type AnalyticsProvider = 'google' | 'mixpanel' | 'segment' | 'posthog';

// Event properties
interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

// User properties
interface UserProperties {
  userId?: string;
  email?: string;
  name?: string;
  workspaceId?: string;
  planType?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Page view properties
interface PageViewProperties {
  path: string;
  title?: string;
  referrer?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Performance metrics
interface PerformanceMetrics {
  metric: 'page_load' | 'api_call' | 'render_time' | 'interaction';
  duration: number;
  metadata?: EventProperties;
}

// Configuration
interface AnalyticsConfig {
  enabled: boolean;
  providers: AnalyticsProvider[];
  debug: boolean;
  anonymizeIp?: boolean;
  respectDoNotTrack?: boolean;
}

class AnalyticsService {
  private config: AnalyticsConfig;
  private initialized = false;
  private userId: string | null = null;
  private userProperties: UserProperties = {};

  constructor() {
    const mode = import.meta.env.MODE;
    const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED;
    
    this.config = {
      enabled: analyticsEnabled === 'true',
      providers: [],
      debug: mode === 'development',
      anonymizeIp: true,
      respectDoNotTrack: true,
    };
    
    this.config.providers = this.getEnabledProviders();
  }

  /**
   * Get list of enabled analytics providers from environment
   */
  private getEnabledProviders(): AnalyticsProvider[] {
    const providers: AnalyticsProvider[] = [];
    
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      providers.push('google');
    }
    if (import.meta.env.VITE_MIXPANEL_TOKEN) {
      providers.push('mixpanel');
    }
    if (import.meta.env.VITE_SEGMENT_WRITE_KEY) {
      providers.push('segment');
    }
    if (import.meta.env.VITE_POSTHOG_KEY) {
      providers.push('posthog');
    }
    
    return providers;
  }

  /**
   * Initialize analytics service
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('[Analytics] Already initialized');
      return;
    }

    // Check consent first
    if (!consentManager.canTrackAnalytics()) {
      logger.info('[Analytics] Skipping - no consent');
      return;
    }

    // Check Do Not Track
    if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      logger.info('[Analytics] Do Not Track enabled, analytics disabled');
      this.config.enabled = false;
      return;
    }

    if (!this.config.enabled) {
      logger.info('[Analytics] Analytics disabled');
      return;
    }

    // Initialize providers
    this.initializeProviders();
    this.initialized = true;

    if (this.config.debug) {
      logger.info('[Analytics] Initialized with providers:', this.config.providers);
    }
  }

  /**
   * Check if Do Not Track is enabled
   */
  private isDoNotTrackEnabled(): boolean {
    return (
      navigator.doNotTrack === '1' ||
      (window as any).doNotTrack === '1' ||
      (navigator as any).msDoNotTrack === '1'
    );
  }

  /**
   * Initialize analytics providers
   */
  private initializeProviders(): void {
    this.config.providers.forEach((provider) => {
      switch (provider) {
        case 'google':
          this.initializeGoogleAnalytics();
          break;
        case 'mixpanel':
          this.initializeMixpanel();
          break;
        case 'segment':
          this.initializeSegment();
          break;
        case 'posthog':
          this.initializePostHog();
          break;
      }
    });
  }

  /**
   * Initialize Google Analytics
   */
  private initializeGoogleAnalytics(): void {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!measurementId) return;

    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(arguments);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      anonymize_ip: this.config.anonymizeIp,
      send_page_view: false, // We'll send manually
    });

    if (this.config.debug) {
      logger.info('[Analytics] Google Analytics initialized');
    }
  }

  /**
   * Initialize Mixpanel
   */
  private initializeMixpanel(): void {
    const token = import.meta.env.VITE_MIXPANEL_TOKEN;
    if (!token) return;

    // Load Mixpanel SDK
    (function (c, a) {
      if (!(window as any).mixpanel) {
        const b = (window as any).mixpanel = {
          __SV: 1.2,
          track: function () {},
          identify: function () {},
          people: { set: function () {} },
        };
      }
    })(document, window);

    if (this.config.debug) {
      logger.info('[Analytics] Mixpanel initialized');
    }
  }

  /**
   * Initialize Segment
   */
  private initializeSegment(): void {
    const writeKey = import.meta.env.VITE_SEGMENT_WRITE_KEY;
    if (!writeKey) return;

    // Load Segment Analytics.js
    const analytics = ((window as any).analytics = (window as any).analytics || []);
    if (!analytics.initialize) {
      if (analytics.invoked) {
        logger.error('[Analytics] Segment snippet included twice');
      } else {
        analytics.invoked = true;
        analytics.methods = ['trackSubmit', 'trackClick', 'trackLink', 'track', 'identify', 'page'];
        analytics.factory = function (method: string) {
          return function (...args: any[]) {
            args.unshift(method);
            analytics.push(args);
            return analytics;
          };
        };
        for (let i = 0; i < analytics.methods.length; i++) {
          const key = analytics.methods[i];
          analytics[key] = analytics.factory(key);
        }
        analytics.load = function (key: string) {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          script.src = `https://cdn.segment.com/analytics.js/v1/${key}/analytics.min.js`;
          const first = document.getElementsByTagName('script')[0];
          first.parentNode?.insertBefore(script, first);
        };
        analytics.load(writeKey);
      }
    }

    if (this.config.debug) {
      logger.info('[Analytics] Segment initialized');
    }
  }

  /**
   * Initialize PostHog
   */
  private initializePostHog(): void {
    const apiKey = import.meta.env.VITE_POSTHOG_KEY;
    const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
    if (!apiKey) return;

    // Load PostHog SDK
    (function (t: any, e: any) {
      const o = e.createElement('script');
      o.type = 'text/javascript';
      o.async = true;
      o.src = 'https://cdn.posthog.com/array.js';
      const i = e.getElementsByTagName('script')[0];
      i.parentNode.insertBefore(o, i);
      (t as any).posthog = {
        init: function () {},
        capture: function () {},
        identify: function () {},
      };
    })(window, document);

    if (this.config.debug) {
      logger.info('[Analytics] PostHog initialized');
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string, properties?: UserProperties): void {
    if (!this.config.enabled || !this.initialized) return;

    this.userId = userId;
    this.userProperties = { ...this.userProperties, ...properties, userId };

    // Send to each provider
    this.config.providers.forEach((provider) => {
      switch (provider) {
        case 'google':
          if ((window as any).gtag) {
            (window as any).gtag('set', 'user_id', userId);
            (window as any).gtag('set', 'user_properties', properties);
          }
          break;
        case 'mixpanel':
          if ((window as any).mixpanel) {
            (window as any).mixpanel.identify(userId);
            (window as any).mixpanel.people.set(properties);
          }
          break;
        case 'segment':
          if ((window as any).analytics) {
            (window as any).analytics.identify(userId, properties);
          }
          break;
        case 'posthog':
          if ((window as any).posthog) {
            (window as any).posthog.identify(userId, properties);
          }
          break;
      }
    });

    if (this.config.debug) {
      logger.info('[Analytics] User identified:', userId, properties);
    }
  }

  /**
   * Track an event
   */
  track(eventName: string, properties?: EventProperties): void {
    if (!this.config.enabled || !this.initialized) return;

    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      ...this.userProperties,
    };

    // Send to each provider
    this.config.providers.forEach((provider) => {
      switch (provider) {
        case 'google':
          if ((window as any).gtag) {
            (window as any).gtag('event', eventName, enrichedProperties);
          }
          break;
        case 'mixpanel':
          if ((window as any).mixpanel) {
            (window as any).mixpanel.track(eventName, enrichedProperties);
          }
          break;
        case 'segment':
          if ((window as any).analytics) {
            (window as any).analytics.track(eventName, enrichedProperties);
          }
          break;
        case 'posthog':
          if ((window as any).posthog) {
            (window as any).posthog.capture(eventName, enrichedProperties);
          }
          break;
      }
    });

    if (this.config.debug) {
      logger.info('[Analytics] Event tracked:', eventName, enrichedProperties);
    }
  }

  /**
   * Track a page view
   */
  page(properties?: PageViewProperties): void {
    if (!this.config.enabled || !this.initialized) return;

    const pageProperties = {
      path: window.location.pathname,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      ...properties,
    };

    // Send to each provider
    this.config.providers.forEach((provider) => {
      switch (provider) {
        case 'google':
          if ((window as any).gtag) {
            (window as any).gtag('event', 'page_view', pageProperties);
          }
          break;
        case 'mixpanel':
          if ((window as any).mixpanel) {
            (window as any).mixpanel.track('Page View', pageProperties);
          }
          break;
        case 'segment':
          if ((window as any).analytics) {
            (window as any).analytics.page(pageProperties);
          }
          break;
        case 'posthog':
          if ((window as any).posthog) {
            (window as any).posthog.capture('$pageview', pageProperties);
          }
          break;
      }
    });

    if (this.config.debug) {
      logger.info('[Analytics] Page view tracked:', pageProperties);
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: PerformanceMetrics): void {
    if (!this.config.enabled || !this.initialized) return;

    this.track('performance_metric', {
      metric_type: metrics.metric,
      duration_ms: metrics.duration,
      ...metrics.metadata,
    });
  }

  /**
   * Track an error
   */
  trackError(error: Error, context?: EventProperties): void {
    if (!this.config.enabled || !this.initialized) return;

    this.track('error', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }

  /**
   * Reset analytics (logout)
   */
  reset(): void {
    if (!this.config.enabled || !this.initialized) return;

    this.userId = null;
    this.userProperties = {};

    // Reset each provider
    this.config.providers.forEach((provider) => {
      switch (provider) {
        case 'mixpanel':
          if ((window as any).mixpanel) {
            (window as any).mixpanel.reset();
          }
          break;
        case 'segment':
          if ((window as any).analytics) {
            (window as any).analytics.reset();
          }
          break;
        case 'posthog':
          if ((window as any).posthog) {
            (window as any).posthog.reset();
          }
          break;
      }
    });

    if (this.config.debug) {
      logger.info('[Analytics] Reset');
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export types
export type { EventProperties, UserProperties, PageViewProperties, PerformanceMetrics };
