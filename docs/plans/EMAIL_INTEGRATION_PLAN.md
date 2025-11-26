# Email Integration Implementation Plan (Gmail & Outlook)

This plan outlines the steps to integrate Gmail and Outlook into FounderHQ, enabling email sync, AI-assisted drafting, and automation triggers.

## 1. Architecture Overview

The integration will leverage the existing Supabase + React architecture.
- **Auth**: OAuth 2.0 with offline access to obtain Refresh Tokens. Tokens are stored encrypted in Supabase.
- **Sync**: Supabase Edge Functions (scheduled) to fetch recent emails and update the database.
- **Storage**: New tables for accounts, messages, and labels.
- **AI**: Groq-powered drafting via existing `groq-chat` function patterns.
- **Automation**: Extensions to `automationService.ts` to trigger actions on email events.

## 2. Database Schema

We need to store linked accounts and cached email metadata.

### 2.1 New Tables

```sql
-- Linked Email Accounts
CREATE TABLE integrated_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    user_id UUID REFERENCES auth.users(id),
    provider TEXT CHECK (provider IN ('gmail', 'outlook')),
    email_address TEXT NOT NULL,
    access_token TEXT, -- Encrypted via Vault or pgsodium
    refresh_token TEXT, -- Encrypted via Vault or pgsodium
    token_expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id, provider)
);

-- Email Messages (Metadata Cache)
CREATE TABLE email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES integrated_accounts(id),
    provider_message_id TEXT NOT NULL,
    thread_id TEXT,
    subject TEXT,
    snippet TEXT,
    from_address TEXT,
    to_addresses TEXT[],
    cc_addresses TEXT[],
    received_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false,
    has_attachments BOOLEAN DEFAULT false,
    folder_id TEXT, -- Label ID for Gmail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, provider_message_id)
);

-- Email Labels/Folders
CREATE TABLE email_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES integrated_accounts(id),
    provider_label_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT, -- 'system' or 'user'
    UNIQUE(account_id, provider_label_id)
);
```

### 2.2 Security (RLS)
- **integrated_accounts**: Users can only see their own accounts.
- **email_messages**: Users can only see messages from their linked accounts.

## 3. Authentication & Account Linking

We will implement a "Link Account" flow separate from the main app login to allow specific scopes (Gmail Read/Send, Outlook Mail.ReadWrite).

### 3.1 OAuth Flow
1.  **Frontend**: "Connect Gmail" button redirects to Supabase Edge Function `auth-integration`.
2.  **Edge Function**: Redirects to Google/Microsoft OAuth consent screen with `access_type=offline`.
3.  **Callback**: Provider redirects back to Edge Function.
4.  **Token Exchange**: Edge Function exchanges code for Access + Refresh Token.
5.  **Storage**: Tokens are encrypted and stored in `integrated_accounts`.

## 4. Edge Functions

### 4.1 `integration-auth`
Handles the OAuth dance.
- `GET /authorize?provider=gmail`: Redirects to Google.
- `GET /callback?provider=gmail&code=...`: Exchanges code, stores token, redirects to app.

### 4.2 `email-sync` (Scheduled)
Runs every X minutes (or triggered via webhook if using Pub/Sub).
- Iterates through active `integrated_accounts`.
- Refreshes access token if needed.
- Calls Gmail/Graph API to fetch messages since `last_synced_at`.
- Upserts into `email_messages`.
- Triggers Automation Engine if new emails match rules.

### 4.3 `email-send`
- Accepts `account_id`, `to`, `subject`, `body`.
- Refreshes token.
- Calls Provider API to send.
- Saves copy to `email_messages`.

## 5. Frontend Implementation

### 5.1 Settings UI
- Add "Integrations" tab to Workspace Settings.
- List linked accounts with status.
- "Connect" / "Disconnect" buttons.

### 5.2 Email Client UI
- **Inbox View**: Virtualized list of `email_messages`.
- **Thread View**: Detail view fetching full body content (on-demand from provider or cached if small).
- **Composer**:
    - Rich text editor.
    - **AI Assistant**: "Draft with AI" button calling `groq-chat` with context.

## 6. Automation Integration

Extend `automationService.ts`:

### 6.1 New Triggers
- `email_received`: Triggered when `email-sync` inserts new rows.
    - Conditions: `from_address`, `subject_contains`, `has_attachment`.

### 6.2 New Actions
- `send_email`: Uses `email-send` edge function.
- `create_draft`: Creates a draft in the provider via API.
- `summarize_thread`: Uses Groq to summarize and save to a Note/Task.

## 7. Implementation Steps

### Phase 1: Foundation
1.  Create database migrations for new tables.
2.  Set up RLS policies.
3.  Configure Google/Microsoft Cloud Projects (Client ID/Secret).

### Phase 2: Auth & Sync
1.  Develop `integration-auth` edge function.
2.  Develop `email-sync` edge function (basic list fetch).
3.  Implement "Connect" UI in Settings.

### Phase 3: Read & View
1.  Implement `email_messages` list UI.
2.  Implement email detail view (fetch body on demand).

### Phase 4: Write & AI
1.  Implement `email-send` edge function.
2.  Add Composer UI.
3.  Integrate Groq for "Draft Reply".

### Phase 5: Automation
1.  Update `automationService.ts` types.
2.  Wire up `email-sync` to trigger automation evaluation.
