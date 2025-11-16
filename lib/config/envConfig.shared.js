/**
 * Shared Environment Variable Configuration
 * 
 * This module defines the single source of truth for environment variable
 * requirements and validation rules. It's used by both:
 * - Pre-build validation script (scripts/validate-env.js)
 * - Runtime validation (lib/config/env.ts)
 * 
 * This prevents drift between build-time and runtime validation.
 */

// Required environment variables (critical for app functionality)
export const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_APP_URL',
];

// Required only in production (optional in development)
export const PRODUCTION_REQUIRED_ENV_VARS = [
  'VITE_STRIPE_PUBLISHABLE_KEY',
];

// Important but optional (will warn if missing)
export const IMPORTANT_ENV_VARS = [
  'VITE_STRIPE_PRICE_POWER_INDIVIDUAL',
  'VITE_STRIPE_PRICE_TEAM_PRO_BASE',
  'VITE_STRIPE_PRICE_TEAM_PRO_SEAT',
  'VITE_APP_NAME',
  'VITE_APP_VERSION',
  'VITE_ENVIRONMENT',
];

// Optional but recommended
export const RECOMMENDED_ENV_VARS = [
  'VITE_SENTRY_DSN',
  'VITE_GROQ_ENABLED',
  'VITE_GROQ_MODEL',
];

/**
 * Validation rules for environment variables
 * Returns null if valid, error message string if invalid
 */
export const VALIDATION_RULES = {
  VITE_SUPABASE_URL: (value) => {
    if (!value.startsWith('https://') && !value.startsWith('http://')) {
      return 'Must start with https:// or http://';
    }
    if (!value.includes('.supabase.co')) {
      return 'Must be a valid Supabase domain';
    }
    return null;
  },
  
  VITE_STRIPE_PUBLISHABLE_KEY: (value) => {
    if (!value.startsWith('pk_test_') && !value.startsWith('pk_live_')) {
      return 'Must start with pk_test_ or pk_live_';
    }
    return null;
  },
  
  VITE_ENVIRONMENT: (value) => {
    const validEnvs = ['development', 'staging', 'production'];
    if (!validEnvs.includes(value)) {
      return `Must be one of: ${validEnvs.join(', ')}`;
    }
    return null;
  },
  
  VITE_APP_URL: (value) => {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return 'Must start with http:// or https://';
    }
    return null;
  },
};

/**
 * Validate a single environment variable
 * @param {string} varName - Name of the environment variable
 * @param {string|undefined} value - Value of the environment variable
 * @param {boolean} required - Whether the variable is required
 * @param {boolean} isProduction - Whether running in production environment
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateEnvVar(varName, value, required, isProduction = false) {
  const errors = [];
  const warnings = [];
  
  // Check if exists
  if (!value || value.trim() === '') {
    if (required) {
      errors.push(`${varName} is not set`);
    }
    return { errors, warnings };
  }
  
  // Check for placeholder values
  if (value.includes('your_') || value.includes('xxx') || value.includes('your-key-here')) {
    errors.push(`${varName} contains placeholder value - please set a real value`);
    return { errors, warnings };
  }
  
  // Production-specific validation
  if (isProduction) {
    if (varName === 'VITE_STRIPE_PUBLISHABLE_KEY' && value.startsWith('pk_test_')) {
      errors.push(`${varName}: Production build requires live Stripe key (pk_live_)`);
    }
    
    if (varName === 'VITE_APP_URL' && !value.startsWith('https://')) {
      errors.push(`${varName}: Production build requires HTTPS URL`);
    }
    
    if (varName === 'VITE_ENVIRONMENT' && value !== 'production') {
      warnings.push(`${varName}: Set to '${value}' but building for production`);
    }
  }
  
  // Run custom validation if exists
  const validator = VALIDATION_RULES[varName];
  if (validator) {
    const error = validator(value);
    if (error) {
      errors.push(`${varName}: ${error}`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Get all environment variable categories for validation
 */
export function getEnvVarCategories() {
  return {
    required: REQUIRED_ENV_VARS,
    productionRequired: PRODUCTION_REQUIRED_ENV_VARS,
    important: IMPORTANT_ENV_VARS,
    recommended: RECOMMENDED_ENV_VARS,
  };
}
