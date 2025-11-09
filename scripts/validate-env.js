#!/usr/bin/env node

/**
 * Pre-Build Environment Validation Script
 * 
 * This script runs before the build to ensure all required environment
 * variables are properly configured. It provides clear error messages
 * and prevents builds with missing configuration.
 * 
 * Usage:
 *   node scripts/validate-env.js
 *   
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation errors found
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Required environment variables
const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_APP_URL',
];

// Optional but important variables (will warn if missing)
const IMPORTANT_VARS = [
  // Note: Groq API key (GROQ_API_KEY) is server-side only in Supabase secrets
  'VITE_STRIPE_PRICE_POWER_INDIVIDUAL',
  'VITE_STRIPE_PRICE_TEAM_PRO_BASE',
  'VITE_STRIPE_PRICE_TEAM_PRO_SEAT',
  'VITE_APP_NAME',
  'VITE_APP_VERSION',
  'VITE_ENVIRONMENT',
];

// Optional but recommended
const RECOMMENDED_VARS = [
  'VITE_SENTRY_DSN',
];

// Validation rules
const VALIDATION_RULES = {
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
    if (process.env.VITE_ENVIRONMENT === 'production' && value.startsWith('pk_test_')) {
      return 'Production build requires live Stripe key (pk_live_)';
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
    if (process.env.VITE_ENVIRONMENT === 'production' && !value.startsWith('https://')) {
      return 'Production build requires HTTPS URL';
    }
    return null;
  },
};

/**
 * Load environment variables from .env file if exists
 */
function loadEnvFile() {
  const envFile = path.join(process.cwd(), '.env');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

/**
 * Print colored console output
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Validate a single environment variable
 */
function validateVar(varName, required = true) {
  const value = process.env[varName];
  const errors = [];
  const warnings = [];
  
  // Check if exists
  if (!value || value.trim() === '') {
    if (required) {
      errors.push(`${varName} is not set`);
    } else {
      warnings.push(`${varName} is not set (optional but recommended)`);
    }
    return { errors, warnings };
  }
  
  // Check for placeholder values
  if (value.includes('your_') || value.includes('xxx')) {
    errors.push(`${varName} contains placeholder value`);
    return { errors, warnings };
  }
  
  // Run custom validation
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
 * Main validation function
 */
function validate() {
  loadEnvFile();
  
  // Check if running in CI environment
  const isCI = process.env.CI === 'true' || process.env.CI === '1';
  const isCIReview = isCI && (
    process.env.ENVIRONMENT === 'review' || 
    process.env.GITHUB_REF?.includes('pull') ||
    process.env.VERCEL_ENV === 'preview'
  );
  
  // Skip strict validation in CI review/preview environments
  if (isCIReview) {
    log('\n🔍 CI Review Environment Detected\n', colors.blue);
    log('ℹ️  Running in CI review/preview environment', colors.yellow);
    log('ℹ️  Skipping strict environment validation', colors.yellow);
    log('ℹ️  Build will use fallback values where needed\n', colors.yellow);
    process.exit(0);
  }
  
  log('\n🔍 Validating Environment Configuration...\n', colors.blue);
  
  const environment = process.env.VITE_ENVIRONMENT || 'unknown';
  log(`Environment: ${environment}`, colors.bright);
  log(`Node Version: ${process.version}`, colors.bright);
  log('');
  
  const allErrors = [];
  const allWarnings = [];
  
  // Validate required variables
  log('Required Variables:', colors.bright);
  REQUIRED_VARS.forEach((varName) => {
    const { errors, warnings } = validateVar(varName, true);
    
    if (errors.length > 0) {
      log(`  ❌ ${varName}`, colors.red);
      errors.forEach((err) => log(`     ${err}`, colors.red));
      allErrors.push(...errors);
    } else {
      const value = process.env[varName];
      const displayValue = value.length > 20 ? `${value.substring(0, 20)}...` : value;
      log(`  ✅ ${varName}: ${displayValue}`, colors.green);
    }
    
    allWarnings.push(...warnings);
  });
  
  // Validate important variables
  log('\nImportant Variables:', colors.bright);
  IMPORTANT_VARS.forEach((varName) => {
    const { errors, warnings } = validateVar(varName, false);
    
    if (errors.length > 0) {
      log(`  ❌ ${varName}`, colors.red);
      errors.forEach((err) => log(`     ${err}`, colors.red));
      allErrors.push(...errors);
    } else if (!process.env[varName]) {
      log(`  ⚠️  ${varName}: Not set`, colors.yellow);
      allWarnings.push(`${varName} is not set (important)`);
    } else {
      const value = process.env[varName];
      const displayValue = value.length > 20 ? `${value.substring(0, 20)}...` : value;
      log(`  ✅ ${varName}: ${displayValue}`, colors.green);
      allWarnings.push(...warnings);
    }
  });
  
  // Validate recommended variables
  log('\nRecommended Variables:', colors.bright);
  RECOMMENDED_VARS.forEach((varName) => {
    const { errors, warnings } = validateVar(varName, false);
    
    if (errors.length > 0) {
      log(`  ❌ ${varName}`, colors.red);
      errors.forEach((err) => log(`     ${err}`, colors.red));
      allErrors.push(...errors);
    } else if (!process.env[varName]) {
      log(`  ⚠️  ${varName}: Not set`, colors.yellow);
      allWarnings.push(`${varName} is not set (recommended)`);
    } else {
      log(`  ✅ ${varName}: Set`, colors.green);
      allWarnings.push(...warnings);
    }
  });
  
  // Print summary
  log('', colors.reset);
  log('━'.repeat(60), colors.bright);
  
  if (allWarnings.length > 0) {
    log(`\n⚠️  Warnings (${allWarnings.length}):`, colors.yellow);
    allWarnings.forEach((warning) => log(`   ${warning}`, colors.yellow));
  }
  
  if (allErrors.length > 0) {
    log(`\n❌ Validation Failed (${allErrors.length} errors)`, colors.red + colors.bright);
    log('\nPlease fix the above errors before building.', colors.red);
    log('See docs/PRODUCTION_DEPLOYMENT.md for configuration guide.\n', colors.reset);
    process.exit(1);
  }
  
  log('\n✅ Environment Validation Passed!', colors.green + colors.bright);
  log('Proceeding with build...\n', colors.reset);
  process.exit(0);
}

// Run validation
validate();
