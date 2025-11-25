/**
 * Consent Manager
 * 
 * Manages user consent for telemetry (analytics, error tracking)
 * Required for GDPR/CCPA compliance
 */

const CONSENT_KEY = 'fhq_telemetry_consent';
const CONSENT_VERSION = 1; // Increment when consent requirements change

export type ConsentStatus = 'granted' | 'denied' | 'pending';

export interface ConsentState {
  version: number;
  analytics: boolean;
  errorTracking: boolean;
  timestamp: string;
}

export const consentManager = {
  /**
   * Get current consent state
   */
  getConsent(): ConsentState | null {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) return null;
      
      const consent = JSON.parse(stored) as ConsentState;
      
      // Check if consent version is outdated
      if (consent.version !== CONSENT_VERSION) {
        // Consent needs to be re-collected
        return null;
      }
      
      return consent;
    } catch {
      return null;
    }
  },

  /**
   * Set consent state
   */
  setConsent(analytics: boolean, errorTracking: boolean): void {
    const state: ConsentState = {
      version: CONSENT_VERSION,
      analytics,
      errorTracking,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    
    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('consent-changed', { detail: state }));
  },

  /**
   * Check if user has made a consent decision
   */
  hasConsented(): boolean {
    return this.getConsent() !== null;
  },

  /**
   * Check if analytics tracking is allowed
   */
  canTrackAnalytics(): boolean {
    const consent = this.getConsent();
    return consent?.analytics ?? false;
  },

  /**
   * Check if error tracking is allowed
   */
  canTrackErrors(): boolean {
    const consent = this.getConsent();
    return consent?.errorTracking ?? false;
  },

  /**
   * Revoke all consent
   */
  revokeConsent(): void {
    localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new CustomEvent('consent-revoked'));
  },

  /**
   * Grant all consent (convenience method)
   */
  acceptAll(): void {
    this.setConsent(true, true);
  },

  /**
   * Deny all consent (convenience method)
   */
  denyAll(): void {
    this.setConsent(false, false);
  },

  /**
   * Get consent status string
   */
  getStatus(): ConsentStatus {
    const consent = this.getConsent();
    if (!consent) return 'pending';
    return (consent.analytics || consent.errorTracking) ? 'granted' : 'denied';
  }
};

export default consentManager;
