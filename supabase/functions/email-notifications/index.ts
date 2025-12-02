import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/apiAuth.ts'

interface EmailNotificationRequest {
  notificationId?: string;
  userId: string;
  workspaceId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
}

interface DigestRequest {
  digestType: 'daily' | 'weekly';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, ...data } = await req.json()

    switch (action) {
      case 'send_immediate': {
        return await sendImmediateNotification(supabase, data as EmailNotificationRequest, resendApiKey)
      }
      
      case 'send_digest': {
        return await sendDigestEmails(supabase, data as DigestRequest, resendApiKey)
      }
      
      case 'process_queue': {
        return await processEmailQueue(supabase, resendApiKey)
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('Email notification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Send immediate email notification
async function sendImmediateNotification(
  supabase: any,
  data: EmailNotificationRequest,
  resendApiKey?: string
) {
  console.log('📧 Processing immediate email notification...')

  // Check user's notification preferences
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', data.userId)
    .maybeSingle()

  // Default to sending if no preferences exist
  const shouldSendEmail = prefs?.email_enabled !== false && 
                          prefs?.email_frequency === 'instant'

  if (!shouldSendEmail) {
    console.log('User has disabled instant email notifications')
    return new Response(
      JSON.stringify({ sent: false, reason: 'User preference disabled' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  }

  // Get user's email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', data.userId)
    .single()

  if (profileError || !profile?.email) {
    console.error('Could not find user email:', profileError)
    return new Response(
      JSON.stringify({ sent: false, reason: 'User email not found' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  }

  // Get workspace name
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', data.workspaceId)
    .single()

  // Create email content
  const emailHtml = generateEmailHtml({
    userName: profile.full_name || 'there',
    title: data.title,
    message: data.message,
    actionUrl: data.actionUrl,
    workspaceName: workspace?.name || 'Your Workspace',
  })

  const emailText = generateEmailText({
    userName: profile.full_name || 'there',
    title: data.title,
    message: data.message,
    actionUrl: data.actionUrl,
  })

  // Queue email in database
  const { data: queuedEmail, error: queueError } = await supabase
    .from('email_notification_queue')
    .insert({
      user_id: data.userId,
      workspace_id: data.workspaceId,
      notification_id: data.notificationId,
      to_email: profile.email,
      subject: data.title,
      body_html: emailHtml,
      body_text: emailText,
      status: 'pending',
    })
    .select()
    .single()

  if (queueError) {
    console.error('Failed to queue email:', queueError)
    return new Response(
      JSON.stringify({ sent: false, error: queueError.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  // If Resend API key is available, send immediately
  if (resendApiKey) {
    const sendResult = await sendViaResend(
      resendApiKey,
      profile.email,
      data.title,
      emailHtml,
      emailText
    )

    // Update queue status
    await supabase
      .from('email_notification_queue')
      .update({
        status: sendResult.success ? 'sent' : 'failed',
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error_message: sendResult.error || null,
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', queuedEmail.id)

    // Update notification email_sent status
    if (sendResult.success && data.notificationId) {
      await supabase
        .from('notifications')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', data.notificationId)
    }

    return new Response(
      JSON.stringify({ sent: sendResult.success, error: sendResult.error }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  }

  // If no Resend API key, email is queued for later processing
  return new Response(
    JSON.stringify({ sent: false, queued: true, reason: 'Email queued for processing' }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  )
}

// Send digest emails (daily/weekly)
async function sendDigestEmails(
  supabase: any,
  data: DigestRequest,
  resendApiKey?: string
) {
  console.log(`📧 Processing ${data.digestType} digest emails...`)

  // Get users who want digest emails
  const frequencyValue = data.digestType === 'daily' ? 'daily' : 'weekly'
  
  const { data: users, error: usersError } = await supabase
    .from('notification_preferences')
    .select(`
      user_id,
      email_digest_time,
      email_digest_day,
      profiles:user_id(email, full_name)
    `)
    .eq('email_enabled', true)
    .eq('email_frequency', frequencyValue)

  if (usersError) {
    console.error('Failed to fetch users:', usersError)
    return new Response(
      JSON.stringify({ error: usersError.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  let sentCount = 0
  let errorCount = 0

  for (const user of users || []) {
    // Get unread notifications since last digest
    const sinceDate = data.digestType === 'daily' 
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.user_id)
      .eq('read', false)
      .eq('email_sent', false)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (!notifications || notifications.length === 0) {
      continue
    }

    const profile = user.profiles as { email: string; full_name: string }
    if (!profile?.email) continue

    // Generate digest email
    const digestHtml = generateDigestEmailHtml({
      userName: profile.full_name || 'there',
      notifications,
      digestType: data.digestType,
    })

    const digestText = generateDigestEmailText({
      userName: profile.full_name || 'there',
      notifications,
      digestType: data.digestType,
    })

    const subject = data.digestType === 'daily' 
      ? `Your Daily Notification Digest (${notifications.length} updates)`
      : `Your Weekly Notification Digest (${notifications.length} updates)`

    if (resendApiKey) {
      const result = await sendViaResend(
        resendApiKey,
        profile.email,
        subject,
        digestHtml,
        digestText
      )

      if (result.success) {
        sentCount++
        
        // Mark notifications as email sent
        const notificationIds = notifications.map((n: any) => n.id)
        await supabase
          .from('notifications')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .in('id', notificationIds)
      } else {
        errorCount++
      }
    }
  }

  return new Response(
    JSON.stringify({ 
      sent: sentCount, 
      errors: errorCount,
      totalUsers: users?.length || 0,
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  )
}

// Process queued emails
async function processEmailQueue(supabase: any, resendApiKey?: string) {
  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: 'Resend API key not configured' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  console.log('📧 Processing email queue...')

  // Get pending emails
  const { data: pendingEmails, error } = await supabase
    .from('email_notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('Failed to fetch pending emails:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  let sentCount = 0
  let failedCount = 0

  for (const email of pendingEmails || []) {
    const result = await sendViaResend(
      resendApiKey,
      email.to_email,
      email.subject,
      email.body_html,
      email.body_text
    )

    await supabase
      .from('email_notification_queue')
      .update({
        status: result.success ? 'sent' : (email.attempts >= 2 ? 'failed' : 'pending'),
        sent_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
        attempts: email.attempts + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', email.id)

    if (result.success) {
      sentCount++
      
      if (email.notification_id) {
        await supabase
          .from('notifications')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq('id', email.notification_id)
      }
    } else {
      failedCount++
    }
  }

  return new Response(
    JSON.stringify({
      processed: pendingEmails?.length || 0,
      sent: sentCount,
      failed: failedCount,
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  )
}

// Send email via Resend API
async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FounderHQ <notifications@founderhq.app>',
        to: [to],
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.message || 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Email template generators
function generateEmailHtml(params: {
  userName: string;
  title: string;
  message: string;
  actionUrl?: string;
  workspaceName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">FounderHQ</h1>
  </div>
  
  <div style="padding: 30px 20px; background: #fff; border: 2px solid #000;">
    <h2 style="margin-top: 0; color: #000;">${params.title}</h2>
    
    <p>Hi ${params.userName},</p>
    
    <p style="background: #f5f5f5; padding: 15px; border-left: 4px solid #000;">
      ${params.message}
    </p>
    
    ${params.actionUrl ? `
    <p style="text-align: center; margin: 30px 0;">
      <a href="${params.actionUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 30px; text-decoration: none; font-weight: bold;">
        View Details →
      </a>
    </p>
    ` : ''}
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="color: #666; font-size: 14px;">
      This notification is from <strong>${params.workspaceName}</strong> workspace on FounderHQ.
    </p>
  </div>
  
  <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
    <p>
      You're receiving this because you have email notifications enabled.
      <br>
      <a href="${Deno.env.get('SITE_URL') || 'https://app.founderhq.com'}/settings/notifications" style="color: #000;">
        Manage notification preferences
      </a>
    </p>
  </div>
</body>
</html>
`
}

function generateEmailText(params: {
  userName: string;
  title: string;
  message: string;
  actionUrl?: string;
}): string {
  return `
${params.title}

Hi ${params.userName},

${params.message}

${params.actionUrl ? `View details: ${params.actionUrl}` : ''}

---
You're receiving this because you have email notifications enabled on FounderHQ.
`
}

function generateDigestEmailHtml(params: {
  userName: string;
  notifications: any[];
  digestType: 'daily' | 'weekly';
}): string {
  const notificationItems = params.notifications.map(n => `
    <tr>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        <strong style="color: #000;">${n.title}</strong>
        <br>
        <span style="color: #666; font-size: 14px;">${n.message}</span>
        <br>
        <span style="color: #999; font-size: 12px;">${new Date(n.created_at).toLocaleString()}</span>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${params.digestType === 'daily' ? 'Daily' : 'Weekly'} Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">FounderHQ</h1>
    <p style="margin: 10px 0 0; opacity: 0.8;">${params.digestType === 'daily' ? 'Daily' : 'Weekly'} Digest</p>
  </div>
  
  <div style="padding: 30px 20px; background: #fff; border: 2px solid #000;">
    <p>Hi ${params.userName},</p>
    
    <p>Here's a summary of your ${params.notifications.length} unread notification${params.notifications.length === 1 ? '' : 's'}:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      ${notificationItems}
    </table>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${Deno.env.get('SITE_URL') || 'https://app.founderhq.com'}" style="display: inline-block; background: #000; color: #fff; padding: 12px 30px; text-decoration: none; font-weight: bold;">
        Open FounderHQ →
      </a>
    </p>
  </div>
  
  <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
    <p>
      <a href="${Deno.env.get('SITE_URL') || 'https://app.founderhq.com'}/settings/notifications" style="color: #000;">
        Manage notification preferences
      </a>
    </p>
  </div>
</body>
</html>
`
}

function generateDigestEmailText(params: {
  userName: string;
  notifications: any[];
  digestType: 'daily' | 'weekly';
}): string {
  const notificationItems = params.notifications.map(n => 
    `- ${n.title}\n  ${n.message}\n  ${new Date(n.created_at).toLocaleString()}\n`
  ).join('\n')

  return `
Your ${params.digestType === 'daily' ? 'Daily' : 'Weekly'} FounderHQ Digest

Hi ${params.userName},

Here's a summary of your ${params.notifications.length} unread notification${params.notifications.length === 1 ? '' : 's'}:

${notificationItems}

---
Open FounderHQ: ${Deno.env.get('SITE_URL') || 'https://app.founderhq.com'}
Manage preferences: ${Deno.env.get('SITE_URL') || 'https://app.founderhq.com'}/settings/notifications
`
}
