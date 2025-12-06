import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationPayload {
  email: string;
  workspaceName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  token: string;
  expiresAt: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'https://setique.com';

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: InvitationPayload = await req.json();
    const { email, workspaceName, inviterName, inviterEmail, role, token, expiresAt } = payload;

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the invitation URL
    const inviteUrl = `${appUrl}/app?token=${encodeURIComponent(token)}`;
    
    // Format expiration date
    const expirationDate = expiresAt 
      ? new Date(expiresAt).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : '7 days from now';

    // If Resend API key is available, send via Resend
    if (resendApiKey) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${workspaceName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">You're Invited!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi there,
      </p>
      
      <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        <strong>${inviterName}</strong> (${inviterEmail}) has invited you to join 
        <strong>${workspaceName}</strong> as a <strong>${role}</strong>.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" 
           style="display: inline-block; background: #18181b; color: white; padding: 14px 32px; 
                  border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        This invitation will expire on <strong>${expirationDate}</strong>.
      </p>
      
      <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 16px 0 0;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
      
      <!-- Fallback link -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
        <p style="color: #a1a1aa; font-size: 12px; line-height: 1.6; margin: 0;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #71717a; font-size: 12px; word-break: break-all; margin: 8px 0 0;">
          ${inviteUrl}
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f4f4f5; padding: 24px; text-align: center;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Setique. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `;

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Setique <noreply@setique.com>',
          to: [email],
          subject: `You're invited to join ${workspaceName}`,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        console.error('Resend API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const resendData = await resendResponse.json();
      console.log('Invitation email sent successfully:', resendData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Invitation email sent',
          emailId: resendData.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // No email service configured - log and return success with flag
      console.log('No email service configured. Invitation created but email not sent.');
      console.log('Invitation details:', { email, workspaceName, inviteUrl });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Invitation created but email service not configured',
          emailSent: false,
          inviteUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in send-invitation function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
