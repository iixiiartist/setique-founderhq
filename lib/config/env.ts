/**
 * Environment Variable Validation
 * 
 * This module validates that all required environment variables are present
 * and properly configured before the application starts.
 * 
 * Usage:
 * - Import at app entry point (main.tsx)
 * - Validates in development and production
 * - Throws descriptive errors for missing variables
 */

interface EnvConfig {
  // Required - Critical for app functionality
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_STRIPE_PUBLISHABLE_KEY: string;
  VITE_APP_URL: string;
  
  // Optional - Degrades gracefully if missing
  VITE_GEMINI_API_KEY?: string;
  VITE_STRIPE_PRICE_POWER_INDIVIDUAL?: string;
  VITE_STRIPE_PRICE_TEAM_PRO_BASE?: string;
  VITE_STRIPE_PRICE_TEAM_PRO_SEAT?: string;
  VITE_APP_NAME?: string;
  VITE_APP_VERSION?: string;
  VITE_ENVIRONMENT?: 'development' | 'staging' | 'production';
  VITE_SENTRY_DSN?: string;
  VITE_ANALYTICS_ID?: string;
}

/**
 * Required environment variables for the application to function
 * These are critical and will block startup if missing
 */
const REQUIRED_ENV_VARS: (keyof EnvConfig)[] = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_APP_URL',
];

/**
 * Optional environment variables (won't block startup)
 */
const OPTIONAL_ENV_VARS: (keyof EnvConfig)[] = [
  'VITE_GEMINI_API_KEY',
  'VITE_STRIPE_PRICE_POWER_INDIVIDUAL',
  'VITE_STRIPE_PRICE_TEAM_PRO_BASE',
  'VITE_STRIPE_PRICE_TEAM_PRO_SEAT',
  'VITE_APP_NAME',
  'VITE_APP_VERSION',
  'VITE_ENVIRONMENT',
  'VITE_SENTRY_DSN',
  'VITE_ANALYTICS_ID',
];

/**
 * Environment-specific validation rules
 */
const ENV_VALIDATION_RULES = {
  VITE_SUPABASE_URL: (value: string) => {
    if (!value.startsWith('https://') && !value.startsWith('http://')) {
      return 'Supabase URL must start with https:// or http://';
    }
    if (!value.includes('.supabase.co')) {
      return 'Supabase URL must be a valid Supabase domain';
    }
    return null;
  },
  
  VITE_STRIPE_PUBLISHABLE_KEY: (value: string) => {
    if (!value.startsWith('pk_test_') && !value.startsWith('pk_live_')) {
      return 'Stripe publishable key must start with pk_test_ or pk_live_';
    }
    return null;
  },
  
  VITE_ENVIRONMENT: (value: string) => {
    const validEnvs = ['development', 'staging', 'production'];
    if (!validEnvs.includes(value)) {
      return `Environment must be one of: ${validEnvs.join(', ')}`;
    }
    return null;
  },
  
  VITE_APP_URL: (value: string) => {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return 'App URL must start with http:// or https://';
    }
    return null;
  },
};

/**
 * Validate a single environment variable
 */
function validateEnvVar(key: string, value: string | undefined, required: boolean): string | null {
  // Check if value exists
  if (!value || value.trim() === '') {
    if (required) {
      return `Missing required environment variable: ${key}`;
    }
    return null; // Optional variable not set
  }
  
  // Run custom validation if exists
  const validator = ENV_VALIDATION_RULES[key as keyof typeof ENV_VALIDATION_RULES];
  if (validator) {
    const error = validator(value);
    if (error) {
      return `Invalid ${key}: ${error}`;
    }
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
    VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
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
  
  // Validate required variables
  REQUIRED_ENV_VARS.forEach((key) => {
    const value = env[key];
    const error = validateEnvVar(key, value as string, true);
    if (error) {
      errors.push(error);
    }
  });
  
  // Validate optional variables (only check validity if set, don't warn if missing)
  OPTIONAL_ENV_VARS.forEach((key) => {
    const value = env[key];
    if (value) {
      const error = validateEnvVar(key, value as string, false);
      if (error) {
        warnings.push(error);
      }
    }
  });
  
  // Log warnings only for invalid (not missing) optional variables
  if (warnings.length > 0) {
    console.warn('⚠️  Environment Configuration Warnings:');
    warnings.forEach((warning) => console.warn(`   ${warning}`));
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
