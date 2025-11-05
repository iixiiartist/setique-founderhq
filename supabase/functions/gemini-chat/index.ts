// Supabase Edge Function for secure Gemini API calls
// This keeps your API key secret on the server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  systemInstruction?: string;
  tools?: any[];
  toolConfig?: any;
  temperature?: number;
  maxTokens?: number;
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
      systemInstruction,
      tools,
      toolConfig,
      temperature = 0.7,
      maxTokens = 4096,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gemini API key from secure environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform messages to Gemini format
    const contents = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    // Build request body for Gemini
    const geminiRequest: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemInstruction) {
      geminiRequest.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (tools && tools.length > 0) {
      geminiRequest.tools = tools;
    }

    if (toolConfig) {
      geminiRequest.toolConfig = toolConfig;
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequest),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({
          error: 'Gemini API request failed',
          details: errorText,
        }),
        { status: geminiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();

    // Check for function calls
    const candidates = geminiData.candidates || [];
    const firstCandidate = candidates[0];
    const content = firstCandidate?.content;

    if (content?.parts) {
      const functionCalls = content.parts
        .filter((part: any) => part.functionCall)
        .map((part: any) => part.functionCall);

      if (functionCalls.length > 0) {
        return new Response(
          JSON.stringify({
            functionCalls,
            finishReason: firstCandidate.finishReason,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Extract text response
    const textPart = content?.parts?.find((part: any) => part.text);
    const responseText = textPart?.text || '';

    return new Response(
      JSON.stringify({
        response: responseText,
        finishReason: firstCandidate?.finishReason,
        safetyRatings: firstCandidate?.safetyRatings,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
