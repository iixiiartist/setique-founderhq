/**
 * Prompt Sanitization and Threat Detection Module
 * 
 * Defends against prompt injection and jailbreak attempts by:
 * 1. Sanitizing untrusted user input before interpolation into system prompts
 * 2. Detecting and blocking known jailbreak patterns
 * 3. Encoding untrusted data as JSON to prevent instruction override
 * 4. Validating final prompts before dispatch to AI model
 * 
 * Security principles:
 * - Defense in depth: Multiple layers of validation
 * - Fail-safe defaults: Block when uncertain
 * - Structured prompts: JSON encoding prevents instruction confusion
 */

/**
 * Known jailbreak patterns and prompt injection signatures
 * Updated regularly based on emerging attack vectors
 */
const JAILBREAK_PATTERNS = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?|context)/gi,
  /disregard\s+(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
  /forget\s+(everything|all)\s+(you\s+)?(were\s+told|learned|know)/gi,
  
  // Role-playing attacks
  /(now\s+you\s+are|you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as)\s+(?!an?\s+assistant)/gi,
  /new\s+(role|character|persona|identity):/gi,
  
  // System message injection
  /\[?\s*system\s*\]?:/gi,
  /\{\s*"role"\s*:\s*"system"/gi,
  /<\|system\|>/gi,
  
  // Prompt termination attempts
  /---\s*end\s+(of\s+)?(prompt|instructions?|context)/gi,
  /\[?\s*end\s+of\s+(prompt|instructions?|system\s+message)\s*\]?/gi,
  
  // Developer mode / admin access
  /(developer|admin|root|debug|god)\s+mode(\s+enabled|\s+on)?/gi,
  /enable\s+(developer|admin|debug)\s+mode/gi,
  
  // Instruction reversal
  /do\s+the\s+opposite\s+of/gi,
  /reverse\s+(your|the)\s+(instructions?|rules?)/gi,
  
  // Constraint removal
  /remove\s+(all\s+)?(restrictions?|limitations?|constraints?|guardrails?)/gi,
  /bypass\s+(all\s+)?(restrictions?|safety|filters?)/gi,
  /no\s+(restrictions?|limitations?|rules?|guardrails?)/gi,
  
  // Encoding/obfuscation attacks
  /base64\s*:/gi,
  /rot13\s*:/gi,
  /\bu\+[0-9a-f]{4}/gi, // Unicode escape sequences
  
  // Multi-turn attacks
  /(first|initially)\s+.+(then|next|after\s+that)\s+.+(ignore|disregard|forget)/gi,
];

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
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Sanitizes untrusted input by removing dangerous patterns and encoding structure
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
  let sanitized = input || '';
  let wasModified = false;
  
  // Empty input is safe
  if (!sanitized.trim()) {
    return { sanitized: '', wasModified: false, threats: [], riskLevel: 'safe' };
  }
  
  // 1. Truncate to prevent token flooding
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    wasModified = true;
    threats.push(`${fieldName}: Truncated from ${input!.length} to ${maxLength} characters`);
  }
  
  // 2. Detect dangerous keywords (case-insensitive)
  const upperInput = sanitized.toUpperCase();
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperInput.includes(keyword.toUpperCase())) {
      threats.push(`${fieldName}: Contains dangerous keyword "${keyword}"`);
      // Replace with placeholder
      sanitized = sanitized.replace(new RegExp(keyword, 'gi'), '[REDACTED]');
      wasModified = true;
    }
  }
  
  // 3. Detect jailbreak patterns
  for (const pattern of JAILBREAK_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      threats.push(`${fieldName}: Matched jailbreak pattern: ${matches[0]}`);
      // Replace entire match with warning
      sanitized = sanitized.replace(pattern, '[POTENTIAL INJECTION REMOVED]');
      wasModified = true;
    }
  }
  
  // 4. Normalize excessive whitespace (can hide injections)
  const normalizedWhitespace = sanitized.replace(/\s+/g, ' ').trim();
  if (normalizedWhitespace !== sanitized.trim()) {
    sanitized = normalizedWhitespace;
    wasModified = true;
  }
  
  // 5. Remove null bytes and control characters (except newlines/tabs)
  const cleanedControl = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  if (cleanedControl !== sanitized) {
    sanitized = cleanedControl;
    wasModified = true;
    threats.push(`${fieldName}: Removed control characters`);
  }
  
  // Assess risk level
  let riskLevel: SanitizationResult['riskLevel'] = 'safe';
  if (threats.length === 0) {
    riskLevel = 'safe';
  } else if (threats.length === 1 && threats[0].includes('Truncated')) {
    riskLevel = 'low';
  } else if (threats.some(t => t.includes('jailbreak') || t.includes('dangerous keyword'))) {
    riskLevel = threats.length > 2 ? 'critical' : 'high';
  } else {
    riskLevel = 'medium';
  }
  
  return { sanitized, wasModified, threats, riskLevel };
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
    highestRiskLevel: SanitizationResult['riskLevel'];
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
  const riskPriority = { 'safe': 0, 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
  const highestRiskLevel = allRiskLevels.reduce((max, level) => 
    riskPriority[level] > riskPriority[max] ? level : max
  , 'safe' as SanitizationResult['riskLevel']);
  
  const totalThreats = Object.values(results).reduce((sum, r) => sum + r.threats.length, 0);
  
  // Log threats in development
  if (process.env.NODE_ENV === 'development' && totalThreats > 0) {
    console.warn('[PromptSanitizer] Detected threats in assistant context:', {
      totalThreats,
      highestRiskLevel,
      details: Object.entries(results)
        .filter(([_, r]) => r.threats.length > 0)
        .map(([field, r]) => ({ field, threats: r.threats, riskLevel: r.riskLevel }))
    });
  }
  
  return {
    companyName: results.companyName.sanitized,
    businessContext: encodeAsData('businessContext', results.businessContext.sanitized),
    userContext: encodeAsData('userContext', results.userContext.sanitized),
    teamContext: encodeAsData('teamContext', results.teamContext.sanitized),
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
    highestRiskLevel: SanitizationResult['riskLevel'];
    details: Record<string, SanitizationResult>;
    shouldBlock: boolean;
  };
}

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
  const riskPriority = { 'safe': 0, 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
  const highestRiskLevel = allRiskLevels.reduce((max, level) => 
    riskPriority[level] > riskPriority[max] ? level : max
  , 'safe' as SanitizationResult['riskLevel']);
  
  const totalThreats = Object.values(results).reduce((sum, r) => sum + r.threats.length, 0);
  
  // Block critical threats in custom prompts (user-crafted)
  const shouldBlock = results.customPrompt.riskLevel === 'critical';
  
  if (process.env.NODE_ENV === 'development' && totalThreats > 0) {
    console.warn('[PromptSanitizer] Detected threats in embedded input:', {
      totalThreats,
      highestRiskLevel,
      shouldBlock,
      details: Object.entries(results)
        .filter(([_, r]) => r.threats.length > 0)
        .map(([field, r]) => ({ field, threats: r.threats, riskLevel: r.riskLevel }))
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
      shouldBlock
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
  riskLevel: SanitizationResult['riskLevel'];
}

export function validateSystemPrompt(systemPrompt: string): PromptValidationResult {
  const threats: string[] = [];
  
  // Check for excessive length (token flooding)
  if (systemPrompt.length > 50000) {
    threats.push('System prompt exceeds safe length (50k characters)');
  }
  
  // Check for suspicious patterns in final prompt
  for (const pattern of JAILBREAK_PATTERNS) {
    const matches = systemPrompt.match(pattern);
    if (matches) {
      threats.push(`Final prompt contains jailbreak pattern: ${matches[0]}`);
    }
  }
  
  // Check for multiple consecutive instruction blocks (sign of injection)
  const instructionBlocks = (systemPrompt.match(/You are|Your role|IMPORTANT:|CRITICAL:/gi) || []).length;
  if (instructionBlocks > 10) {
    threats.push(`Suspicious number of instruction markers: ${instructionBlocks}`);
  }
  
  // Assess risk
  let riskLevel: SanitizationResult['riskLevel'] = 'safe';
  if (threats.length === 0) {
    riskLevel = 'safe';
  } else if (threats.some(t => t.includes('jailbreak'))) {
    riskLevel = 'critical';
  } else if (threats.length >= 2) {
    riskLevel = 'high';
  } else {
    riskLevel = 'medium';
  }
  
  const isValid = riskLevel !== 'critical';
  
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
  
  // Patterns indicating successful jailbreak
  const compromisePatterns = [
    /as\s+an?\s+(unfiltered|unrestricted|uncensored)\s+(AI|assistant|model)/gi,
    /I\s+will\s+(not|no\s+longer)\s+(follow|obey|adhere\s+to)\s+(the|my)\s+(rules?|instructions?|guidelines?)/gi,
    /developer\s+mode\s+(enabled|activated)/gi,
    /DAN\s+mode/gi, // "Do Anything Now" jailbreak
    /I\s+don't\s+have\s+(any|those)\s+(restrictions?|limitations?)/gi,
  ];
  
  for (const pattern of compromisePatterns) {
    const matches = output.match(pattern);
    if (matches) {
      threats.push(`Output suggests successful jailbreak: ${matches[0]}`);
    }
  }
  
  // Check for leaked system prompt
  if (output.toLowerCase().includes('your system prompt') || 
      output.toLowerCase().includes('my instructions were')) {
    threats.push('Output appears to leak system prompt');
  }
  
  const riskLevel: SanitizationResult['riskLevel'] = 
    threats.length > 0 ? 'critical' : 'safe';
  
  if (threats.length > 0) {
    console.error('[PromptSanitizer] Detected compromised model output:', threats);
  }
  
  return {
    isValid: threats.length === 0,
    threats,
    riskLevel
  };
}

/**
 * Main export: All-in-one sanitization pipeline
 */
export const PromptSanitizer = {
  sanitizeInput,
  sanitizeAssistantContext,
  sanitizeEmbeddedInput,
  validateSystemPrompt,
  scanModelOutput,
  encodeAsData,
  MAX_LENGTHS,
};
