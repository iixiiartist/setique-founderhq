/**
 * Form Submit Edge Function
 * 
 * Handles public form submissions with:
 * - Server-side IP hashing for rate limiting
 * - Captcha verification (reCAPTCHA/hCaptcha/Turnstile)
 * - Calls the secure_submit_form RPC with real IP hash
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Hash IP address with a secret salt for privacy
async function hashIP(ip: string): Promise<string> {
  const salt = Deno.env.get('IP_HASH_SALT') || 'default-salt-change-me';
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get real client IP from headers (handles proxies/CDN)
function getClientIP(req: Request): string {
  // Cloudflare
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  
  // Standard proxy headers
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Get the first (original client) IP
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIP = req.headers.get('x-real-ip');
  if (xRealIP) return xRealIP;
  
  // Fallback - shouldn't happen in production
  return 'unknown';
}

// Verify captcha token
async function verifyCaptcha(
  token: string,
  provider: 'recaptcha' | 'hcaptcha' | 'turnstile',
  secretKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let verifyUrl: string;
    let body: URLSearchParams;

    switch (provider) {
      case 'recaptcha':
        verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
        body = new URLSearchParams({
          secret: secretKey,
          response: token,
        });
        break;
      case 'hcaptcha':
        verifyUrl = 'https://hcaptcha.com/siteverify';
        body = new URLSearchParams({
          secret: secretKey,
          response: token,
        });
        break;
      case 'turnstile':
        verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        body = new URLSearchParams({
          secret: secretKey,
          response: token,
        });
        break;
      default:
        return { success: false, error: 'Unknown captcha provider' };
    }

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const result = await response.json();
    return {
      success: result.success === true,
      error: result.success ? undefined : 'Captcha verification failed',
    };
  } catch (error) {
    console.error('Captcha verification error:', error);
    return { success: false, error: 'Captcha verification failed' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const {
      form_id,
      data,
      password,
      session_id,
      metadata,
      captcha_token,
      captcha_provider,
    } = body;

    // Validate required fields
    if (!form_id || !data || !session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: form_id, data, session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role for DB access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get form settings to check captcha requirements
    const { data: form, error: formError } = await supabaseAdmin
      .from('forms')
      .select('settings')
      .eq('id', form_id)
      .single();

    if (formError || !form) {
      return new Response(
        JSON.stringify({ error: 'Form not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if captcha is required
    const captchaSettings = form.settings?.captcha;
    if (captchaSettings?.enabled) {
      if (!captcha_token) {
        return new Response(
          JSON.stringify({ error: 'Captcha verification required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the secret key from environment based on provider
      const provider = captcha_provider || captchaSettings.provider || 'recaptcha';
      let secretKey: string | undefined;
      
      switch (provider) {
        case 'recaptcha':
          secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
          break;
        case 'hcaptcha':
          secretKey = Deno.env.get('HCAPTCHA_SECRET_KEY');
          break;
        case 'turnstile':
          secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
          break;
      }

      if (!secretKey) {
        console.error(`Missing secret key for captcha provider: ${provider}`);
        return new Response(
          JSON.stringify({ error: 'Captcha not configured on server' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const captchaResult = await verifyCaptcha(captcha_token, provider, secretKey);
      if (!captchaResult.success) {
        return new Response(
          JSON.stringify({ error: captchaResult.error || 'Captcha verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get and hash client IP
    const clientIP = getClientIP(req);
    const ipHash = await hashIP(clientIP);

    // Prepare enhanced metadata with real IP hash and captcha verification flag
    const enhancedMetadata = {
      ...metadata,
      ipHash: ipHash,  // camelCase to match RPC expectation
      captchaVerified: true,  // Only Edge Function can set this - RPC enforces it
      submittedVia: 'edge_function',
    };

    // Call the secure submit RPC
    const { data: result, error: submitError } = await supabaseAdmin.rpc(
      'secure_submit_form',
      {
        p_form_id: form_id,
        p_data: data,
        p_password: password || null,
        p_session_id: session_id,
        p_metadata: enhancedMetadata,
      }
    );

    if (submitError) {
      console.error('Submit RPC error:', submitError);
      return new Response(
        JSON.stringify({ error: submitError.message || 'Submission failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle RPC response
    if (result?.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: result?.submission_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Form submit error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
