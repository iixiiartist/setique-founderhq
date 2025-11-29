// lib/utils/agentValidation.ts
// Validation utilities for agent inputs

export const VALIDATION_LIMITS = {
  TARGET_MAX_LENGTH: 200,
  NOTES_MAX_LENGTH: 2000,
  MAX_URLS: 10,
  URL_MAX_LENGTH: 2000,
} as const;

/**
 * Validates a URL string
 * @returns true if valid http/https URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.length > VALIDATION_LIMITS.URL_MAX_LENGTH) return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Parse and validate comma-separated URLs
 * @returns Array of valid URLs (filters out invalid ones)
 */
export function parseAndValidateUrls(urlString: string): { 
  validUrls: string[]; 
  invalidCount: number;
  error?: string;
} {
  if (!urlString.trim()) {
    return { validUrls: [], invalidCount: 0 };
  }

  const urls = urlString
    .split(',')
    .map(u => u.trim())
    .filter(Boolean);

  if (urls.length > VALIDATION_LIMITS.MAX_URLS) {
    return {
      validUrls: [],
      invalidCount: urls.length,
      error: `Maximum ${VALIDATION_LIMITS.MAX_URLS} URLs allowed`,
    };
  }

  const validUrls: string[] = [];
  let invalidCount = 0;

  for (const url of urls) {
    if (isValidUrl(url)) {
      validUrls.push(url);
    } else {
      invalidCount++;
    }
  }

  return { validUrls, invalidCount };
}

/**
 * Sanitize text input - removes potentially dangerous characters
 */
export function sanitizeText(text: string): string {
  // Remove null bytes and other control characters (except newlines and tabs)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate target input
 */
export function validateTarget(target: string): {
  isValid: boolean;
  error?: string;
  sanitized: string;
} {
  const sanitized = sanitizeText(target.trim());
  
  if (!sanitized) {
    return { isValid: false, error: 'Target is required', sanitized };
  }
  
  if (sanitized.length > VALIDATION_LIMITS.TARGET_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Target must be ${VALIDATION_LIMITS.TARGET_MAX_LENGTH} characters or less`,
      sanitized,
    };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Validate notes input
 */
export function validateNotes(notes: string): {
  isValid: boolean;
  error?: string;
  sanitized: string;
} {
  const sanitized = sanitizeText(notes.trim());
  
  if (sanitized.length > VALIDATION_LIMITS.NOTES_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Notes must be ${VALIDATION_LIMITS.NOTES_MAX_LENGTH} characters or less`,
      sanitized,
    };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Get remaining character count for a field
 */
export function getRemainingChars(text: string, maxLength: number): number {
  return Math.max(0, maxLength - text.length);
}
