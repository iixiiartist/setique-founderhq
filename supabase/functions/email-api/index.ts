import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/apiAuth.ts';

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

    if (action === 'get_attachment') {
      const messageId = url.searchParams.get('messageId');
      const attachmentId = url.searchParams.get('attachmentId');
      if (!messageId || !attachmentId) throw new Error('Missing messageId or attachmentId');
      return await handleGetAttachment(messageId, attachmentId, supabaseAdmin);
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
  let attachments: any[] = [];

  if (account.provider === 'gmail') {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.provider_message_id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    fullContent = parseGmailBody(data);
    attachments = parseGmailAttachments(data);
  } 
  else if (account.provider === 'outlook') {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${message.provider_message_id}?$select=body,uniqueBody,hasAttachments`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    fullContent = {
      html: data.body?.content || '',
      text: data.uniqueBody?.content || ''
    };
    
    // Fetch attachments list if message has attachments
    if (data.hasAttachments || message.has_attachments) {
      const attachRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${message.provider_message_id}/attachments`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const attachData = await attachRes.json();
      attachments = (attachData.value || []).map((att: any) => ({
        id: att.id,
        filename: att.name,
        mimeType: att.contentType,
        size: att.size,
      }));
    }
  }

  return new Response(JSON.stringify({ ...message, body: fullContent, attachments }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetAttachment(messageId: string, attachmentId: string, supabase: any) {
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

  // 3. Fetch attachment data from provider
  let attachmentData: { data: string; filename?: string; mimeType?: string } | null = null;

  if (account.provider === 'gmail') {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.provider_message_id}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!res.ok) throw new Error('Failed to fetch attachment');
    
    const data = await res.json();
    // Gmail returns base64url encoded data
    attachmentData = {
      data: data.data.replace(/-/g, '+').replace(/_/g, '/'),
    };
  } 
  else if (account.provider === 'outlook') {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${message.provider_message_id}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!res.ok) throw new Error('Failed to fetch attachment');
    
    const data = await res.json();
    attachmentData = {
      data: data.contentBytes,
      filename: data.name,
      mimeType: data.contentType,
    };
  }

  if (!attachmentData) throw new Error('Provider not supported');

  return new Response(JSON.stringify(attachmentData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleSendEmail(payload: any, supabase: any) {
  const { accountId, to, cc, subject, htmlBody, attachments = [], replyToMessageId } = payload;
  const toArray = (Array.isArray(to) ? to : [to]).filter((value) => Boolean(value));
  const ccArray = (Array.isArray(cc) ? cc : (cc ? [cc] : [])).filter((value) => Boolean(value));
  if (!toArray.length) throw new Error('At least one recipient is required');
  const normalizedAttachments = await normalizeAttachments(attachments);
  const textBody = stripHtml(htmlBody || '');
  
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
    const rawMessage = buildGmailMessage({
      to: toArray,
      cc: ccArray,
      subject,
      htmlBody: htmlBody || '',
      textBody,
      attachments: normalizedAttachments,
      from: account.email_address,
    });
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
    await supabase.from('email_messages').insert({
      account_id: accountId,
      provider_message_id: sentData.id,
      thread_id: sentData.threadId,
      subject: subject,
      snippet: textBody.substring(0, 200),
      from_address: account.email_address,
      to_addresses: toArray,
      cc_addresses: ccArray,
      folder_id: 'SENT',
      received_at: new Date().toISOString(),
      is_read: true,
      has_attachments: normalizedAttachments.length > 0,
    });
    
    return new Response(JSON.stringify({ success: true, messageId: sentData.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } 
  else if (account.provider === 'outlook') {
    const recipients = toArray.map((email: string) => ({ 
      emailAddress: { address: email } 
    }));
    const ccRecipients = ccArray.map((email: string) => ({
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

    if (ccRecipients.length) {
      message.message.ccRecipients = ccRecipients;
    }

    if (normalizedAttachments.length) {
      message.message.attachments = normalizedAttachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.name,
        contentType: att.type,
        contentBytes: att.base64,
      }));
    }

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
    const messageId = `outlook-sent-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    await supabase.from('email_messages').insert({
      account_id: accountId,
      provider_message_id: messageId,
      subject: subject,
      snippet: textBody.substring(0, 200),
      from_address: account.email_address,
      to_addresses: toArray,
      cc_addresses: ccArray,
      folder_id: 'SENT',
      received_at: new Date().toISOString(),
      is_read: true,
      has_attachments: normalizedAttachments.length > 0,
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

type NormalizedAttachment = {
  name: string;
  type: string;
  base64: string;
};

async function normalizeAttachments(rawAttachments: any[] = []): Promise<NormalizedAttachment[]> {
  const normalized: NormalizedAttachment[] = [];
  for (const attachment of rawAttachments) {
    if (!attachment?.name) continue;
    let base64Content = attachment.data as string | undefined;
    if (base64Content) {
      // Remove potential data URI prefix and whitespace
      base64Content = base64Content.replace(/^data:[^,]+,/, '').replace(/\s+/g, '');
    }

    if (!base64Content && attachment.url) {
      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch attachment: ${attachment.name}`);
      }
      const buffer = await response.arrayBuffer();
      base64Content = arrayBufferToBase64(buffer);
    }

    if (!base64Content) continue;

    // Ensure the string is valid base64 by decoding/encoding once
    try {
      const binary = atob(base64Content);
      base64Content = btoa(binary);
    } catch (_err) {
      throw new Error(`Attachment data for ${attachment.name} is not valid base64`);
    }

    normalized.push({
      name: attachment.name,
      type: attachment.type || 'application/octet-stream',
      base64: base64Content,
    });
  }
  return normalized;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function chunkBase64(base64: string, length = 76): string {
  const chunks = [];
  for (let i = 0; i < base64.length; i += length) {
    chunks.push(base64.slice(i, i + length));
  }
  return chunks.join('\r\n');
}

function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function generateBoundary(prefix: string): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

function buildGmailMessage(params: {
  to: string[];
  cc: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  attachments: NormalizedAttachment[];
  from?: string;
}): string {
  const { to, cc, subject, htmlBody, textBody, attachments, from } = params;
  const headers: string[] = [];
  headers.push(`To: ${to.join(', ')}`);
  if (cc.length) {
    headers.push(`Cc: ${cc.join(', ')}`);
  }
  if (from) {
    headers.push(`From: ${from}`);
  }
  headers.push(`Date: ${new Date().toUTCString()}`);
  headers.push(`Subject: ${subject}`);
  headers.push('MIME-Version: 1.0');

  if (!attachments.length) {
    headers.push('Content-Type: text/html; charset="UTF-8"');
    headers.push('');
    headers.push(htmlBody);
    return headers.join('\r\n');
  }

  const mixedBoundary = generateBoundary('mixed');
  const altBoundary = generateBoundary('alt');

  headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  headers.push('');
  headers.push(`--${mixedBoundary}`);
  headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  headers.push('');
  headers.push(`--${altBoundary}`);
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push('Content-Transfer-Encoding: 7bit');
  headers.push('');
  headers.push(textBody);
  headers.push('');
  headers.push(`--${altBoundary}`);
  headers.push('Content-Type: text/html; charset="UTF-8"');
  headers.push('Content-Transfer-Encoding: 7bit');
  headers.push('');
  headers.push(htmlBody);
  headers.push('');
  headers.push(`--${altBoundary}--`);

  for (const attachment of attachments) {
    headers.push('');
    headers.push(`--${mixedBoundary}`);
    headers.push(`Content-Type: ${attachment.type}; name="${attachment.name}"`);
    headers.push('Content-Transfer-Encoding: base64');
    headers.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
    headers.push('');
    headers.push(chunkBase64(attachment.base64));
    headers.push('');
  }

  headers.push(`--${mixedBoundary}--`);
  headers.push('');
  return headers.join('\r\n');
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

function parseGmailAttachments(data: any): any[] {
  const attachments: any[] = [];

  const findAttachments = (parts: any[]) => {
    for (const part of parts) {
      // Check if this part is an attachment
      if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
        });
      }
      // Recursively check nested parts
      if (part.parts) {
        findAttachments(part.parts);
      }
    }
  };

  if (data.payload?.parts) {
    findAttachments(data.payload.parts);
  }

  return attachments;
}
