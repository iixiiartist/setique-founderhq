-- Email Integration Schema
-- Migration: 20251125_email_integration.sql
-- Purpose: Tables for Gmail/Outlook integration (Accounts, Messages, Labels)

-- ============================================================================
-- 1. INTEGRATED ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrated_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
    email_address TEXT NOT NULL,
    -- Tokens should be stored encrypted. For this migration we use TEXT,
    -- but in production ensure these are encrypted at the application level 
    -- or using pgsodium before insertion.
    access_token TEXT, 
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id, provider)
);

-- Indexes
CREATE INDEX idx_integrated_accounts_user ON integrated_accounts(user_id);
CREATE INDEX idx_integrated_accounts_workspace ON integrated_accounts(workspace_id);

-- RLS
ALTER TABLE integrated_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own linked accounts"
    ON integrated_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can link their own accounts"
    ON integrated_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linked accounts"
    ON integrated_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linked accounts"
    ON integrated_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 2. EMAIL MESSAGES TABLE (Metadata Cache)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES integrated_accounts(id) ON DELETE CASCADE,
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
    folder_id TEXT, -- Label ID for Gmail, Folder ID for Outlook
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, provider_message_id)
);

-- Indexes
CREATE INDEX idx_email_messages_account ON email_messages(account_id);
CREATE INDEX idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX idx_email_messages_received ON email_messages(received_at DESC);

-- RLS
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their linked accounts"
    ON email_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM integrated_accounts
            WHERE integrated_accounts.id = email_messages.account_id
            AND integrated_accounts.user_id = auth.uid()
        )
    );

-- Service role handles sync inserts/updates, but users might mark as read
CREATE POLICY "Users can update messages from their linked accounts"
    ON email_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM integrated_accounts
            WHERE integrated_accounts.id = email_messages.account_id
            AND integrated_accounts.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 3. EMAIL LABELS/FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES integrated_accounts(id) ON DELETE CASCADE,
    provider_label_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT, -- 'system' or 'user'
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, provider_label_id)
);

-- Indexes
CREATE INDEX idx_email_labels_account ON email_labels(account_id);

-- RLS
ALTER TABLE email_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view labels from their linked accounts"
    ON email_labels FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM integrated_accounts
            WHERE integrated_accounts.id = email_labels.account_id
            AND integrated_accounts.user_id = auth.uid()
        )
    );
