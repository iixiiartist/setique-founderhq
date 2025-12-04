/**
 * Moderation Service - Content Safety using Llama Guard 4
 * 
 * Provides pre/post filtering for AI-generated content using Groq's 
 * ultra-fast Llama Guard 4 model (1200+ tokens/sec).
 * 
 * Features:
 * - Pre-filter: Check user input before sending to AI
 * - Post-filter: Verify AI output before displaying to user
 * - Supports both text and multimodal (vision) content
 * - Falls back to existing OpenAI moderation when Llama Guard unavailable
 */

import { supabase } from '../lib/supabase';

// Moderation categories from Llama Guard 4
export type ModerationCategory =
  | 'S1' // Violent Crimes
  | 'S2' // Non-Violent Crimes
  | 'S3' // Sex-Related Crimes
  | 'S4' // Child Sexual Exploitation
  | 'S5' // Defamation
  | 'S6' // Specialized Advice
  | 'S7' // Privacy
  | 'S8' // Intellectual Property
  | 'S9' // Indiscriminate Weapons
  | 'S10' // Hate
  | 'S11' // Suicide & Self-Harm
  | 'S12' // Sexual Content
  | 'S13' // Elections
  | 'S14' // Code Interpreter Abuse
  | string;

export type SeverityLevel = 'none' | 'low' | 'medium' | 'high';

export interface ModerationResult {
  safe: boolean;
  flagged: boolean;
  severity: SeverityLevel;
  categories: ModerationCategory[];
  provider: 'llama-guard' | 'openai' | 'heuristic';
  model?: string;
  latencyMs?: number;
  reason?: string;
}

export interface ModerationOptions {
  direction?: 'input' | 'output';
  channel?: string;
  workspaceId?: string;
  useLlamaGuard?: boolean; // Force Llama Guard, skip fallback
}

/**
 * Category descriptions for human-readable output
 */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  S1: 'Violent Crimes',
  S2: 'Non-Violent Crimes',
  S3: 'Sex-Related Crimes',
  S4: 'Child Sexual Exploitation',
  S5: 'Defamation',
  S6: 'Specialized Advice (medical/legal/financial without disclaimer)',
  S7: 'Privacy Violations',
  S8: 'Intellectual Property',
  S9: 'Indiscriminate Weapons',
  S10: 'Hate Speech',
  S11: 'Suicide & Self-Harm',
  S12: 'Explicit Sexual Content',
  S13: 'Election Interference',
  S14: 'Code Interpreter Abuse',
};

/**
 * Check content safety using Llama Guard 4 via Groq
 * Falls back to existing moderation-check function if Llama Guard fails
 */
export async function checkContentSafety(
  content: string,
  options: ModerationOptions = {}
): Promise<ModerationResult> {
  const startTime = Date.now();
  const { direction = 'input', channel = 'editor', workspaceId, useLlamaGuard = true } = options;

  // Skip empty content
  if (!content?.trim()) {
    return {
      safe: true,
      flagged: false,
      severity: 'none',
      categories: [],
      provider: 'heuristic',
      latencyMs: 0,
    };
  }

  // Try Llama Guard first (if enabled)
  if (useLlamaGuard) {
    try {
      const llamaGuardResult = await checkWithLlamaGuard(content, direction);
      llamaGuardResult.latencyMs = Date.now() - startTime;
      return llamaGuardResult;
    } catch (error) {
      console.warn('[moderationService] Llama Guard failed, falling back:', error);
    }
  }

  // Fallback to existing moderation-check function (uses OpenAI)
  try {
    const { data, error } = await supabase.functions.invoke('moderation-check', {
      body: {
        text: content,
        direction,
        channel,
        workspaceId,
      },
    });

    if (error) {
      throw error;
    }

    return {
      safe: !data.flagged,
      flagged: data.flagged,
      severity: data.severity || 'none',
      categories: data.categories || [],
      provider: data.provider || 'openai',
      model: data.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[moderationService] Moderation check failed:', error);
    // Return safe by default on error (fail open for UX)
    return {
      safe: true,
      flagged: false,
      severity: 'none',
      categories: [],
      provider: 'heuristic',
      latencyMs: Date.now() - startTime,
      reason: 'Moderation service unavailable',
    };
  }
}

/**
 * Check content with Llama Guard 4 via Groq
 */
async function checkWithLlamaGuard(
  content: string,
  direction: 'input' | 'output'
): Promise<ModerationResult> {
  const role = direction === 'input' ? 'User' : 'Agent';
  
  // Format for Llama Guard 4
  const prompt = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>

Task: Check if there is unsafe content in '${role}' messages in conversations according to our safety policy with the below categories.

<BEGIN UNSAFE CONTENT CATEGORIES>
S1: Violent Crimes
S2: Non-Violent Crimes
S3: Sex-Related Crimes
S4: Child Sexual Exploitation
S5: Defamation
S6: Specialized Advice
S7: Privacy
S8: Intellectual Property
S9: Indiscriminate Weapons
S10: Hate
S11: Suicide & Self-Harm
S12: Sexual Content
S13: Elections
S14: Code Interpreter Abuse
<END UNSAFE CONTENT CATEGORIES>

<BEGIN CONVERSATION>

${role}: ${content.slice(0, 4000)}

<END CONVERSATION>

Provide your safety assessment for ONLY THE LAST ${role} message in the above conversation:
- First line must read 'safe' or 'unsafe'.
- If unsafe, a second line must include a comma-separated list of violated categories.<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

  const { data, error } = await supabase.functions.invoke('groq-chat', {
    body: {
      messages: [{ role: 'user', content: prompt }],
      model: 'meta-llama/llama-guard-4-12b',
      temperature: 0,
      max_tokens: 50,
    },
  });

  if (error) {
    throw error;
  }

  const response = (data?.response || data?.content || '').trim().toLowerCase();
  const lines = response.split('\n').filter((l: string) => l.trim());
  
  const isSafe = lines[0]?.includes('safe') && !lines[0]?.includes('unsafe');
  const categories: ModerationCategory[] = [];
  
  if (!isSafe && lines[1]) {
    // Parse category codes from second line
    const categoryMatches = lines[1].match(/s\d+/gi) || [];
    categories.push(...categoryMatches.map((c: string) => c.toUpperCase() as ModerationCategory));
  }

  // Determine severity based on categories
  let severity: SeverityLevel = 'none';
  if (!isSafe) {
    const highSeverity = ['S1', 'S3', 'S4', 'S9', 'S11'];
    const mediumSeverity = ['S2', 'S5', 'S10', 'S12'];
    
    if (categories.some(c => highSeverity.includes(c))) {
      severity = 'high';
    } else if (categories.some(c => mediumSeverity.includes(c))) {
      severity = 'medium';
    } else if (categories.length > 0) {
      severity = 'low';
    }
  }

  return {
    safe: isSafe,
    flagged: !isSafe,
    severity,
    categories,
    provider: 'llama-guard',
    model: 'meta-llama/llama-guard-4-12b',
  };
}

/**
 * Pre-filter: Check user input before sending to AI
 * Returns true if content is safe to process
 */
export async function preFilter(
  userInput: string,
  options?: Omit<ModerationOptions, 'direction'>
): Promise<{ allowed: boolean; result: ModerationResult }> {
  const result = await checkContentSafety(userInput, { ...options, direction: 'input' });
  return {
    allowed: result.safe,
    result,
  };
}

/**
 * Post-filter: Verify AI output before displaying to user
 * Returns true if content is safe to display
 */
export async function postFilter(
  aiOutput: string,
  options?: Omit<ModerationOptions, 'direction'>
): Promise<{ allowed: boolean; result: ModerationResult }> {
  const result = await checkContentSafety(aiOutput, { ...options, direction: 'output' });
  return {
    allowed: result.safe,
    result,
  };
}

/**
 * Get human-readable explanation of flagged categories
 */
export function explainCategories(categories: ModerationCategory[]): string {
  if (categories.length === 0) return 'No issues detected';
  
  const descriptions = categories
    .map(cat => CATEGORY_DESCRIPTIONS[cat] || cat)
    .filter(Boolean);
  
  return `Flagged for: ${descriptions.join(', ')}`;
}

/**
 * Batch check multiple pieces of content
 * Useful for checking message history
 */
export async function batchCheck(
  contents: string[],
  options?: ModerationOptions
): Promise<ModerationResult[]> {
  // Run checks in parallel with concurrency limit
  const concurrency = 5;
  const results: ModerationResult[] = [];
  
  for (let i = 0; i < contents.length; i += concurrency) {
    const batch = contents.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(content => checkContentSafety(content, options))
    );
    results.push(...batchResults);
  }
  
  return results;
}
