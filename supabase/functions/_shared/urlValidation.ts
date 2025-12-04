/**
 * URL Validation & SSRF Protection Module
 * 
 * Provides strict URL validation and SSRF protection for the enrichment function.
 * Blocks internal IPs, enforces HTTPS, validates domains, and applies size limits.
 */

// ============================================
// CONSTANTS
// ============================================

// Maximum URL length
const MAX_URL_LENGTH = 2048;

// Maximum number of URLs per request
const MAX_URLS_PER_REQUEST = 3;

// Maximum payload size (in bytes)
const MAX_PAYLOAD_SIZE = 10_000; // 10KB

// Blocked private/internal IP ranges (SSRF protection)
const BLOCKED_IP_PATTERNS = [
  // IPv4 private ranges
  /^127\./,                          // Loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./,     // Class B private
  /^192\.168\./,                     // Class C private
  /^169\.254\./,                     // Link-local
  /^0\./,                            // "This" network
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./, // Carrier-grade NAT
  // IPv6 patterns
  /^::1$/,                           // Loopback
  /^fe80:/i,                         // Link-local
  /^fc00:/i,                         // Unique local
  /^fd/i,                            // Unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'local',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',        // GCP metadata
  'metadata.google',
  '169.254.169.254',                 // AWS/GCP metadata
  'metadata',
  'kubernetes.default',              // K8s
  'kubernetes.default.svc',
  'kubernetes.default.svc.cluster.local',
]);

// Allowed TLDs (basic validation)
const BLOCKED_TLDS = new Set([
  'local',
  'internal',
  'localhost',
  'invalid',
  'example',
  'test',
  'intranet',
  'corp',
  'home',
  'lan',
]);

// ============================================
// TYPES
// ============================================

export interface URLValidationResult {
  isValid: boolean;
  normalizedUrl: string | null;
  domain: string | null;
  companyName: string | null;
  error: string | null;
}

export interface PayloadValidationResult {
  isValid: boolean;
  error: string | null;
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate and normalize a URL for enrichment.
 * Enforces HTTPS, blocks internal addresses, and applies security checks.
 */
export function validateEnrichmentUrl(urlInput: string): URLValidationResult {
  if (!urlInput || typeof urlInput !== 'string') {
    return {
      isValid: false,
      normalizedUrl: null,
      domain: null,
      companyName: null,
      error: 'URL is required',
    };
  }

  // Trim and check length
  const trimmedUrl = urlInput.trim();
  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      normalizedUrl: null,
      domain: null,
      companyName: null,
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    };
  }

  // Must contain a dot (basic domain validation)
  if (!trimmedUrl.includes('.')) {
    return {
      isValid: false,
      normalizedUrl: null,
      domain: null,
      companyName: null,
      error: 'Invalid URL: must contain a valid domain',
    };
  }

  // Normalize URL
  let normalizedUrl: string;
  try {
    // Add protocol if missing
    const urlWithProtocol = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
      ? trimmedUrl
      : `https://${trimmedUrl}`;
    
    const parsed = new URL(urlWithProtocol);
    
    // SECURITY: Enforce HTTPS only
    if (parsed.protocol !== 'https:') {
      // Upgrade to HTTPS
      parsed.protocol = 'https:';
    }

    // Get the hostname
    const hostname = parsed.hostname.toLowerCase();

    // SECURITY: Block internal hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return {
        isValid: false,
        normalizedUrl: null,
        domain: null,
        companyName: null,
        error: 'Internal or reserved addresses are not allowed',
      };
    }

    // SECURITY: Check for IP-based hostnames
    if (isIPAddress(hostname)) {
      // Check against blocked IP patterns
      if (isBlockedIP(hostname)) {
        return {
          isValid: false,
          normalizedUrl: null,
          domain: null,
          companyName: null,
          error: 'Private/internal IP addresses are not allowed',
        };
      }
    }

    // SECURITY: Check TLD
    const tld = hostname.split('.').pop()?.toLowerCase();
    if (tld && BLOCKED_TLDS.has(tld)) {
      return {
        isValid: false,
        normalizedUrl: null,
        domain: null,
        companyName: null,
        error: 'Invalid or internal domain TLD',
      };
    }

    // SECURITY: Check for suspicious patterns
    if (hasSuspiciousPattern(hostname)) {
      return {
        isValid: false,
        normalizedUrl: null,
        domain: null,
        companyName: null,
        error: 'Suspicious URL pattern detected',
      };
    }

    // SECURITY: Block URLs with auth credentials
    if (parsed.username || parsed.password) {
      return {
        isValid: false,
        normalizedUrl: null,
        domain: null,
        companyName: null,
        error: 'URLs with credentials are not allowed',
      };
    }

    // SECURITY: Block non-standard ports (only allow 443 for HTTPS)
    if (parsed.port && parsed.port !== '443') {
      return {
        isValid: false,
        normalizedUrl: null,
        domain: null,
        companyName: null,
        error: 'Non-standard ports are not allowed',
      };
    }

    // Build normalized URL (protocol + host, no path for base domain)
    normalizedUrl = `${parsed.protocol}//${parsed.host}`;
    
    // Extract domain without www
    const domain = hostname.replace(/^www\./, '');
    
    // Extract company name from domain
    const domainParts = domain.split('.');
    const companyName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);

    return {
      isValid: true,
      normalizedUrl,
      domain,
      companyName,
      error: null,
    };

  } catch (e) {
    return {
      isValid: false,
      normalizedUrl: null,
      domain: null,
      companyName: null,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Check if a string is an IP address.
 */
function isIPAddress(hostname: string): boolean {
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  // IPv6
  if (hostname.includes(':')) {
    return true;
  }
  return false;
}

/**
 * Check if an IP address is in a blocked range.
 */
function isBlockedIP(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some(pattern => pattern.test(ip));
}

/**
 * Check for suspicious patterns in hostname.
 */
function hasSuspiciousPattern(hostname: string): boolean {
  // Check for encoded characters that might bypass filters
  if (hostname.includes('%')) return true;
  
  // Check for Unicode/IDN attacks (basic)
  if (/[\x00-\x1f\x7f-\xff]/.test(hostname)) return true;
  
  // Check for double dots (potential path traversal)
  if (hostname.includes('..')) return true;
  
  // Check for suspicious subdomains
  const suspiciousSubdomains = [
    'admin',
    'internal',
    'intranet',
    'private',
    'secret',
    'api',
    'staging',
    'dev',
    'test',
    'debug',
  ];
  
  const parts = hostname.split('.');
  if (parts.some(p => suspiciousSubdomains.includes(p.toLowerCase()))) {
    // Allow if it's part of a legitimate domain (not at the beginning)
    if (parts.length <= 2) return true;
  }
  
  return false;
}

// ============================================
// PAYLOAD VALIDATION
// ============================================

/**
 * Validate the request payload for security and size limits.
 */
export function validatePayload(
  body: unknown
): PayloadValidationResult {
  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      error: 'Invalid request body',
    };
  }

  const payload = body as Record<string, unknown>;

  // Check URLs array
  if (!payload.urls || !Array.isArray(payload.urls)) {
    return {
      isValid: false,
      error: 'urls array is required',
    };
  }

  if (payload.urls.length === 0) {
    return {
      isValid: false,
      error: 'urls array must not be empty',
    };
  }

  if (payload.urls.length > MAX_URLS_PER_REQUEST) {
    return {
      isValid: false,
      error: `Maximum ${MAX_URLS_PER_REQUEST} URLs per request`,
    };
  }

  // Validate each URL is a string
  for (const url of payload.urls) {
    if (typeof url !== 'string') {
      return {
        isValid: false,
        error: 'All URLs must be strings',
      };
    }
  }

  // Check workspace ID format if provided
  if (payload.workspaceId) {
    if (typeof payload.workspaceId !== 'string') {
      return {
        isValid: false,
        error: 'workspaceId must be a string',
      };
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.workspaceId)) {
      return {
        isValid: false,
        error: 'Invalid workspaceId format',
      };
    }
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Check if request body exceeds maximum size.
 * Call this before parsing JSON.
 */
export async function checkPayloadSize(
  req: Request
): Promise<PayloadValidationResult> {
  const contentLength = req.headers.get('content-length');
  
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    return {
      isValid: false,
      error: `Request body exceeds maximum size of ${MAX_PAYLOAD_SIZE} bytes`,
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

export { MAX_URL_LENGTH, MAX_URLS_PER_REQUEST, MAX_PAYLOAD_SIZE };
