/**
 * Enrichment Schema Validation Module
 * 
 * Validates and normalizes enrichment data before storage.
 * Ensures field sizes, formats, and content safety.
 */

// ============================================
// CONSTANTS
// ============================================

// Maximum field lengths
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_INDUSTRY_LENGTH = 100;
const MAX_LOCATION_LENGTH = 200;
const MAX_PRODUCT_SUMMARY_LENGTH = 2000;
const MAX_PRICING_INFO_LENGTH = 500;
const MAX_COMPANY_SIZE_LENGTH = 100;
const MAX_FOUNDED_YEAR_LENGTH = 10;
const MAX_KEY_PEOPLE_COUNT = 10;
const MAX_KEY_PERSON_LENGTH = 200;
const MAX_TECH_STACK_COUNT = 20;
const MAX_TECH_ITEM_LENGTH = 100;
const MAX_SOCIAL_URL_LENGTH = 500;

// Valid social link patterns
const LINKEDIN_PATTERN = /^https?:\/\/(www\.)?linkedin\.com\/company\/[\w-]+\/?$/i;
const TWITTER_PATTERN = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[\w-]+\/?$/i;
const GITHUB_PATTERN = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/?$/i;

// ============================================
// TYPES
// ============================================

export interface RawEnrichmentData {
  description?: unknown;
  industry?: unknown;
  location?: unknown;
  productSummary?: unknown;
  pricingInfo?: unknown;
  keyPeople?: unknown;
  companySize?: unknown;
  foundedYear?: unknown;
  techStack?: unknown;
  socialLinks?: unknown;
}

export interface ValidatedEnrichmentData {
  description?: string;
  industry?: string;
  location?: string;
  productSummary?: string;
  pricingInfo?: string;
  keyPeople?: string[];
  companySize?: string;
  foundedYear?: string;
  techStack?: string[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

export interface EnrichmentValidationResult {
  isValid: boolean;
  data: ValidatedEnrichmentData;
  warnings: string[];
  fieldsDropped: string[];
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Sanitize a string: trim, remove null bytes, limit length.
 */
function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  
  if (typeof value !== 'string') {
    return undefined;
  }
  
  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = value
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  if (sanitized.length === 0) {
    return undefined;
  }
  
  // Truncate if needed
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }
  
  return sanitized;
}

/**
 * Validate a URL string.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate and normalize a social link.
 */
function validateSocialUrl(
  url: unknown,
  pattern: RegExp,
  maxLength: number
): string | undefined {
  if (typeof url !== 'string') {
    return undefined;
  }
  
  const trimmed = url.trim();
  
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return undefined;
  }
  
  if (!isValidUrl(trimmed)) {
    return undefined;
  }
  
  if (!pattern.test(trimmed)) {
    return undefined;
  }
  
  return trimmed;
}

/**
 * Validate a founded year string.
 */
function validateFoundedYear(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  
  let yearStr: string;
  
  if (typeof value === 'number') {
    yearStr = String(Math.floor(value));
  } else if (typeof value === 'string') {
    yearStr = value.trim();
  } else {
    return undefined;
  }
  
  // Extract 4-digit year
  const yearMatch = yearStr.match(/\b(19\d{2}|20\d{2})\b/);
  
  if (!yearMatch) {
    return undefined;
  }
  
  const year = parseInt(yearMatch[1], 10);
  const currentYear = new Date().getFullYear();
  
  // Validate year range
  if (year < 1800 || year > currentYear) {
    return undefined;
  }
  
  return yearMatch[1];
}

/**
 * Validate and normalize a string array.
 */
function validateStringArray(
  value: unknown,
  maxCount: number,
  maxItemLength: number
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  
  const result: string[] = [];
  
  for (const item of value) {
    if (result.length >= maxCount) {
      break;
    }
    
    const sanitized = sanitizeString(item, maxItemLength);
    
    if (sanitized) {
      result.push(sanitized);
    }
  }
  
  return result.length > 0 ? result : undefined;
}

// ============================================
// MAIN VALIDATION
// ============================================

/**
 * Validate and normalize enrichment data.
 * Returns cleaned data with validation warnings.
 */
export function validateEnrichmentData(
  raw: RawEnrichmentData
): EnrichmentValidationResult {
  const warnings: string[] = [];
  const fieldsDropped: string[] = [];
  const data: ValidatedEnrichmentData = {};

  // Description
  const description = sanitizeString(raw.description, MAX_DESCRIPTION_LENGTH);
  if (description) {
    data.description = description;
    if (typeof raw.description === 'string' && raw.description.length > MAX_DESCRIPTION_LENGTH) {
      warnings.push(`Description truncated from ${raw.description.length} to ${MAX_DESCRIPTION_LENGTH} chars`);
    }
  } else if (raw.description !== undefined) {
    fieldsDropped.push('description');
  }

  // Industry
  const industry = sanitizeString(raw.industry, MAX_INDUSTRY_LENGTH);
  if (industry) {
    data.industry = industry;
  } else if (raw.industry !== undefined) {
    fieldsDropped.push('industry');
  }

  // Location
  const location = sanitizeString(raw.location, MAX_LOCATION_LENGTH);
  if (location) {
    data.location = location;
  } else if (raw.location !== undefined) {
    fieldsDropped.push('location');
  }

  // Product Summary
  const productSummary = sanitizeString(raw.productSummary, MAX_PRODUCT_SUMMARY_LENGTH);
  if (productSummary) {
    data.productSummary = productSummary;
  } else if (raw.productSummary !== undefined) {
    fieldsDropped.push('productSummary');
  }

  // Pricing Info
  const pricingInfo = sanitizeString(raw.pricingInfo, MAX_PRICING_INFO_LENGTH);
  if (pricingInfo) {
    data.pricingInfo = pricingInfo;
  } else if (raw.pricingInfo !== undefined) {
    fieldsDropped.push('pricingInfo');
  }

  // Company Size
  const companySize = sanitizeString(raw.companySize, MAX_COMPANY_SIZE_LENGTH);
  if (companySize) {
    data.companySize = companySize;
  } else if (raw.companySize !== undefined) {
    fieldsDropped.push('companySize');
  }

  // Founded Year
  const foundedYear = validateFoundedYear(raw.foundedYear);
  if (foundedYear) {
    data.foundedYear = foundedYear;
  } else if (raw.foundedYear !== undefined) {
    fieldsDropped.push('foundedYear');
    warnings.push('Invalid or out-of-range founded year');
  }

  // Key People
  const keyPeople = validateStringArray(raw.keyPeople, MAX_KEY_PEOPLE_COUNT, MAX_KEY_PERSON_LENGTH);
  if (keyPeople) {
    data.keyPeople = keyPeople;
  } else if (raw.keyPeople !== undefined) {
    fieldsDropped.push('keyPeople');
  }

  // Tech Stack
  const techStack = validateStringArray(raw.techStack, MAX_TECH_STACK_COUNT, MAX_TECH_ITEM_LENGTH);
  if (techStack) {
    data.techStack = techStack;
  } else if (raw.techStack !== undefined) {
    fieldsDropped.push('techStack');
  }

  // Social Links
  if (raw.socialLinks && typeof raw.socialLinks === 'object') {
    const socialLinks: ValidatedEnrichmentData['socialLinks'] = {};
    const rawSocial = raw.socialLinks as Record<string, unknown>;
    
    const linkedin = validateSocialUrl(rawSocial.linkedin, LINKEDIN_PATTERN, MAX_SOCIAL_URL_LENGTH);
    if (linkedin) {
      socialLinks.linkedin = linkedin;
    } else if (rawSocial.linkedin !== undefined) {
      warnings.push('Invalid LinkedIn URL format');
    }
    
    const twitter = validateSocialUrl(rawSocial.twitter, TWITTER_PATTERN, MAX_SOCIAL_URL_LENGTH);
    if (twitter) {
      socialLinks.twitter = twitter;
    } else if (rawSocial.twitter !== undefined) {
      warnings.push('Invalid Twitter/X URL format');
    }
    
    const github = validateSocialUrl(rawSocial.github, GITHUB_PATTERN, MAX_SOCIAL_URL_LENGTH);
    if (github) {
      socialLinks.github = github;
    } else if (rawSocial.github !== undefined) {
      warnings.push('Invalid GitHub URL format');
    }
    
    if (Object.keys(socialLinks).length > 0) {
      data.socialLinks = socialLinks;
    }
  } else if (raw.socialLinks !== undefined) {
    fieldsDropped.push('socialLinks');
  }

  return {
    isValid: Object.keys(data).length > 0,
    data,
    warnings,
    fieldsDropped,
  };
}

/**
 * Check if enrichment contains only fallback/placeholder content.
 * These should be flagged to the user, not auto-applied.
 */
export function isFallbackContent(data: ValidatedEnrichmentData, domain: string): boolean {
  if (!data.description) {
    return true;
  }
  
  const desc = data.description.toLowerCase();
  
  // Check for generic placeholder patterns
  const placeholderPatterns = [
    `visit ${domain}`,
    'visit the website',
    'for more information',
    'no information available',
    'could not find',
    'unable to retrieve',
  ];
  
  return placeholderPatterns.some(pattern => desc.includes(pattern.toLowerCase()));
}

/**
 * Calculate confidence score based on available fields.
 */
export function calculateConfidence(data: ValidatedEnrichmentData): number {
  const weights: Record<keyof ValidatedEnrichmentData, number> = {
    description: 0.25,
    industry: 0.15,
    location: 0.15,
    companySize: 0.10,
    foundedYear: 0.10,
    keyPeople: 0.10,
    productSummary: 0.05,
    pricingInfo: 0.03,
    techStack: 0.02,
    socialLinks: 0.05,
  };
  
  let score = 0;
  
  for (const [field, weight] of Object.entries(weights)) {
    const value = data[field as keyof ValidatedEnrichmentData];
    
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length > 0) {
        score += weight;
      } else if (typeof value === 'object' && Object.keys(value).length > 0) {
        score += weight;
      } else if (typeof value === 'string' && value.length > 0) {
        score += weight;
      }
    }
  }
  
  return Math.round(score * 100) / 100;
}

export {
  MAX_DESCRIPTION_LENGTH,
  MAX_INDUSTRY_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_SOCIAL_URL_LENGTH,
};
