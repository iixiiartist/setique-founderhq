import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/apiAuth.ts';

/**
 * Content Studio AI Edge Function
 * Provides AI-powered content generation for the Content Studio
 * Features: rate limiting, safety moderation, streaming support
 */

// Rate limiting: requests per minute per user
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

// In-memory rate limit store (resets on cold start, production should use Redis/Upstash)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW_MS };
  }
  
  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetIn: entry.resetAt - now };
}

// Content types and their prompts
const CONTENT_PROMPTS: Record<string, string> = {
  headline: `You are an expert copywriter. Generate 5 compelling, attention-grabbing headlines for the given topic. Each headline should be unique in style - try different approaches like questions, numbers, how-tos, and emotional hooks. Format as a numbered list.`,
  
  bullets: `You are a concise business writer. Create 5 clear, impactful bullet points that explain the key benefits or features of the given topic. Each bullet should be actionable and specific. Use strong verbs and avoid jargon.`,
  
  testimonial: `You are a marketing specialist. Write a realistic, believable customer testimonial for the given product/service. Include specific details, a pain point that was solved, and measurable results if applicable. Keep it between 2-4 sentences.`,
  
  cta: `You are a conversion optimization expert. Write 3 compelling call-to-action variations for the given context. Each should create urgency or highlight value. Include both the button text and a supporting subtext. Format as numbered entries.`,
  
  body: `You are a professional content writer. Write clear, engaging body copy for the given topic. Keep it concise but informative. Use short paragraphs and maintain a professional yet approachable tone. Aim for 2-3 paragraphs.`,
  
  research: `You are a market research analyst. Provide factual, well-researched information about the given topic. Include relevant statistics, trends, and insights. Cite general sources where applicable. Be objective and data-driven.`,
};

// Moderation - check for inappropriate content
const BLOCKED_PATTERNS = [
  /\b(hack|exploit|attack|weapon|drug|illegal)\b/i,
  /\b(violence|harm|abuse|discriminat)\b/i,
];

function moderateInput(input: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, reason: 'Content contains potentially inappropriate material' };
    }
  }
  return { safe: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        resetIn: Math.ceil(rateCheck.resetIn / 1000)
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000))
        }
      });
    }

    // Parse request
    const body = await req.json();
    const { type, prompt, context, stream = false } = body;

    if (!type || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing type or prompt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Input moderation
    const moderation = moderateInput(prompt);
    if (!moderation.safe) {
      return new Response(JSON.stringify({ 
        error: 'Content moderation failed',
        reason: moderation.reason
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get system prompt for content type
    const systemPrompt = CONTENT_PROMPTS[type] || CONTENT_PROMPTS.body;

    // Build messages
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context ? `Context: ${context}\n\nRequest: ${prompt}` : prompt }
    ];

    // Call Groq API
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.json();
      console.error('[content-studio-ai] Groq error:', error);
      
      // Handle rate limiting from Groq
      if (groqResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'AI service temporarily unavailable. Please try again in a moment.'
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle streaming response
    if (stream) {
      const transformStream = new TransformStream();
      const writer = transformStream.writable.getWriter();
      
      (async () => {
        const reader = groqResponse.body!.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
          }
        } finally {
          await writer.close();
        }
      })();

      return new Response(transformStream.readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      });
    }

    // Non-streaming response
    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ 
      content,
      usage: data.usage,
      remaining: rateCheck.remaining
    }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      }
    });

  } catch (error) {
    console.error('[content-studio-ai] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
