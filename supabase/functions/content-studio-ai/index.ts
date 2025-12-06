import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/apiAuth.ts';

/**
 * Content Studio AI Edge Function
 * Provides AI-powered content generation for the Content Studio
 * Features: rate limiting, safety moderation, streaming support, element generation
 */

// Rate limiting: requests per minute per user
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

// Element generation limits
const MAX_ELEMENTS_PER_PATCH = 20;
const MAX_ELEMENT_SIZE = 800; // px

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

// Element generation system prompt
const ELEMENT_GENERATION_PROMPT = `You are a design element generator for a canvas-based document editor. 
Generate canvas elements based on the user's request. Output ONLY valid JSON.

Available element types:
- text: { type: "text", x, y, width, height, text, fontSize, fontFamily, fill, align }
- rect: { type: "rect", x, y, width, height, fill, stroke, strokeWidth, cornerRadius }
- circle: { type: "circle", x, y, radius, fill, stroke, strokeWidth }
- line: { type: "line", x, y, points: [x1, y1, x2, y2], stroke, strokeWidth }

Rules:
1. All coordinates must be positive numbers within canvas bounds (0-1200 for x, 0-800 for y)
2. Colors must be valid hex codes (e.g., "#FF5733")
3. Font sizes should be 12-72
4. Maximum ${MAX_ELEMENTS_PER_PATCH} elements per response
5. Keep element dimensions reasonable (max ${MAX_ELEMENT_SIZE}px)

Output format (strict JSON only):
{
  "elements": [...],
  "summary": "Brief description of what was created"
}`;

// Validate and sanitize AI-generated elements
interface AiElement {
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  align?: string;
  points?: number[];
}

function validateAndSanitizeElements(elements: unknown[]): AiElement[] {
  if (!Array.isArray(elements)) return [];
  
  const validTypes = ['text', 'rect', 'circle', 'line', 'ellipse', 'polygon', 'star'];
  const result: AiElement[] = [];
  
  for (const el of elements.slice(0, MAX_ELEMENTS_PER_PATCH)) {
    if (!el || typeof el !== 'object') continue;
    const elem = el as Record<string, unknown>;
    
    if (!validTypes.includes(String(elem.type))) continue;
    
    const elementType = String(elem.type);
    const sanitized: AiElement & { category: string; id: string } = {
      id: crypto.randomUUID(),
      type: elementType,
      category: elementType === 'text' ? 'text' : 'shape',
      x: clamp(Number(elem.x) || 100, 0, 1200),
      y: clamp(Number(elem.y) || 100, 0, 800),
    };
    
    // Type-specific properties
    if (sanitized.type === 'text') {
      sanitized.text = String(elem.text || 'Text').slice(0, 5000);
      sanitized.fontSize = clamp(Number(elem.fontSize) || 16, 8, 200);
      sanitized.fontFamily = String(elem.fontFamily || 'Inter');
      sanitized.fill = sanitizeColor(elem.fill) || '#000000';
      sanitized.width = clamp(Number(elem.width) || 200, 10, MAX_ELEMENT_SIZE);
      sanitized.align = ['left', 'center', 'right'].includes(String(elem.align)) ? String(elem.align) : 'left';
    } else if (sanitized.type === 'rect') {
      sanitized.width = clamp(Number(elem.width) || 100, 10, MAX_ELEMENT_SIZE);
      sanitized.height = clamp(Number(elem.height) || 100, 10, MAX_ELEMENT_SIZE);
      sanitized.fill = sanitizeColor(elem.fill) || '#3B82F6';
      sanitized.stroke = sanitizeColor(elem.stroke);
      sanitized.strokeWidth = clamp(Number(elem.strokeWidth) || 0, 0, 20);
      sanitized.cornerRadius = clamp(Number(elem.cornerRadius) || 0, 0, 100);
    } else if (sanitized.type === 'circle') {
      sanitized.radius = clamp(Number(elem.radius) || 50, 5, MAX_ELEMENT_SIZE / 2);
      sanitized.fill = sanitizeColor(elem.fill) || '#3B82F6';
      sanitized.stroke = sanitizeColor(elem.stroke);
      sanitized.strokeWidth = clamp(Number(elem.strokeWidth) || 0, 0, 20);
    } else if (sanitized.type === 'line') {
      sanitized.points = Array.isArray(elem.points) 
        ? (elem.points as number[]).slice(0, 4).map(n => clamp(Number(n) || 0, -1000, 2000))
        : [0, 0, 100, 0];
      sanitized.stroke = sanitizeColor(elem.stroke) || '#000000';
      sanitized.strokeWidth = clamp(Number(elem.strokeWidth) || 2, 1, 20);
    }
    
    result.push(sanitized as any);
  }
  
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeColor(color: unknown): string | undefined {
  if (typeof color !== 'string') return undefined;
  // Accept hex colors
  if (/^#[0-9A-Fa-f]{6}$/.test(color) || /^#[0-9A-Fa-f]{3}$/.test(color)) {
    return color;
  }
  // Accept rgba
  if (/^rgba?\([^)]+\)$/i.test(color)) {
    return color;
  }
  // Accept named colors
  const namedColors = ['transparent', 'white', 'black', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey'];
  if (namedColors.includes(color.toLowerCase())) {
    return color;
  }
  return undefined;
}

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
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
    const { type, prompt, context, stream = false, mode = 'text', canvasContext } = body;

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

    // Determine if this is element generation mode
    const isElementMode = mode === 'elements' || mode === 'layout';
    
    // Get system prompt based on mode
    let systemPrompt: string;
    if (isElementMode) {
      systemPrompt = ELEMENT_GENERATION_PROMPT;
      if (canvasContext) {
        systemPrompt += `\n\nCurrent canvas context:\n- Canvas size: ${canvasContext.width || 1200}x${canvasContext.height || 800}\n- Existing elements: ${canvasContext.elementCount || 0}`;
      }
    } else {
      systemPrompt = CONTENT_PROMPTS[type] || CONTENT_PROMPTS.body;
    }

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

    // Build request options
    const groqRequestBody: Record<string, unknown> = {
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: isElementMode ? 2048 : 1024,
      temperature: isElementMode ? 0.3 : 0.7, // Lower temp for structured output
      stream: stream && !isElementMode, // Don't stream for element mode (need full JSON)
    };

    // Use JSON mode for element generation if supported
    if (isElementMode) {
      groqRequestBody.response_format = { type: 'json_object' };
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groqRequestBody),
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

    // Handle streaming response (text mode only)
    if (stream && !isElementMode) {
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

    // Handle element generation response
    if (isElementMode) {
      try {
        // Parse JSON response
        let parsed: { elements?: unknown[]; summary?: string };
        try {
          parsed = JSON.parse(content);
        } catch {
          // Try to extract JSON from the response if wrapped in markdown
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                           content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        }

        // Validate and sanitize elements
        const elements = validateAndSanitizeElements(parsed.elements || []);
        
        if (elements.length === 0) {
          return new Response(JSON.stringify({ 
            error: 'Failed to generate valid elements',
            raw: content.slice(0, 500) // Include partial raw for debugging
          }), {
            status: 422,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ 
          elements,
          summary: parsed.summary || `Generated ${elements.length} element(s)`,
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
      } catch (parseError) {
        console.error('[content-studio-ai] Element parse error:', parseError);
        return new Response(JSON.stringify({ 
          error: 'Failed to parse element response',
          details: String(parseError)
        }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Text content response
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
