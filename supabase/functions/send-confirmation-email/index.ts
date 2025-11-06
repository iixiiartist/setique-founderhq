import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, confirmationUrl, fullName } = await req.json()

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - FounderHQ</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: white; border: 3px solid black; box-shadow: 8px 8px 0 rgba(0,0,0,1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; background-color: black; border-bottom: 3px solid black;">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: white; font-family: monospace;">
                FounderHQ
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #fbbf24;">
                Your Lightweight GTM Hub
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: bold; color: black;">
                Welcome ${fullName ? `${fullName}` : 'to FounderHQ'}! 👋
              </h2>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
                Thanks for signing up! We're excited to help you streamline your go-to-market operations with AI-powered tools.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                Click the button below to confirm your email address and get started:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 0 24px;">
                <tr>
                  <td style="border-radius: 0; background-color: #fbbf24; border: 3px solid black; box-shadow: 4px 4px 0 rgba(0,0,0,1);">
                    <a href="${confirmationUrl}" 
                       style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: bold; color: black; text-decoration: none; font-family: monospace;">
                      CONFIRM EMAIL →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Or copy and paste this URL into your browser:
              </p>
              
              <p style="margin: 0 0 32px; padding: 12px; background-color: #f3f4f6; border: 2px solid black; font-family: monospace; font-size: 12px; word-break: break-all; color: #374151;">
                ${confirmationUrl}
              </p>
              
              <div style="padding: 20px; background-color: #fef3c7; border: 2px solid black; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; font-size: 14px; font-weight: bold; color: black;">
                  🎉 What's Next?
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #374151;">
                  <li>Complete your business profile</li>
                  <li>Set up your CRM pipeline</li>
                  <li>Explore task management</li>
                  <li>Upgrade to unlock AI & document storage</li>
                </ul>
              </div>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If you didn't create an account with FounderHQ, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 3px solid black;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-align: center;">
                © 2025 Setique. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                Questions? Reply to this email or visit <a href="https://founderhq.setique.com" style="color: black; text-decoration: underline;">founderhq.setique.com</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    const plainText = `
Welcome to FounderHQ${fullName ? `, ${fullName}` : ''}!

Thanks for signing up! Click the link below to confirm your email address:

${confirmationUrl}

What's Next?
• Complete your business profile
• Set up your CRM pipeline
• Explore task management
• Upgrade to unlock AI & document storage

If you didn't create an account with FounderHQ, you can safely ignore this email.

© 2025 Setique. All rights reserved.
Questions? Visit https://founderhq.setique.com
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'FounderHQ <noreply@founderhq.setique.com>',
        to: [email],
        subject: 'Confirm Your Email - Welcome to FounderHQ! 👋',
        html: html,
        text: plainText,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
