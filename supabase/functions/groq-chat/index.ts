import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/apiAuth.ts';

// Valid Groq models as of late 2024
const VALID_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile', 
  'llama-3.1-8b-instant',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

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
      maxTokens: max_tokens
    });
    
    const apiKey = Deno.env.get('GROQ_API_KEY');

    if (!apiKey) {
      console.error('[groq-chat] GROQ_API_KEY not set');
      throw new Error('GROQ_API_KEY not set');
    }

    // Use requested model or fall back to a reliable default
    const requestedModel = model || 'llama-3.3-70b-versatile';
    
    const requestBody = {
      model: requestedModel,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 4096,
    };
    
    // Only add tools if provided
    if (tools && tools.length > 0) {
      (requestBody as any).tools = tools;
      if (tool_choice) {
        (requestBody as any).tool_choice = tool_choice;
      }
    }

    console.log('[groq-chat] Calling Groq API with model:', requestedModel);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log('[groq-chat] Groq API response status:', response.status, 'ok:', response.ok);

    if (!response.ok) {
      console.error('[groq-chat] Groq API error:', data.error);
      
      // Handle rate limits specifically
      if (data.error?.code === 'rate_limit_exceeded') {
         const match = data.error?.message?.match(/try again in (\d+\.?\d*)/i);
         const retryAfter = match ? Math.ceil(parseFloat(match[1])) : 5;
         return new Response(JSON.stringify({ 
             error: data.error.message, 
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
