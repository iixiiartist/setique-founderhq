/// <reference path="../types/deno_http_server.d.ts" />
/**
 * Audio Transcribe Edge Function
 * 
 * Transcribes audio files to text using Groq's Whisper Large V3 Turbo.
 * Supports: mp3, mp4, mpeg, mpga, webm, wav, ogg, flac
 * Max file size: 25MB
 * 
 * Performance: ~250 tokens/sec (30x realtime)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders as sharedCorsHeaders } from '../_shared/apiAuth.ts';

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

const corsHeaders = {
  ...sharedCorsHeaders,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

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
    console.log('[audio-transcribe] Received request');

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      console.error('[audio-transcribe] GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Groq API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;
    
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: `File too large. Maximum size is 25MB, got ${(audioFile.size / 1024 / 1024).toFixed(1)}MB` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[audio-transcribe] Processing file: ${audioFile.name}, size: ${audioFile.size}`);

    // Build request to Groq
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile);
    groqFormData.append('model', 'whisper-large-v3-turbo');
    
    // Optional parameters
    const language = formData.get('language') as string;
    const prompt = formData.get('prompt') as string;
    const responseFormat = formData.get('response_format') as string;
    const timestampGranularity = formData.get('timestamp_granularities') as string;

    if (language) groqFormData.append('language', language);
    if (prompt) groqFormData.append('prompt', prompt);
    if (responseFormat) groqFormData.append('response_format', responseFormat || 'verbose_json');
    if (timestampGranularity) groqFormData.append('timestamp_granularities[]', timestampGranularity);

    const startTime = Date.now();
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: groqFormData,
    });

    const latencyMs = Date.now() - startTime;
    console.log(`[audio-transcribe] Groq response: ${response.status} in ${latencyMs}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[audio-transcribe] Groq API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Transcription failed', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        text: result.text,
        language: result.language,
        duration: result.duration,
        words: result.words,
        segments: result.segments,
        model: 'whisper-large-v3-turbo',
        latencyMs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err: unknown) {
    console.error('[audio-transcribe] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
