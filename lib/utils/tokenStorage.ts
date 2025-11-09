/**
 * Secure token storage utility with expiration support
 * Uses sessionStorage for better security (tokens cleared on browser close)
 */

const TOKEN_KEY = 'pending_invitation_token';
const TOKEN_TIMESTAMP_KEY = 'pending_invitation_token_timestamp';
const TOKEN_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

export interface StoredToken {
  token: string;
  timestamp: number;
}

/**
 * Store an invitation token with current timestamp
 */
export function setInvitationToken(token: string): void {
  try {
    const timestamp = Date.now();
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_TIMESTAMP_KEY, timestamp.toString());
  } catch (error) {
    console.error('[TokenStorage] Error storing token:', error);
  }
}

/**
 * Get invitation token if it exists and hasn't expired
 * Returns null if token is expired or doesn't exist
 */
export function getInvitationToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const timestampStr = sessionStorage.getItem(TOKEN_TIMESTAMP_KEY);

    if (!token || !timestampStr) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    const age = Date.now() - timestamp;

    // Check if token has expired
    if (age > TOKEN_EXPIRATION_MS) {
      clearInvitationToken();
      return null;
    }

    return token;
  } catch (error) {
    console.error('[TokenStorage] Error retrieving token:', error);
    return null;
  }
}

/**
 * Clear stored invitation token
 */
export function clearInvitationToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_TIMESTAMP_KEY);
  } catch (error) {
    console.error('[TokenStorage] Error clearing token:', error);
  }
}

/**
 * Check if token exists and is still valid
 */
export function hasValidInvitationToken(): boolean {
  return getInvitationToken() !== null;
}

/**
 * Get time remaining before token expires (in milliseconds)
 * Returns 0 if token doesn't exist or has expired
 */
export function getTokenTimeRemaining(): number {
  try {
    const timestampStr = sessionStorage.getItem(TOKEN_TIMESTAMP_KEY);
    
    if (!timestampStr) {
      return 0;
    }

    const timestamp = parseInt(timestampStr, 10);
    const age = Date.now() - timestamp;
    const remaining = TOKEN_EXPIRATION_MS - age;

    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('[TokenStorage] Error checking token age:', error);
    return 0;
  }
}

/**
 * Migrate any existing tokens from localStorage to sessionStorage
 * This is a one-time migration helper
 */
export function migrateFromLocalStorage(): void {
  try {
    const oldToken = localStorage.getItem('pending_invitation_token');
    
    if (oldToken) {
      // Store in new location with current timestamp
      setInvitationToken(oldToken);
      // Remove from old location
      localStorage.removeItem('pending_invitation_token');
      console.log('[TokenStorage] Migrated token from localStorage to sessionStorage');
    }
  } catch (error) {
    console.error('[TokenStorage] Error migrating token:', error);
  }
}
