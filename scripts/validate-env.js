#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */

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

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Import shared environment configuration
import {
  REQUIRED_ENV_VARS,
  PRODUCTION_REQUIRED_ENV_VARS,
  IMPORTANT_ENV_VARS,
  RECOMMENDED_ENV_VARS,
  validateEnvVar as sharedValidateEnvVar,
} from '../lib/config/envConfig.shared.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Server-side secrets that are not exposed to the client bundle but are
// critical for backend integrations (e.g., Supabase Edge Functions, automation).
const SERVER_ONLY_VARS = [
  {
    name: 'YOUCOM_API_KEY',
    description: 'Required for You.com Search and Agent integrations',
  },
];

// Re-export from shared config for consistency
const REQUIRED_VARS = REQUIRED_ENV_VARS;
const IMPORTANT_VARS = IMPORTANT_ENV_VARS;
const RECOMMENDED_VARS = RECOMMENDED_ENV_VARS;

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
 * Validate a single environment variable using shared validation logic
 */
function validateVar(varName, required = true) {
  const value = process.env[varName];
  const isProduction = process.env.VITE_ENVIRONMENT === 'production';
  
  // Use shared validation logic
  const result = sharedValidateEnvVar(varName, value, required, isProduction);
  
  // Add "optional but recommended" warning if not required and not set
  if (!required && (!value || value.trim() === '') && result.warnings.length === 0) {
    result.warnings.push(`${varName} is not set (optional but recommended)`);
  }
  
  return result;
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
  
  // Validate production-required variables
  const isProduction = environment === 'production';
  if (isProduction) {
    log('\nProduction-Required Variables:', colors.bright);
    PRODUCTION_REQUIRED_ENV_VARS.forEach((varName) => {
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
  }
  
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

  // Warn about missing server-only secrets (do not fail build yet)
  log('\nServer-Only Secrets:', colors.bright);
  SERVER_ONLY_VARS.forEach(({ name, description }) => {
    if (process.env[name]?.trim()) {
      log(`  🔐 ${name}: Set`, colors.green);
    } else {
      const warning = `${name} is not set (${description})`;
      log(`  ⚠️  ${warning}`, colors.yellow);
      allWarnings.push(warning);
    }
  });
  
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
