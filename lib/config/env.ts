/**
 * Environment Variable Validation (Runtime)
 * 
 * This module validates that all required environment variables are present
 * and properly configured before the application starts.
 * 
 * Uses shared configuration from envConfig.shared.js to ensure consistency
 * with build-time validation.
 * 
 * Usage:
 * - Import at app entry point (main.tsx)
 * - Validates in development and production
 * - Throws descriptive errors for missing variables
 */

// Import shared configuration (provides single source of truth)
import {
  REQUIRED_ENV_VARS as REQUIRED_VARS,
  PRODUCTION_REQUIRED_ENV_VARS as PRODUCTION_REQUIRED_VARS,
  IMPORTANT_ENV_VARS,
  RECOMMENDED_ENV_VARS,
  validateEnvVar as sharedValidateEnvVar,
} from './envConfig.shared.js';

interface EnvConfig {
  // Required - Critical for app functionality
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_APP_URL: string;
  
  // Required in production, optional in development
  VITE_STRIPE_PUBLISHABLE_KEY?: string;
  
  // Optional - Degrades gracefully if missing
  VITE_GROQ_ENABLED?: string;
  VITE_GROQ_MODEL?: string;
  VITE_STRIPE_PRICE_POWER_INDIVIDUAL?: string;
  VITE_STRIPE_PRICE_TEAM_PRO_BASE?: string;
  VITE_STRIPE_PRICE_TEAM_PRO_SEAT?: string;
  VITE_APP_NAME?: string;
  VITE_APP_VERSION?: string;
  VITE_ENVIRONMENT?: 'development' | 'staging' | 'production';
  VITE_SENTRY_DSN?: string;
  VITE_ANALYTICS_ID?: string;
}

// Use shared configuration
const REQUIRED_ENV_VARS = REQUIRED_VARS as (keyof EnvConfig)[];
const PRODUCTION_REQUIRED_ENV_VARS = PRODUCTION_REQUIRED_VARS as (keyof EnvConfig)[];
const OPTIONAL_ENV_VARS = [...IMPORTANT_ENV_VARS, ...RECOMMENDED_ENV_VARS] as (keyof EnvConfig)[];

/**
 * Validate a single environment variable using shared validation logic
 */
function validateEnvVar(key: string, value: string | undefined, required: boolean, isProduction: boolean): string | null {
  // Use shared validation
  const result = sharedValidateEnvVar(key, value, required, isProduction);
  
  // Return first error if any
  if (result.errors.length > 0) {
    return result.errors[0];
  }
  
  return null;
}

/**
 * Get all environment variables with type safety
 */
export function getEnvConfig(): EnvConfig {
  return {
    // Required
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
    
    // Optional (may be undefined)
    VITE_GROQ_ENABLED: import.meta.env.VITE_GROQ_ENABLED,
    VITE_GROQ_MODEL: import.meta.env.VITE_GROQ_MODEL,
    VITE_STRIPE_PRICE_POWER_INDIVIDUAL: import.meta.env.VITE_STRIPE_PRICE_POWER_INDIVIDUAL,
    VITE_STRIPE_PRICE_TEAM_PRO_BASE: import.meta.env.VITE_STRIPE_PRICE_TEAM_PRO_BASE,
    VITE_STRIPE_PRICE_TEAM_PRO_SEAT: import.meta.env.VITE_STRIPE_PRICE_TEAM_PRO_SEAT,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID,
  };
}

/**
 * Validate all environment variables
 * Throws error if any required variables are missing or invalid
 */
export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = getEnvConfig();
  
  // Determine if production environment
  const isProduction = env.VITE_ENVIRONMENT === 'production' || !import.meta.env.DEV;
  
  // Validate required variables
  REQUIRED_ENV_VARS.forEach((key) => {
    const value = env[key];
    const error = validateEnvVar(key, value as string, true, isProduction);
    if (error) {
      errors.push(error);
    }
  });
  
  // Validate production-required variables
  if (isProduction) {
    PRODUCTION_REQUIRED_ENV_VARS.forEach((key) => {
      const value = env[key];
      const error = validateEnvVar(key, value as string, true, isProduction);
      if (error) {
        errors.push(error);
      }
    });
  } else {
    // In development, only warn if production-required vars are missing
    PRODUCTION_REQUIRED_ENV_VARS.forEach((key) => {
      const value = env[key];
      if (!value || value.trim() === '') {
        warnings.push(`${key} not set (payment features will be disabled)`);
      }
    });
  }
  
  // Validate optional variables (only check validity if set)
  OPTIONAL_ENV_VARS.forEach((key) => {
    const value = env[key];
    if (value) {
      const error = validateEnvVar(key, value as string, false, isProduction);
      if (error) {
        warnings.push(error);
      }
    }
  });
  
  // Log warnings only for invalid (not missing) optional variables
  if (warnings.length > 0) {
    console.warn('⚠️  Environment Configuration Warnings:');
    warnings.forEach((warning) => console.warn(`   • ${warning}`));
  }
  
  // Throw error if any required variables are missing
  if (errors.length > 0) {
    const errorMessage = [
      '❌ Environment Configuration Error',
      '',
      'The following required environment variables are missing or invalid:',
      ...errors.map((e) => `   • ${e}`),
      '',
      'Please check your .env file or environment variable configuration.',
      'See .env.example for reference.',
    ].join('\n');
    
    throw new Error(errorMessage);
  }
  
  // Log success
  const envName = env.VITE_ENVIRONMENT || 'production';
  console.log(`✅ Environment validated successfully (${envName})`);
  
  // Count optional variables that are actually configured
  const configuredOptional = OPTIONAL_ENV_VARS.filter(key => env[key]).length;
  if (configuredOptional > 0 || import.meta.env.DEV) {
    console.log(`   ℹ️  ${configuredOptional}/${OPTIONAL_ENV_VARS.length} optional features configured`);
  }
}

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  return import.meta.env.VITE_ENVIRONMENT === 'production';
}

/**
 * Check if we're in development environment
 */
export function isDevelopment(): boolean {
  return import.meta.env.VITE_ENVIRONMENT === 'development';
}

/**
 * Check if we're in staging environment
 */
export function isStaging(): boolean {
  return import.meta.env.VITE_ENVIRONMENT === 'staging';
}

/**
 * Get log level based on environment
 */
export function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  if (isDevelopment()) return 'debug';
  if (isStaging()) return 'info';
  return 'warn'; // Production
}

/**
 * Check if feature is enabled based on environment
 */
export function isFeatureEnabled(feature: string): boolean {
  const featureFlags = {
    // Enable detailed logging only in development
    detailedLogging: isDevelopment(),
    
    // Enable source maps in development and staging
    sourceMaps: !isProduction(),
    
    // Enable error tracking in staging and production
    errorTracking: !isDevelopment(),
    
    // Enable analytics in production only
    analytics: isProduction(),
  };
  
  return featureFlags[feature as keyof typeof featureFlags] ?? false;
}
