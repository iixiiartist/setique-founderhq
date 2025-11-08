import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationRequest {
  email: string
  workspaceName: string
  inviterName: string
  inviterEmail: string
  role: string
  token: string
  expiresAt: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured. Please set RESEND_API_KEY secret.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const invitation: InvitationRequest = await req.json()

    // Validate required fields
    if (!invitation.email || !invitation.token || !invitation.workspaceName) {
      throw new Error('Missing required fields')
    }

    // Create invitation link
    const appUrl = Deno.env.get('APP_URL')
    
    // Warn if APP_URL not set (will use localhost fallback)
    if (!appUrl) {
      console.warn('⚠️ APP_URL secret not set! Falling back to localhost. Set it with: npx supabase secrets set APP_URL=https://your-domain.com')
    }
    
    const inviteUrl = `${appUrl || 'http://localhost:5173'}?token=${invitation.token}`
    
    console.log(`Sending invitation to ${invitation.email} with URL: ${inviteUrl}`)

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Joe from Setique <joe@setique.com>',
        to: [invitation.email],
        subject: `You've been invited to join ${invitation.workspaceName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                .button:hover { background: #5568d3; }
                .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                .role-badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
                .expiry { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">🎉 You're Invited!</h1>
                </div>
                <div class="content">
                  <p>Hi there,</p>
                  
                  <p><strong>${invitation.inviterName || invitation.inviterEmail}</strong> has invited you to join their workspace on Setique:</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #e5e7eb;">
                    <h2 style="margin-top: 0;">${invitation.workspaceName}</h2>
                    <p style="margin-bottom: 0;">Your role: <span class="role-badge">${invitation.role}</span></p>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${inviteUrl}" class="button">Accept Invitation</a>
                  </div>
                  
                  <div class="expiry">
                    <strong>⏰ Expires:</strong> ${new Date(invitation.expiresAt).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  
                  <div style="background: #e0e7ff; border-left: 4px solid #667eea; padding: 12px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px;">
                      <strong>📝 New to Setique?</strong><br>
                      Click the button above and you'll be prompted to create an account. Make sure to sign up with this email address (<strong>${invitation.email}</strong>) to accept the invitation.
                    </p>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
                  </p>
                </div>
                
                <div class="footer">
                  <p>This invitation was sent by ${invitation.inviterEmail}</p>
                  <p>© 2025 Setique. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error('Resend API error:', errorData)
      throw new Error(`Failed to send email: ${errorData}`)
    }

    const emailData = await emailResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailData.id,
        message: 'Invitation email sent successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending invitation email:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send invitation email' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
