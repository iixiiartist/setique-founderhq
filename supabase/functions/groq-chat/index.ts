import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, model, tools, tool_choice, temperature, max_tokens } = await req.json();
    const apiKey = Deno.env.get('GROQ_API_KEY');

    if (!apiKey) {
      throw new Error('GROQ_API_KEY not set');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llama3-70b-8192',
        messages,
        tools,
        tool_choice,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 4096,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
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
      throw new Error(data.error?.message || 'Groq API error');
    }

    // Transform Groq API response to the format expected by groqService.ts
    const choice = data.choices?.[0];
    const message = choice?.message;
    
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
