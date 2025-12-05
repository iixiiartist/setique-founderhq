/**
 * Content Studio AI Service
 * Client-side service for calling the content-studio-ai edge function
 */

import { supabase } from '../../../lib/supabase';

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

/**
 * Generate content using the Content Studio AI edge function
 */
export async function generateContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  const { data, error } = await supabase.functions.invoke<AIGenerationResponse>('content-studio-ai', {
    body: request,
  });

  if (error) {
    console.error('[ContentStudioAI] Error:', error);
    throw new Error(error.message || 'Failed to generate content');
  }

  if (!data) {
    throw new Error('No response from AI service');
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

/**
 * Content type labels for UI
 */
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
