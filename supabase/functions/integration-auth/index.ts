import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action'); // 'authorize' or 'callback'
    let provider = url.searchParams.get('provider'); // 'gmail' or 'outlook'
    
    // For callback, we need the code and state (which contains workspace_id and user_id)
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // If callback, try to get provider from state if not in params
    if (!provider && code && state) {
      try {
        const decodedState = JSON.parse(atob(state));
        provider = decodedState.provider;
      } catch (e) {
        console.error('Error decoding state:', e);
      }
    }

    if (!provider) {
      throw new Error('Missing provider');
    }

    // Ensure SUPABASE_URL is available for redirect URI
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) throw new Error('SUPABASE_URL not set');
    const redirectUri = `${supabaseUrl}/functions/v1/integration-auth`;

    // ------------------------------------------------------------------------
    // 1. AUTHORIZE FLOW - Redirect user to provider
    // ------------------------------------------------------------------------
    if (action === 'authorize') {
      const workspaceId = url.searchParams.get('workspace_id');
      const userId = url.searchParams.get('user_id');
      
      if (!workspaceId || !userId) {
        throw new Error('Missing workspace_id or user_id');
      }

      // Encode state to pass through OAuth dance
      const stateParam = btoa(JSON.stringify({ workspaceId, userId, provider }));

      let authUrl = '';

      if (provider === 'gmail') {
        const clientId = Deno.env.get('GMAIL_CLIENT_ID');
        if (!clientId) throw new Error('GMAIL_CLIENT_ID not set');

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
          access_type: 'offline', // Important for refresh token
          prompt: 'consent',      // Force consent to ensure refresh token
          state: stateParam,
        });
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      } 
      else if (provider === 'outlook') {
        const clientId = Deno.env.get('OUTLOOK_CLIENT_ID');
        if (!clientId) throw new Error('OUTLOOK_CLIENT_ID not set');

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/User.Read offline_access',
          state: stateParam,
        });
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
      }

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ------------------------------------------------------------------------
    // 2. CALLBACK FLOW - Exchange code for token
    // ------------------------------------------------------------------------
    if (code && state) {
      // Decode state
      const { workspaceId, userId, provider: stateProvider } = JSON.parse(atob(state));
      
      if (provider !== stateProvider) {
        throw new Error('Provider mismatch');
      }

      let tokens: any = {};
      let emailAddress = '';

      if (provider === 'gmail') {
        const clientId = Deno.env.get('GMAIL_CLIENT_ID');
        const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
        
        // Exchange code
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId!,
            client_secret: clientSecret!,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        
        tokens = await tokenRes.json();
        if (tokens.error) throw new Error(tokens.error_description || tokens.error);

        // Get user email
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const userData = await userRes.json();
        emailAddress = userData.email;
      }
      else if (provider === 'outlook') {
        const clientId = Deno.env.get('OUTLOOK_CLIENT_ID');
        const clientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET');

        // Exchange code
        const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId!,
            client_secret: clientSecret!,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        tokens = await tokenRes.json();
        if (tokens.error) throw new Error(tokens.error_description || tokens.error);

        // Get user email
        const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const userData = await userRes.json();
        emailAddress = userData.mail || userData.userPrincipalName;
      }

      // ----------------------------------------------------------------------
      // 3. STORE TOKENS
      // ----------------------------------------------------------------------
      
      // Initialize Admin Client (Service Role) to bypass RLS for insertion
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Calculate expiry
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

      const { error } = await supabaseAdmin
        .from('integrated_accounts')
        .upsert({
          workspace_id: workspaceId,
          user_id: userId,
          provider,
          email_address: emailAddress,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token, // Important!
          token_expires_at: expiresAt,
          status: 'active',
          last_synced_at: new Date(0).toISOString(), // Force sync
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id,user_id,provider'
        });

      if (error) throw error;

      // Redirect back to the app
      const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
      return Response.redirect(`${appUrl}/settings?integration=success&provider=${provider}`, 302);
    }

    throw new Error('Invalid request');

  } catch (error) {
    console.error('Auth Error:', error);
    
    // If it's an API call (authorize), return JSON
    if (req.url.includes('action=authorize')) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Otherwise (callback), return HTML error page
    return new Response(
      `<h1>Authentication Failed</h1><p>${error.message}</p><a href="/">Return to App</a>`,
      { 
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
});
