/**
 * Content Studio AI Service
 * Client-side service for calling the content-studio-ai edge function
 * Supports streaming, element generation, and layout patches
 */

import { supabase } from '../../../lib/supabase';
import {
  AiGenerationRequest,
  AiGenerationType,
  AiLayoutPatch,
  AiStreamChunk,
  AiSummary,
  validateAiPatch,
  sanitizeAiPatch,
  createAiStreamParser,
} from './aiSchema';
import { KonvaElement } from './types';

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

export type ContentType = 'headline' | 'bullets' | 'testimonial' | 'cta' | 'body' | 'research';

export interface AIGenerationRequest {
  type: ContentType;
  prompt: string;
  context?: string;
  stream?: boolean;
}

export interface AIGenerationResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  remaining?: number;
}

export interface AIGenerationError {
  error: string;
  reason?: string;
  resetIn?: number;
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamingCallbacks {
  onPatch?: (elements: KonvaElement[], patchId: string) => void;
  onProgress?: (progress: number, message?: string) => void;
  onError?: (error: string) => void;
  onComplete?: (summary: AiSummary) => void;
}

export interface StreamingResult {
  success: boolean;
  elements: KonvaElement[];
  summary?: AiSummary;
  error?: string;
}

// ============================================================================
// Quota Tracking
// ============================================================================

interface QuotaInfo {
  remaining: number;
  resetAt: number;
  limit: number;
}

let cachedQuota: QuotaInfo | null = null;

export function getQuotaInfo(): QuotaInfo | null {
  if (cachedQuota && Date.now() < cachedQuota.resetAt) {
    return cachedQuota;
  }
  return null;
}

export function updateQuota(remaining: number, resetInMs?: number): void {
  cachedQuota = {
    remaining,
    resetAt: Date.now() + (resetInMs || 60000),
    limit: 20, // Default rate limit
  };
}

// ============================================================================
// Text Content Generation (Legacy API)
// ============================================================================

/**
 * Generate text content using the Content Studio AI edge function
 * This is the legacy API for simple text generation
 */
export async function generateContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  const { data, error } = await supabase.functions.invoke<AIGenerationResponse>('content-studio-ai', {
    body: {
      ...request,
      mode: 'text', // Specify text mode for backward compatibility
    },
  });

  if (error) {
    console.error('[ContentStudioAI] Error:', error);
    throw new Error(error.message || 'Failed to generate content');
  }

  if (!data) {
    throw new Error('No response from AI service');
  }

  // Update quota from response
  if (data.remaining !== undefined) {
    updateQuota(data.remaining);
  }

  // Check if the response is an error
  if ('error' in data) {
    const errorResponse = data as unknown as AIGenerationError;
    if (errorResponse.resetIn) {
      throw new Error(`Rate limit exceeded. Try again in ${errorResponse.resetIn} seconds.`);
    }
    throw new Error(errorResponse.reason || errorResponse.error);
  }

  return data;
}

// ============================================================================
// Element Generation (New Streaming API)
// ============================================================================

/**
 * Generate layout elements with streaming support
 * Returns elements that can be directly added to the canvas
 */
export async function generateElements(
  request: AiGenerationRequest,
  callbacks?: StreamingCallbacks
): Promise<StreamingResult> {
  const allElements: KonvaElement[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let finalSummary: AiSummary | undefined;

  try {
    // Make request to edge function
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/content-studio-ai`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...request,
          mode: 'elements',
          stream: request.options?.stream !== false,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limiting
      if (response.status === 429) {
        const resetIn = errorData.resetIn || 60;
        updateQuota(0, resetIn * 1000);
        throw new Error(`Rate limit exceeded. Try again in ${resetIn} seconds.`);
      }
      
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    // Handle streaming response
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      // Process stream
      for await (const chunk of createAiStreamParser(reader)) {
        switch (chunk.type) {
          case 'patch': {
            const patch = chunk.data as AiLayoutPatch;
            const validation = validateAiPatch(patch);
            
            if (validation.valid) {
              const { elements, warnings: sanitizeWarnings } = sanitizeAiPatch(patch);
              warnings.push(...sanitizeWarnings);
              allElements.push(...elements);
              
              callbacks?.onPatch?.(elements, patch.patchId);
            } else {
              errors.push(...validation.errors);
              warnings.push(...validation.warnings);
              callbacks?.onError?.(validation.errors.join('; '));
            }
            break;
          }
          
          case 'progress': {
            const progress = chunk.data as { progress: number; message?: string };
            callbacks?.onProgress?.(progress.progress, progress.message);
            break;
          }
          
          case 'error': {
            const error = chunk.data as { error: string };
            errors.push(error.error);
            callbacks?.onError?.(error.error);
            break;
          }
          
          case 'complete': {
            finalSummary = (chunk.data as { summary: AiSummary }).summary;
            if (finalSummary.remainingQuota !== undefined) {
              updateQuota(finalSummary.remainingQuota);
            }
            callbacks?.onComplete?.(finalSummary);
            break;
          }
        }
      }
    } else {
      // Non-streaming response
      const data = await response.json();
      console.log('[ContentStudioAI] Element response:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.elements && Array.isArray(data.elements)) {
        console.log('[ContentStudioAI] Received elements:', data.elements.length);
        
        const patch: AiLayoutPatch = {
          elements: data.elements,
          patchId: crypto.randomUUID(),
          timestamp: Date.now(),
          version: '1.0',
        };
        
        const validation = validateAiPatch(patch);
        console.log('[ContentStudioAI] Validation result:', validation);
        
        if (validation.valid) {
          const { elements, warnings: sanitizeWarnings } = sanitizeAiPatch(patch);
          console.log('[ContentStudioAI] Sanitized elements:', elements.length);
          warnings.push(...sanitizeWarnings);
          allElements.push(...elements);
          callbacks?.onPatch?.(elements, patch.patchId);
        } else {
          console.error('[ContentStudioAI] Validation failed:', validation.errors);
          errors.push(...validation.errors);
          callbacks?.onError?.(validation.errors.join('; '));
        }
      } else {
        console.warn('[ContentStudioAI] No elements in response');
      }
      
      if (data.remaining !== undefined) {
        updateQuota(data.remaining);
      }
      
      finalSummary = {
        elementsGenerated: allElements.length,
        elementsApplied: allElements.length,
        elementsSkipped: 0,
        errors,
        warnings,
        usage: data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        remainingQuota: data.remaining,
      };
      
      callbacks?.onComplete?.(finalSummary);
    }

    return {
      success: errors.length === 0,
      elements: allElements,
      summary: finalSummary,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };

  } catch (error: any) {
    console.error('[ContentStudioAI] Element generation error:', error);
    callbacks?.onError?.(error.message);
    
    return {
      success: false,
      elements: allElements,
      error: error.message,
    };
  }
}

/**
 * Generate layout elements without streaming (simpler API)
 */
export async function generateElementsSync(
  request: AiGenerationRequest
): Promise<{ elements: KonvaElement[]; error?: string }> {
  const result = await generateElements({ ...request, options: { ...request.options, stream: false } });
  return { elements: result.elements, error: result.error };
}

// ============================================================================
// Content Type Labels (for UI)
// ============================================================================

export const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; description: string; icon: string }> = {
  headline: {
    label: 'Headlines',
    description: 'Generate compelling headlines',
    icon: '📰',
  },
  bullets: {
    label: 'Bullet Points',
    description: 'Create impactful feature bullets',
    icon: '📝',
  },
  testimonial: {
    label: 'Testimonial',
    description: 'Write realistic testimonials',
    icon: '💬',
  },
  cta: {
    label: 'Call to Action',
    description: 'Generate CTAs that convert',
    icon: '🎯',
  },
  body: {
    label: 'Body Copy',
    description: 'Write engaging body text',
    icon: '✍️',
  },
  research: {
    label: 'Research',
    description: 'Get facts and insights',
    icon: '🔍',
  },
};

/**
 * Layout generation type labels (for new element generation)
 */
export const LAYOUT_TYPE_LABELS: Record<AiGenerationType, { label: string; description: string }> = {
  'text-content': {
    label: 'Text Content',
    description: 'Generate text elements (headlines, bullets, etc.)',
  },
  'layout-block': {
    label: 'Layout Block',
    description: 'Create a layout with shapes and text',
  },
  'hero-section': {
    label: 'Hero Section',
    description: 'Generate a hero section with headline and CTA',
  },
  'feature-grid': {
    label: 'Feature Grid',
    description: 'Create a grid of feature cards',
  },
  'testimonial-card': {
    label: 'Testimonial Card',
    description: 'Generate a testimonial card with quote',
  },
  'cta-block': {
    label: 'CTA Block',
    description: 'Create a call-to-action block',
  },
  'stats-row': {
    label: 'Stats Row',
    description: 'Generate a row of statistics',
  },
  'comparison-table': {
    label: 'Comparison Table',
    description: 'Create a comparison layout',
  },
  'pricing-card': {
    label: 'Pricing Card',
    description: 'Generate a pricing card',
  },
  'social-post': {
    label: 'Social Post',
    description: 'Create a social media post template',
  },
  'custom': {
    label: 'Custom Layout',
    description: 'Free-form element generation',
  },
};

/**
 * Quick prompts for common use cases
 */
export const QUICK_PROMPTS: Record<ContentType, string[]> = {
  headline: [
    'Create headlines for a product launch',
    'Generate attention-grabbing blog titles',
    'Write newsletter subject lines',
  ],
  bullets: [
    'List key product features',
    'Highlight service benefits',
    'Summarize key takeaways',
  ],
  testimonial: [
    'Write a testimonial for a SaaS product',
    'Create a customer success story',
    'Generate a product review',
  ],
  cta: [
    'Create signup button copy',
    'Write download prompts',
    'Generate urgency-driven CTAs',
  ],
  body: [
    'Write an about section',
    'Create a product description',
    'Draft an email introduction',
  ],
  research: [
    'Industry trends and statistics',
    'Competitor analysis points',
    'Market insights',
  ],
};

/**
 * Quick prompts for layout generation
 */
export const LAYOUT_QUICK_PROMPTS: Record<AiGenerationType, string[]> = {
  'text-content': [
    'Create a headline for my product',
    'Write bullet points for features',
  ],
  'layout-block': [
    'Create a simple content block',
    'Design a card layout',
  ],
  'hero-section': [
    'Design a hero for my landing page',
    'Create a bold hero section',
  ],
  'feature-grid': [
    'Create a 3-column feature grid',
    'Design feature cards for my app',
  ],
  'testimonial-card': [
    'Create a customer testimonial card',
    'Design a review card',
  ],
  'cta-block': [
    'Create a compelling CTA section',
    'Design a signup block',
  ],
  'stats-row': [
    'Create stats for my business',
    'Design a metrics row',
  ],
  'comparison-table': [
    'Create a pricing comparison',
    'Design a feature comparison',
  ],
  'pricing-card': [
    'Create a pricing card',
    'Design a subscription card',
  ],
  'social-post': [
    'Create an Instagram post template',
    'Design a LinkedIn post layout',
  ],
  'custom': [
    'Create a custom layout',
    'Design something unique',
  ],
};
