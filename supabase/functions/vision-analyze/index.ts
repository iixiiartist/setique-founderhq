/// <reference path="../types/deno_http_server.d.ts" />
/**
 * Vision Analyze Edge Function
 * 
 * Analyzes images using Groq's Llama 4 vision models.
 * Supports OCR, image analysis, document extraction, and captioning.
 * 
 * Models:
 * - meta-llama/llama-4-maverick-17b-128e-instruct (600 tps, best quality)
 * - meta-llama/llama-4-scout-17b-16e-instruct (750 tps, fast)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders as sharedCorsHeaders } from '../_shared/apiAuth.ts';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const corsHeaders = {
  ...sharedCorsHeaders,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Valid vision models
const VISION_MODELS = [
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

interface VisionRequest {
  image: string; // Base64 data URL or URL
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[vision-analyze] Received request');

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      console.error('[vision-analyze] GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Groq API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as VisionRequest;
    const { 
      image, 
      prompt, 
      model = 'meta-llama/llama-4-scout-17b-16e-instruct',
      maxTokens = 2000,
      temperature = 0.1,
      responseFormat = 'text',
    } = body;

    // Validate required fields
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate model
    if (!VISION_MODELS.includes(model)) {
      return new Response(
        JSON.stringify({ error: `Invalid model. Valid options: ${VISION_MODELS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare image content
    let imageContent: { type: 'image_url'; image_url: { url: string } };
    
    if (image.startsWith('data:')) {
      // Base64 data URL
      imageContent = {
        type: 'image_url',
        image_url: { url: image },
      };
    } else if (image.startsWith('http')) {
      // Regular URL
      imageContent = {
        type: 'image_url',
        image_url: { url: image },
      };
    } else {
      // Assume it's raw base64, add data URL prefix
      const mimeType = detectMimeType(image);
      imageContent = {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${image}` },
      };
    }

    // Build system prompt for JSON responses
    let systemPrompt = 'You are a helpful vision assistant that analyzes images accurately.';
    if (responseFormat === 'json') {
      systemPrompt += ' Always respond with valid JSON only, no additional text or markdown.';
    }

    console.log(`[vision-analyze] Using model: ${model}`);
    const startTime = Date.now();

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              imageContent,
            ],
          },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const latencyMs = Date.now() - startTime;
    console.log(`[vision-analyze] Groq response: ${response.status} in ${latencyMs}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[vision-analyze] Groq API error:', errorText);
      
      // Check for specific errors
      if (response.status === 400 && errorText.includes('image')) {
        return new Response(
          JSON.stringify({ error: 'Invalid image format or size', details: errorText }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Vision analysis failed', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || '';

    // Try to parse JSON if expected
    let parsedData: unknown = null;
    if (responseFormat === 'json') {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Keep as text if JSON parsing fails
      }
    }

    return new Response(
      JSON.stringify({
        text: parsedData || text,
        model,
        latencyMs,
        usage: result.usage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err: unknown) {
    console.error('[vision-analyze] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Detect MIME type from base64 string by checking magic bytes
 */
function detectMimeType(base64: string): string {
  // Check first few characters of decoded data
  try {
    const decoded = atob(base64.slice(0, 20));
    
    // PNG: 89 50 4E 47
    if (decoded.charCodeAt(0) === 0x89 && decoded.charCodeAt(1) === 0x50) {
      return 'image/png';
    }
    
    // JPEG: FF D8 FF
    if (decoded.charCodeAt(0) === 0xFF && decoded.charCodeAt(1) === 0xD8) {
      return 'image/jpeg';
    }
    
    // GIF: 47 49 46
    if (decoded.slice(0, 3) === 'GIF') {
      return 'image/gif';
    }
    
    // WebP: RIFF....WEBP
    if (decoded.slice(0, 4) === 'RIFF' && decoded.slice(8, 12) === 'WEBP') {
      return 'image/webp';
    }
  } catch {
    // Default to JPEG if detection fails
  }
  
  return 'image/jpeg';
}
