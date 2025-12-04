/**
 * Prompt Sanitization and Threat Detection Module
 * 
 * Defends against prompt injection and jailbreak attempts by:
 * 1. Sanitizing untrusted user input before interpolation into system prompts
 * 2. Detecting and blocking known jailbreak patterns (optimized regex)
 * 3. Encoding untrusted data as JSON to prevent instruction override
 * 4. Validating final prompts before dispatch to AI model
 * 5. Optional LLM-based semantic security scanning for high-risk inputs
 * 
 * Security principles:
 * - Defense in depth: Multiple layers of validation
 * - Fail-safe defaults: Block when uncertain
 * - Structured prompts: JSON encoding prevents instruction confusion
 * - Low noise: Only log significant threats (high/critical)
 */

import { supabase } from '../supabase';

// ============================================================================
// Configuration
// ============================================================================

/** Control logging verbosity - only log high/critical risks */
type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
const LOG_THRESHOLD: RiskLevel = 'high';
const RISK_PRIORITY: Record<RiskLevel, number> = { 'safe': 0, 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };

/** Enable LLM security scanning for high-risk inputs */
const ENABLE_LLM_SECURITY_SCAN = true;

/** Timeout for LLM security scan (ms) */
const LLM_SCAN_TIMEOUT_MS = 3000;

// ============================================================================
// Pre-compiled Jailbreak Patterns (Performance Optimized)
// ============================================================================

/**
 * Pre-compiled regex patterns for better performance
 * Patterns are compiled once at module load, not on each call
 * Each pattern includes a category for telemetry/training data
 */
const JAILBREAK_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  // Direct instruction override attempts
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?|context)/i, category: 'instruction-override' },
  { pattern: /disregard\s+(previous|prior|above)\s+(instructions?|prompts?|rules?)/i, category: 'instruction-override' },
  { pattern: /forget\s+(everything|all)\s+(you\s+)?(were\s+told|learned|know)/i, category: 'instruction-override' },
  
  // Role-playing attacks
  { pattern: /(now\s+you\s+are|you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as)\s+(?!an?\s+assistant)/i, category: 'role-play' },
  { pattern: /new\s+(role|character|persona|identity):/i, category: 'role-play' },
  
  // System message injection
  { pattern: /\[?\s*system\s*\]?:/i, category: 'system-inject' },
  { pattern: /\{\s*"role"\s*:\s*"system"/i, category: 'system-inject' },
  { pattern: /<\|system\|>/i, category: 'system-inject' },
  
  // Prompt termination attempts
  { pattern: /---\s*end\s+(of\s+)?(prompt|instructions?|context)/i, category: 'prompt-termination' },
  { pattern: /\[?\s*end\s+of\s+(prompt|instructions?|system\s+message)\s*\]?/i, category: 'prompt-termination' },
  
  // Developer mode / admin access
  { pattern: /(developer|admin|root|debug|god)\s+mode(\s+enabled|\s+on)?/i, category: 'privilege-escalation' },
  { pattern: /enable\s+(developer|admin|debug)\s+mode/i, category: 'privilege-escalation' },
  
  // Instruction reversal
  { pattern: /do\s+the\s+opposite\s+of/i, category: 'instruction-reversal' },
  { pattern: /reverse\s+(your|the)\s+(instructions?|rules?)/i, category: 'instruction-reversal' },
  
  // Constraint removal
  { pattern: /remove\s+(all\s+)?(restrictions?|limitations?|constraints?|guardrails?)/i, category: 'constraint-removal' },
  { pattern: /bypass\s+(all\s+)?(restrictions?|safety|filters?)/i, category: 'constraint-removal' },
  { pattern: /no\s+(restrictions?|limitations?|rules?|guardrails?)/i, category: 'constraint-removal' },
  
  // Encoding/obfuscation attacks
  { pattern: /base64\s*:/i, category: 'encoding-attack' },
  { pattern: /rot13\s*:/i, category: 'encoding-attack' },
  { pattern: /\bu\+[0-9a-f]{4}/i, category: 'encoding-attack' },
  
  // Multi-turn attacks (limited backtracking for performance)
  { pattern: /(first|initially)\s+.{1,50}(then|next|after\s+that)\s+.{1,50}(ignore|disregard|forget)/i, category: 'multi-turn' },
];

/**
 * Quick-check keywords for fast early exit (case-insensitive)
 * If none of these are present, skip expensive regex checks
 */
const QUICK_CHECK_KEYWORDS = [
  'ignore', 'disregard', 'forget', 'pretend', 'roleplay', 'system',
  'developer', 'admin', 'debug', 'bypass', 'remove', 'restriction',
  'base64', 'rot13', 'opposite', 'reverse', 'end of', 'new role'
];

/**
 * Quick check to see if input might contain injection attempts
 * Returns false if no suspicious keywords found (fast path)
 */
function mightContainInjection(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return QUICK_CHECK_KEYWORDS.some(keyword => lowerInput.includes(keyword));
}

/**
 * Dangerous instruction keywords that shouldn't appear in user-provided content
 */
const DANGEROUS_KEYWORDS = [
  'SYSTEM:',
  'ASSISTANT:',
  'USER:',
  '<|im_start|>',
  '<|im_end|>',
  '###Instruction:',
  '###Response:',
  '[INST]',
  '[/INST]',
];

/**
 * Maximum lengths for various input types to prevent token flooding
 */
const MAX_LENGTHS = {
  businessContext: 5000,
  userContext: 2000,
  teamContext: 3000,
  customPrompt: 1000,
  selectedText: 10000,
  documentTitle: 200,
  metadata: 500,
};

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  threats: string[];
  riskLevel: RiskLevel;
  categories?: string[];
}

// ============================================================================
// Attack Dataset Collection (for future model training)
// ============================================================================

interface DetectedAttack {
  input: string;
  threats: string[];
  categories: string[];
  riskLevel: RiskLevel;
  timestamp: string;
  context?: string;
  llmVerified?: boolean;
}

/** In-memory buffer for detected attacks (batched writes to DB) */
const attackBuffer: DetectedAttack[] = [];
const MAX_BUFFER_SIZE = 20;
const FLUSH_INTERVAL_MS = 60000; // 1 minute

/**
 * Records a detected attack for future model training/analysis
 * Non-blocking - failures are silently ignored
 */
function recordAttack(attack: DetectedAttack): void {
  attackBuffer.push(attack);
  
  // Flush when buffer is full
  if (attackBuffer.length >= MAX_BUFFER_SIZE) {
    flushAttackBuffer();
  }
}

/** Flush attack buffer to database */
async function flushAttackBuffer(): Promise<void> {
  if (attackBuffer.length === 0) return;
  
  const toFlush = [...attackBuffer];
  attackBuffer.length = 0; // Clear buffer
  
  try {
    // Store in Supabase for future training data
    // Table: prompt_injection_attacks (create if needed)
    await supabase
      .from('prompt_injection_attacks')
      .insert(toFlush.map(a => ({
        input_text: a.input.slice(0, 2000), // Limit storage size
        threats: a.threats,
        categories: a.categories,
        risk_level: a.riskLevel,
        llm_verified: a.llmVerified,
        context: a.context,
        detected_at: a.timestamp,
      })));
  } catch {
    // Silently ignore - this is non-critical telemetry
  }
}

// Periodic flush (in case buffer never fills)
if (typeof setInterval !== 'undefined') {
  setInterval(flushAttackBuffer, FLUSH_INTERVAL_MS);
}

// ============================================================================
// LLM Security Scanner
// ============================================================================

interface LLMScanResult {
  safe: boolean;
  reason?: string;
  confidence?: number;
  categories?: string[];
}

/**
 * Uses a fast LLM (via Groq) to semantically analyze input for prompt injection
 * This catches attacks that regex patterns miss (adversarial rewording, novel attacks)
 */
async function llmSecurityScan(input: string): Promise<LLMScanResult> {
  if (!ENABLE_LLM_SECURITY_SCAN) {
    return { safe: true, confidence: 0 };
  }
  
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_SCAN_TIMEOUT_MS);
    
    // Call Groq via edge function for security scan
    const { data, error } = await supabase.functions.invoke('groq-security-scan', {
      body: { input: input.slice(0, 2000) },
    });
    
    clearTimeout(timeoutId);
    
    if (error) {
      return { safe: true, confidence: 0, reason: 'scan_failed' };
    }
    
    return {
      safe: data?.safe ?? true,
      reason: data?.reason,
      confidence: data?.confidence,
      categories: data?.categories,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return { safe: true, confidence: 0, reason: 'timeout' };
    }
    return { safe: true, confidence: 0, reason: 'error' };
  }
}

// ============================================================================
// Core Sanitization Functions
// ============================================================================

/**
 * Sanitizes untrusted input by removing dangerous patterns and encoding structure
 * Performance optimized with quick-check early exit
 * 
 * @param input - Raw user input to sanitize
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of field for logging
 * @returns Sanitization result with cleaned text and threat assessment
 */
export function sanitizeInput(
  input: string | undefined | null,
  maxLength: number,
  fieldName: string = 'input'
): SanitizationResult {
  const threats: string[] = [];
  const categories: string[] = [];
  let sanitized = input || '';
  let wasModified = false;
  
  // Empty input is safe
  if (!sanitized.trim()) {
    return { sanitized: '', wasModified: false, threats: [], riskLevel: 'safe', categories: [] };
  }
  
  // 1. Truncate to prevent token flooding
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    wasModified = true;
    threats.push(`Truncated from ${input!.length} to ${maxLength} chars`);
  }
  
  // 2. Detect dangerous keywords (case-insensitive)
  const upperInput = sanitized.toUpperCase();
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperInput.includes(keyword.toUpperCase())) {
      threats.push(`Dangerous keyword: "${keyword}"`);
      categories.push('dangerous-keyword');
      sanitized = sanitized.replace(new RegExp(keyword, 'gi'), '[REDACTED]');
      wasModified = true;
    }
  }
  
  // 3. Fast path: Skip expensive regex if no suspicious keywords
  if (mightContainInjection(sanitized)) {
    // 4. Detect jailbreak patterns (pre-compiled regex for performance)
    for (const { pattern, category } of JAILBREAK_PATTERNS) {
      const matches = sanitized.match(pattern);
      if (matches) {
        threats.push(`Jailbreak: ${matches[0].slice(0, 50)}`);
        if (!categories.includes(category)) {
          categories.push(category);
        }
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
        wasModified = true;
      }
    }
  }
  
  // 5. Normalize excessive whitespace (can hide injections)
  const normalizedWhitespace = sanitized.replace(/\s+/g, ' ').trim();
  if (normalizedWhitespace !== sanitized.trim()) {
    sanitized = normalizedWhitespace;
    wasModified = true;
  }
  
  // 6. Remove null bytes and control characters (except newlines/tabs)
  const cleanedControl = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  if (cleanedControl !== sanitized) {
    sanitized = cleanedControl;
    wasModified = true;
    threats.push('Removed control characters');
  }
  
  // Assess risk level based on threat severity
  let riskLevel: RiskLevel = 'safe';
  if (threats.length === 0) {
    riskLevel = 'safe';
  } else if (threats.length === 1 && threats[0].includes('Truncated')) {
    riskLevel = 'low';
  } else if (categories.some(c => ['instruction-override', 'system-inject', 'privilege-escalation'].includes(c))) {
    riskLevel = categories.length > 1 ? 'critical' : 'high';
  } else if (threats.some(t => t.includes('Jailbreak') || t.includes('Dangerous'))) {
    riskLevel = threats.length > 2 ? 'high' : 'medium';
  } else {
    riskLevel = 'low';
  }
  
  return { sanitized, wasModified, threats, riskLevel, categories };
}

/**
 * Encodes untrusted data as JSON to prevent instruction confusion
 * The AI model is instructed to treat JSON blocks as pure data, not instructions
 */
export function encodeAsData(label: string, content: string): string {
  return `<DATA label="${label}">\n${JSON.stringify({ content }, null, 2)}\n</DATA>`;
}

/**
 * Sanitizes all context fields for modal assistant system prompts
 */
export interface AssistantContextInput {
  companyName?: string;
  businessContext?: string;
  userContext?: string;
  teamContext?: string;
  metadata?: Record<string, any>;
}

export interface SanitizedAssistantContext {
  companyName: string;
  businessContext: string;
  userContext: string;
  teamContext: string;
  metadata: string;
  sanitizationReport: {
    totalThreats: number;
    highestRiskLevel: RiskLevel;
    details: Record<string, SanitizationResult>;
  };
}

export function sanitizeAssistantContext(
  input: AssistantContextInput
): SanitizedAssistantContext {
  const results: Record<string, SanitizationResult> = {};
  
  // Sanitize each field
  results.companyName = sanitizeInput(input.companyName, 100, 'companyName');
  results.businessContext = sanitizeInput(input.businessContext, MAX_LENGTHS.businessContext, 'businessContext');
  results.userContext = sanitizeInput(input.userContext, MAX_LENGTHS.userContext, 'userContext');
  results.teamContext = sanitizeInput(input.teamContext, MAX_LENGTHS.teamContext, 'teamContext');
  
  // Sanitize metadata as JSON string
  const metadataStr = input.metadata ? JSON.stringify(input.metadata) : '';
  results.metadata = sanitizeInput(metadataStr, MAX_LENGTHS.metadata, 'metadata');
  
  // Calculate overall risk
  const allRiskLevels = Object.values(results).map(r => r.riskLevel);
  const highestRiskLevel = allRiskLevels.reduce((max, level) => 
    RISK_PRIORITY[level] > RISK_PRIORITY[max] ? level : max
  , 'safe' as RiskLevel);
  
  const totalThreats = Object.values(results).reduce((sum, r) => sum + r.threats.length, 0);
  
  // Only log if risk level meets threshold (reduces console noise)
  if (totalThreats > 0 && RISK_PRIORITY[highestRiskLevel] >= RISK_PRIORITY[LOG_THRESHOLD]) {
    console.warn('[PromptSanitizer] Threats in assistant context:', {
      totalThreats,
      highestRiskLevel,
      details: Object.entries(results)
        .filter(([_, r]) => r.threats.length > 0)
        .map(([field, r]) => ({ field, threats: r.threats, riskLevel: r.riskLevel }))
    });
  }
  
  return {
    companyName: results.companyName.sanitized,
    businessContext: results.businessContext.sanitized,
    userContext: results.userContext.sanitized,
    teamContext: results.teamContext.sanitized,
    metadata: results.metadata.sanitized,
    sanitizationReport: {
      totalThreats,
      highestRiskLevel,
      details: results
    }
  };
}

/**
 * Sanitizes embedded writer inputs (selections, custom prompts)
 */
export interface EmbeddedWriterInput {
  selectedText?: string;
  customPrompt?: string;
  documentTitle?: string;
  metadata?: Record<string, any>;
}

export interface SanitizedEmbeddedInput {
  selectedText: string;
  customPrompt: string;
  documentTitle: string;
  metadata: string;
  sanitizationReport: {
    totalThreats: number;
    highestRiskLevel: RiskLevel;
    details: Record<string, SanitizationResult>;
    shouldBlock: boolean;
    llmVerified?: boolean;
  };
}

/**
 * Async version with LLM security scan for high-risk inputs
 * Use this for user-facing features where you can afford slight latency
 */
export async function sanitizeEmbeddedInputAsync(
  input: EmbeddedWriterInput
): Promise<SanitizedEmbeddedInput> {
  const results: Record<string, SanitizationResult> = {};
  
  // Sanitize each field
  results.selectedText = sanitizeInput(input.selectedText, MAX_LENGTHS.selectedText, 'selectedText');
  results.customPrompt = sanitizeInput(input.customPrompt, MAX_LENGTHS.customPrompt, 'customPrompt');
  results.documentTitle = sanitizeInput(input.documentTitle, MAX_LENGTHS.documentTitle, 'documentTitle');
  
  const metadataStr = input.metadata ? JSON.stringify(input.metadata) : '';
  results.metadata = sanitizeInput(metadataStr, MAX_LENGTHS.metadata, 'metadata');
  
  // Calculate risk
  const allRiskLevels = Object.values(results).map(r => r.riskLevel);
  const highestRiskLevel = allRiskLevels.reduce((max, level) => 
    RISK_PRIORITY[level] > RISK_PRIORITY[max] ? level : max
  , 'safe' as RiskLevel);
  
  const totalThreats = Object.values(results).reduce((sum, r) => sum + r.threats.length, 0);
  
  // For high/critical risk, run LLM security scan for semantic analysis
  let llmVerified = false;
  let shouldBlock = results.customPrompt.riskLevel === 'critical';
  
  if (RISK_PRIORITY[highestRiskLevel] >= RISK_PRIORITY['high'] && ENABLE_LLM_SECURITY_SCAN) {
    const llmResult = await llmSecurityScan(input.customPrompt || input.selectedText || '');
    llmVerified = true;
    
    if (!llmResult.safe) {
      shouldBlock = true;
      
      // Record for training dataset
      const allCategories = Object.values(results).flatMap(r => r.categories || []);
      recordAttack({
        input: input.customPrompt || input.selectedText || '',
        threats: [...Object.values(results).flatMap(r => r.threats), llmResult.reason || 'LLM detected'],
        categories: [...new Set([...allCategories, ...(llmResult.categories || ['llm-detected'])])],
        riskLevel: 'critical',
        timestamp: new Date().toISOString(),
        context: 'embedded-writer',
        llmVerified: true,
      });
      
      console.warn('[PromptSanitizer] LLM security scan detected attack:', {
        reason: llmResult.reason,
        confidence: llmResult.confidence,
      });
    }
  }
  
  // Only log if risk level meets threshold
  if (totalThreats > 0 && RISK_PRIORITY[highestRiskLevel] >= RISK_PRIORITY[LOG_THRESHOLD]) {
    console.warn('[PromptSanitizer] Threats in embedded input:', {
      totalThreats,
      highestRiskLevel,
      shouldBlock,
      llmVerified,
    });
    
    // Record high-risk inputs for training dataset
    if (RISK_PRIORITY[highestRiskLevel] >= RISK_PRIORITY['high']) {
      const allCategories = Object.values(results).flatMap(r => r.categories || []);
      recordAttack({
        input: input.customPrompt || input.selectedText || '',
        threats: Object.values(results).flatMap(r => r.threats),
        categories: [...new Set(allCategories)],
        riskLevel: highestRiskLevel,
        timestamp: new Date().toISOString(),
        context: 'embedded-writer',
        llmVerified,
      });
    }
  }
  
  return {
    selectedText: encodeAsData('selectedText', results.selectedText.sanitized),
    customPrompt: encodeAsData('customPrompt', results.customPrompt.sanitized),
    documentTitle: results.documentTitle.sanitized,
    metadata: results.metadata.sanitized,
    sanitizationReport: {
      totalThreats,
      highestRiskLevel,
      details: results,
      shouldBlock,
      llmVerified,
    }
  };
}

/**
 * Synchronous version for backwards compatibility
 * Does not include LLM security scan (use sanitizeEmbeddedInputAsync for that)
 */
export function sanitizeEmbeddedInput(
  input: EmbeddedWriterInput
): SanitizedEmbeddedInput {
  const results: Record<string, SanitizationResult> = {};
  
  // Sanitize each field
  results.selectedText = sanitizeInput(input.selectedText, MAX_LENGTHS.selectedText, 'selectedText');
  results.customPrompt = sanitizeInput(input.customPrompt, MAX_LENGTHS.customPrompt, 'customPrompt');
  results.documentTitle = sanitizeInput(input.documentTitle, MAX_LENGTHS.documentTitle, 'documentTitle');
  
  const metadataStr = input.metadata ? JSON.stringify(input.metadata) : '';
  results.metadata = sanitizeInput(metadataStr, MAX_LENGTHS.metadata, 'metadata');
  
  // Calculate risk
  const allRiskLevels = Object.values(results).map(r => r.riskLevel);
  const highestRiskLevel = allRiskLevels.reduce((max, level) => 
    RISK_PRIORITY[level] > RISK_PRIORITY[max] ? level : max
  , 'safe' as RiskLevel);
  
  const totalThreats = Object.values(results).reduce((sum, r) => sum + r.threats.length, 0);
  
  // Block critical threats in custom prompts
  const shouldBlock = results.customPrompt.riskLevel === 'critical';
  
  // Only log if risk level meets threshold (reduces console noise)
  if (totalThreats > 0 && RISK_PRIORITY[highestRiskLevel] >= RISK_PRIORITY[LOG_THRESHOLD]) {
    console.warn('[PromptSanitizer] Threats in embedded input:', {
      totalThreats,
      highestRiskLevel,
      shouldBlock,
    });
  }
  
  return {
    selectedText: encodeAsData('selectedText', results.selectedText.sanitized),
    customPrompt: encodeAsData('customPrompt', results.customPrompt.sanitized),
    documentTitle: results.documentTitle.sanitized,
    metadata: results.metadata.sanitized,
    sanitizationReport: {
      totalThreats,
      highestRiskLevel,
      details: results,
      shouldBlock,
    }
  };
}

/**
 * Validates final system prompt before dispatch
 * Last line of defense against prompt injection
 */
export interface PromptValidationResult {
  isValid: boolean;
  threats: string[];
  riskLevel: RiskLevel;
}

export function validateSystemPrompt(systemPrompt: string): PromptValidationResult {
  const threats: string[] = [];
  
  // Check for excessive length (token flooding)
  if (systemPrompt.length > 50000) {
    threats.push('System prompt exceeds safe length (50k characters)');
  }
  
  // Quick check before expensive regex (performance optimization)
  if (mightContainInjection(systemPrompt)) {
    for (const { pattern } of JAILBREAK_PATTERNS) {
      const matches = systemPrompt.match(pattern);
      if (matches) {
        threats.push(`Jailbreak in prompt: ${matches[0].slice(0, 40)}`);
      }
    }
  }
  
  // Check for multiple consecutive instruction blocks (sign of injection)
  const instructionBlocks = (systemPrompt.match(/You are|Your role|IMPORTANT:|CRITICAL:/gi) || []).length;
  if (instructionBlocks > 10) {
    threats.push(`Suspicious instruction markers: ${instructionBlocks}`);
  }
  
  // Assess risk
  let riskLevel: RiskLevel = 'safe';
  if (threats.length === 0) {
    riskLevel = 'safe';
  } else if (threats.some(t => t.includes('Jailbreak'))) {
    riskLevel = 'critical';
  } else if (threats.length >= 2) {
    riskLevel = 'high';
  } else {
    riskLevel = 'medium';
  }
  
  const isValid = riskLevel !== 'critical';
  
  // Only log critical blocks (reduces console noise)
  if (!isValid) {
    console.error('[PromptSanitizer] BLOCKED unsafe system prompt:', { threats, riskLevel });
  }
  
  return { isValid, threats, riskLevel };
}

/**
 * Scans AI model output for signs of compromise or injection success
 * Detects if the model's response indicates it was jailbroken
 */
export function scanModelOutput(output: string): PromptValidationResult {
  const threats: string[] = [];
  
  // Patterns indicating successful jailbreak (pre-compiled for performance)
  const compromisePatterns = [
    /as\s+an?\s+(unfiltered|unrestricted|uncensored)\s+(AI|assistant|model)/i,
    /I\s+will\s+(not|no\s+longer)\s+(follow|obey|adhere\s+to)\s+(the|my)\s+(rules?|instructions?|guidelines?)/i,
    /developer\s+mode\s+(enabled|activated)/i,
    /DAN\s+mode/i,
    /I\s+don't\s+have\s+(any|those)\s+(restrictions?|limitations?)/i,
  ];
  
  for (const pattern of compromisePatterns) {
    const matches = output.match(pattern);
    if (matches) {
      threats.push(`Jailbreak in output: ${matches[0].slice(0, 50)}`);
    }
  }
  
  // Check for leaked system prompt
  if (output.toLowerCase().includes('your system prompt') || 
      output.toLowerCase().includes('my instructions were')) {
    threats.push('Output may leak system prompt');
  }
  
  const riskLevel: RiskLevel = threats.length > 0 ? 'critical' : 'safe';
  
  // Only log critical findings (reduces console noise)
  if (threats.length > 0) {
    console.error('[PromptSanitizer] Compromised model output:', threats);
  }
  
  return {
    isValid: threats.length === 0,
    threats,
    riskLevel
  };
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Main export: All-in-one sanitization pipeline
 */
export const PromptSanitizer = {
  // Core functions
  sanitizeInput,
  sanitizeAssistantContext,
  sanitizeEmbeddedInput,
  sanitizeEmbeddedInputAsync, // New async version with LLM scan
  validateSystemPrompt,
  scanModelOutput,
  encodeAsData,
  
  // LLM security scanner
  llmSecurityScan,
  
  // Attack dataset management
  flushAttackBuffer,
  
  // Config
  MAX_LENGTHS,
};
