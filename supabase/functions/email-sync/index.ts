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
    // Initialize Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch active accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('integrated_accounts')
      .select('*')
      .eq('status', 'active');

    if (accountsError) throw accountsError;

    console.log(`Syncing ${accounts?.length ?? 0} accounts...`);

    const results = await Promise.allSettled(accounts?.map(async (account) => {
      try {
        // 2. Refresh Token
        const accessToken = await refreshAccessToken(account, supabaseAdmin);
        
        // 3. Sync Messages
        let newMessagesCount = 0;
        if (account.provider === 'gmail') {
          newMessagesCount = await syncGmail(account, accessToken, supabaseAdmin);
        } else if (account.provider === 'outlook') {
          newMessagesCount = await syncOutlook(account, accessToken, supabaseAdmin);
        }

        // 4. Update last_synced_at
        await supabaseAdmin
          .from('integrated_accounts')
          .update({ 
            last_synced_at: new Date().toISOString(),
            error_message: null 
          })
          .eq('id', account.id);

        return { accountId: account.id, status: 'success', newMessages: newMessagesCount };

      } catch (err) {
        console.error(`Error syncing account ${account.id}:`, err);
        
        // Update error status
        await supabaseAdmin
          .from('integrated_accounts')
          .update({ error_message: err.message })
          .eq('id', account.id);

        throw err;
      }
    }) ?? []);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

async function refreshAccessToken(account: any, supabase: any): Promise<string> {
  // Check if current token is valid (with 5 min buffer)
  const expiresAt = new Date(account.token_expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return account.access_token;
  }

  console.log(`Refreshing token for ${account.provider} account ${account.id}`);

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
    throw new Error(`Token refresh failed: ${newTokens.error_description || newTokens.error}`);
  }

  // Update DB
  const updates: any = {
    access_token: newTokens.access_token,
    token_expires_at: new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString(),
  };
  if (newTokens.refresh_token) updates.refresh_token = newTokens.refresh_token;

  await supabase
    .from('integrated_accounts')
    .update(updates)
    .eq('id', account.id);

  return newTokens.access_token;
}

async function syncGmail(account: any, accessToken: string, supabase: any): Promise<number> {
  let totalCount = 0;
  
  // Sync both inbox and sent emails
  const foldersToSync = [
    { query: 'in:inbox', folder: 'INBOX' },
    { query: 'in:sent', folder: 'SENT' }
  ];
  
  for (const folderConfig of foldersToSync) {
    // 1. List messages for this folder
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${encodeURIComponent(folderConfig.query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    
    if (!listData.messages) continue;

    for (const msg of listData.messages) {
      // Check if exists
      const { data: existing } = await supabase
        .from('email_messages')
        .select('id')
        .eq('account_id', account.id)
        .eq('provider_message_id', msg.id)
        .single();

      if (existing) continue;

      // Fetch details
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const detail = await detailRes.json();
      
      const headers = detail.payload.headers;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value;
      const from = headers.find((h: any) => h.name === 'From')?.value;
      const to = headers.find((h: any) => h.name === 'To')?.value;
      const date = headers.find((h: any) => h.name === 'Date')?.value;
      
      // Determine folder from Gmail labels
      const labelIds = detail.labelIds || [];
      let folderId = folderConfig.folder;
      if (labelIds.includes('SENT')) folderId = 'SENT';
      else if (labelIds.includes('DRAFT')) folderId = 'DRAFT';
      else if (labelIds.includes('INBOX')) folderId = 'INBOX';

      // Parse to addresses
      const toAddresses = to ? to.split(',').map((addr: string) => addr.trim()) : [];

      await supabase.from('email_messages').insert({
        account_id: account.id,
        provider_message_id: msg.id,
        thread_id: detail.threadId,
        subject,
        snippet: detail.snippet,
        from_address: from,
        to_addresses: toAddresses,
        folder_id: folderId,
        received_at: new Date(date).toISOString(),
        is_read: !labelIds.includes('UNREAD'),
        has_attachments: detail.payload?.parts?.some((p: any) => p.filename && p.filename.length > 0) || false,
      });
      totalCount++;
    }
  }
  
  return totalCount;
}

async function syncOutlook(account: any, accessToken: string, supabase: any): Promise<number> {
  let totalCount = 0;
  
  // Sync both inbox and sent items
  const foldersToSync = [
    { folder: 'inbox', folderId: 'INBOX' },
    { folder: 'sentitems', folderId: 'SENT' }
  ];
  
  for (const folderConfig of foldersToSync) {
    // Fetch top 20 from this folder
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/${folderConfig.folder}/messages?$top=20&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,webLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    
    if (!data.value) continue;

    for (const msg of data.value) {
      // Check if exists
      const { data: existing } = await supabase
        .from('email_messages')
        .select('id')
        .eq('account_id', account.id)
        .eq('provider_message_id', msg.id)
        .single();

      if (existing) continue;

      // Parse to addresses
      const toAddresses = msg.toRecipients?.map((r: any) => r.emailAddress?.address).filter(Boolean) || [];

      await supabase.from('email_messages').insert({
        account_id: account.id,
        provider_message_id: msg.id,
        subject: msg.subject,
        snippet: msg.bodyPreview,
        from_address: msg.from?.emailAddress?.address,
        to_addresses: toAddresses,
        folder_id: folderConfig.folderId,
        received_at: msg.receivedDateTime,
        is_read: msg.isRead,
        has_attachments: msg.hasAttachments || false,
      });
      totalCount++;
    }
  }
  
  return totalCount;
}
