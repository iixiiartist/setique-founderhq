import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/apiAuth.ts';

// Valid Groq models as of December 2024 (Dev Tier)
const VALID_MODELS = [
  // Production Models
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-guard-4-12b',
  'whisper-large-v3',
  'whisper-large-v3-turbo',
  // Preview Models
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'moonshotai/kimi-k2-instruct-0905',
  'qwen/qwen3-32b',
  'openai/gpt-oss-safeguard-20b',
  // Compound Systems (Agentic AI)
  'groq/compound',
  'groq/compound-mini',
  // Legacy (deprecated but still functional)
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

// Retry configuration for rate limits
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

async function callGroqWithRetry(
  requestBody: any,
  apiKey: string,
  retryCount = 0
): Promise<{ data: any; status: number; ok: boolean }> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  
  // If rate limited and we have retries left, wait and retry
  if (response.status === 429 && retryCount < MAX_RETRIES) {
    // Parse retry-after from error or use exponential backoff
    const match = data.error?.message?.match(/try again in (\d+\.?\d*)/i);
    const retryAfter = match ? Math.ceil(parseFloat(match[1]) * 1000) : BASE_DELAY_MS * Math.pow(2, retryCount);
    
    console.log(`[groq-chat] Rate limited, retrying in ${retryAfter}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, retryAfter));
    
    return callGroqWithRetry(requestBody, apiKey, retryCount + 1);
  }
  
  return { data, status: response.status, ok: response.ok };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, model, tools, tool_choice, temperature, max_tokens } = body;
    
    console.log('[groq-chat] Request received:', {
      model: model || 'default',
      messagesCount: messages?.length,
      hasTools: !!tools,
      toolCount: tools?.length || 0,
      maxTokens: max_tokens
    });
    
    const apiKey = Deno.env.get('GROQ_API_KEY');

    if (!apiKey) {
      console.error('[groq-chat] GROQ_API_KEY not set');
      throw new Error('GROQ_API_KEY not set');
    }

    // Use requested model or fall back to a reliable default
    const requestedModel = model || 'llama-3.3-70b-versatile';
    
    // Validate model against allowlist before making API call
    if (!VALID_MODELS.includes(requestedModel)) {
      console.error('[groq-chat] Invalid model requested:', requestedModel);
      return new Response(JSON.stringify({
        error: `Invalid model '${requestedModel}'. Valid models are: ${VALID_MODELS.join(', ')}`,
        code: 'invalid_model',
        validModels: VALID_MODELS,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const requestBody: any = {
      model: requestedModel,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 4096,
    };

    // Add service tier if specified (flex, performance, etc.)
    if (body.service_tier) {
      requestBody.service_tier = body.service_tier;
    }

    // Add reasoning parameters for GPT-OSS and Qwen models
    if (requestedModel.startsWith('openai/gpt-oss') || requestedModel.startsWith('qwen/')) {
      if (body.reasoning_effort) {
        requestBody.reasoning_effort = body.reasoning_effort; // 'low', 'medium', 'high' for GPT-OSS; 'none', 'default' for Qwen
      }
      if (body.reasoning_format) {
        requestBody.reasoning_format = body.reasoning_format; // 'parsed', 'raw', 'hidden'
      }
      if (body.include_reasoning !== undefined) {
        requestBody.include_reasoning = body.include_reasoning;
      }
    }

    // Compound models don't use custom tools - they have built-in tools
    const isCompoundModel = requestedModel.startsWith('groq/compound');
    
    // Only add tools if provided AND not using Compound
    if (tools && tools.length > 0 && !isCompoundModel) {
      requestBody.tools = tools;
      if (tool_choice) {
        requestBody.tool_choice = tool_choice;
      }
    }

    console.log('[groq-chat] Calling Groq API with model:', requestedModel);

    // Use retry wrapper for rate limit handling
    const { data, status, ok } = await callGroqWithRetry(requestBody, apiKey);
    
    console.log('[groq-chat] Groq API response status:', status, 'ok:', ok);

    if (!ok) {
      console.error('[groq-chat] Groq API error:', data.error);
      
      // Handle rate limits specifically (after retries exhausted)
      if (status === 429 || data.error?.code === 'rate_limit_exceeded') {
         const match = data.error?.message?.match(/try again in (\d+\.?\d*)/i);
         const retryAfter = match ? Math.ceil(parseFloat(match[1])) : 5;
         return new Response(JSON.stringify({ 
             error: data.error?.message || 'Rate limit exceeded', 
             isRateLimit: true,
             retryAfter 
         }), {
             status: 429,
             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
         });
      }
      
      // Handle model not found
      if (data.error?.code === 'model_not_found' || data.error?.message?.includes('model')) {
        console.error('[groq-chat] Model not found, requested:', requestedModel);
        return new Response(JSON.stringify({ 
          error: `Model '${requestedModel}' not available. ${data.error?.message || ''}`,
          code: 'model_not_found'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(data.error?.message || 'Groq API error');
    }

    // Transform Groq API response to the format expected by groqService.ts
    const choice = data.choices?.[0];
    const message = choice?.message;
    
    console.log('[groq-chat] Response received:', {
      hasContent: !!message?.content,
      contentLength: message?.content?.length || 0,
      hasToolCalls: !!message?.tool_calls,
      finishReason: choice?.finish_reason
    });
    
    // Extract function calls if present
    const functionCalls = message?.tool_calls?.map((tc: any) => ({
      name: tc.function?.name,
      args: typeof tc.function?.arguments === 'string' 
        ? JSON.parse(tc.function.arguments) 
        : tc.function?.arguments,
    })) || [];

    const transformedResponse = {
      response: message?.content || '',
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      finishReason: choice?.finish_reason || 'stop',
    };

    return new Response(JSON.stringify(transformedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[groq-chat] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
