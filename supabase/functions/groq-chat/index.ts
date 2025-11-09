// Supabase Edge Function for secure Groq API calls
// Uses Llama 3.3 70B via Groq's ultra-fast LPU infrastructure

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Type definitions for OpenAI-compatible format
interface MessageContent {
  text?: string;
  tool_call_id?: string;
  name?: string;
  content?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ChatRequest {
  messages: Message[];
  tools?: any[];
  tool_choice?: string | { type: string; function?: { name: string } };
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json() as ChatRequest;
    const {
      messages,
      tools,
      tool_choice = 'auto',
      temperature = 0.7,
      max_tokens = 4096,
      model = 'llama-3.3-70b-versatile', // Groq's latest Llama model (Nov 2024)
    } = body;

    console.log('Received request - messages:', messages.length);
    console.log('Last message role:', messages[messages.length - 1]?.role);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Groq API key from secure environment (check both spellings)
    const groqApiKey = Deno.env.get('GROQ_API_KEY') || Deno.env.get('GROK_API_KEY');
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'Groq API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build request body for Groq
    const groqRequest: any = {
      model,
      messages,
      temperature,
      max_tokens,
    };

    if (tools && tools.length > 0) {
      groqRequest.tools = tools;
      groqRequest.tool_choice = tool_choice;
    }

    console.log('Sending to Groq - model:', model);

    // Call Groq API
    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groqRequest),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return new Response(
        JSON.stringify({
          error: 'Groq API request failed',
          details: errorText,
        }),
        { status: groqResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    console.log('Groq response - finish reason:', groqData.choices?.[0]?.finish_reason);

    // Extract response
    const choice = groqData.choices?.[0];
    const message = choice?.message;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'No message in response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log('Returning tool calls:', message.tool_calls.length);
      
      // Convert to our expected format (preserve ID for tool responses)
      const functionCalls = message.tool_calls.map((tc: ToolCall) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      }));

      return new Response(
        JSON.stringify({
          functionCalls,
          finishReason: choice.finish_reason,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return text response
    return new Response(
      JSON.stringify({
        response: message.content || '',
        finishReason: choice.finish_reason,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in groq-chat function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
