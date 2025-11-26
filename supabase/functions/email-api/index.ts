import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Route dispatcher
    // GET /?action=get_message&id=...
    // POST /?action=send_email
    const action = url.searchParams.get('action');
    
    // Initialize Supabase Client (Service Role for DB access)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'get_message') {
      const messageId = url.searchParams.get('id');
      if (!messageId) throw new Error('Missing message id');
      return await handleGetMessage(messageId, supabaseAdmin);
    }

    if (action === 'send_email' && req.method === 'POST') {
      const body = await req.json();
      return await handleSendEmail(body, supabaseAdmin);
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleGetMessage(messageId: string, supabase: any) {
  // 1. Get message metadata + account info
  const { data: message, error } = await supabase
    .from('email_messages')
    .select(`
      *,
      integrated_accounts (*)
    `)
    .eq('id', messageId)
    .single();

  if (error || !message) throw new Error('Message not found');

  const account = message.integrated_accounts;
  
  // 2. Get fresh token
  const accessToken = await refreshAccessToken(account, supabase);

  // 3. Fetch full content from provider
  let fullContent: any = {};

  if (account.provider === 'gmail') {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.provider_message_id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    fullContent = parseGmailBody(data);
  } 
  else if (account.provider === 'outlook') {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${message.provider_message_id}?$select=body,uniqueBody`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    fullContent = {
      html: data.body?.content || '',
      text: data.uniqueBody?.content || ''
    };
  }

  return new Response(JSON.stringify({ ...message, body: fullContent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleSendEmail(payload: any, supabase: any) {
  const { accountId, to, subject, htmlBody, replyToMessageId } = payload;
  
  // 1. Get account info
  const { data: account, error } = await supabase
    .from('integrated_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) throw new Error('Account not found');

  // 2. Get fresh token
  const accessToken = await refreshAccessToken(account, supabase);

  // 3. Send via provider
  if (account.provider === 'gmail') {
    // Construct MIME message
    // Note: This is a basic implementation. For attachments and complex structures, 
    // a proper MIME builder library is recommended.
    const toHeader = Array.isArray(to) ? to.join(', ') : to;
    const messageParts = [
      `To: ${toHeader}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      htmlBody
    ];
    
    const rawMessage = messageParts.join('\r\n');
    const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage })
    });
    
    if (!res.ok) {
        const err = await res.text();
        console.error('Gmail send error:', err);
        throw new Error(`Gmail send failed: ${res.statusText}`);
    }
    
    // Get the sent message ID from response
    const sentData = await res.json();
    
    // Store the sent email in our database immediately
    const toArray = Array.isArray(to) ? to : [to];
    await supabase.from('email_messages').insert({
      account_id: accountId,
      provider_message_id: sentData.id,
      thread_id: sentData.threadId,
      subject: subject,
      snippet: htmlBody.replace(/<[^>]*>/g, '').substring(0, 200),
      from_address: account.email_address,
      to_addresses: toArray,
      folder_id: 'SENT',
      received_at: new Date().toISOString(),
      is_read: true,
      has_attachments: false,
    });
    
    return new Response(JSON.stringify({ success: true, messageId: sentData.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } 
  else if (account.provider === 'outlook') {
    const recipients = (Array.isArray(to) ? to : [to]).map((email: string) => ({ 
      emailAddress: { address: email } 
    }));

    const message = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: htmlBody
        },
        toRecipients: recipients
      }
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('Outlook send error:', err);
        throw new Error(`Outlook send failed: ${res.statusText}`);
    }

    // Store the sent email in our database immediately
    // Note: Outlook sendMail doesn't return message ID, so we generate one
    const toArray = Array.isArray(to) ? to : [to];
    const messageId = `outlook-sent-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    await supabase.from('email_messages').insert({
      account_id: accountId,
      provider_message_id: messageId,
      subject: subject,
      snippet: htmlBody.replace(/<[^>]*>/g, '').substring(0, 200),
      from_address: account.email_address,
      to_addresses: toArray,
      folder_id: 'SENT',
      received_at: new Date().toISOString(),
      is_read: true,
      has_attachments: false,
    });

    return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  throw new Error('Provider not supported');
}

// --- Helpers ---

async function refreshAccessToken(account: any, supabase: any): Promise<string> {
  const expiresAt = new Date(account.token_expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return account.access_token;
  }

  let newTokens: any = {};
  if (account.provider === 'gmail') {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GMAIL_CLIENT_ID')!,
        client_secret: Deno.env.get('GMAIL_CLIENT_SECRET')!,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    newTokens = await res.json();
  } else if (account.provider === 'outlook') {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('OUTLOOK_CLIENT_ID')!,
        client_secret: Deno.env.get('OUTLOOK_CLIENT_SECRET')!,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    newTokens = await res.json();
  }

  if (newTokens.error || !newTokens.access_token) {
    throw new Error('Token refresh failed');
  }

  await supabase
    .from('integrated_accounts')
    .update({
      access_token: newTokens.access_token,
      token_expires_at: new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString(),
    })
    .eq('id', account.id);

  return newTokens.access_token;
}

function parseGmailBody(data: any) {
  let html = '';
  let text = '';

  const findParts = (parts: any[]) => {
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.parts) {
        findParts(part.parts);
      }
    }
  };

  if (data.payload?.parts) {
    findParts(data.payload.parts);
  } else if (data.payload?.body?.data) {
    // Single part message
    const content = atob(data.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    if (data.payload.mimeType === 'text/html') html = content;
    else text = content;
  }

  return { html, text };
}
