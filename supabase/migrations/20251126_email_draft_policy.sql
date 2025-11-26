-- Migration: Add INSERT and DELETE policies for email drafts
-- Date: 2025-11-26
-- Purpose: Allow users to create, update, and delete email drafts

-- ============================================
-- 1. INSERT POLICY FOR DRAFTS
-- ============================================
-- Drop existing policy if it exists, then create
DROP POLICY IF EXISTS "Users can insert drafts for their linked accounts" ON email_messages;
CREATE POLICY "Users can insert drafts for their linked accounts"
    ON email_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM integrated_accounts
            WHERE integrated_accounts.id = email_messages.account_id
            AND integrated_accounts.user_id = auth.uid()
        )
    );

-- ============================================
-- 2. DELETE POLICY FOR DRAFTS
-- ============================================
-- Drop existing policy if it exists, then create
DROP POLICY IF EXISTS "Users can delete drafts from their linked accounts" ON email_messages;
CREATE POLICY "Users can delete drafts from their linked accounts"
    ON email_messages FOR DELETE
    USING (
        folder_id = 'DRAFT' AND
        EXISTS (
            SELECT 1 FROM integrated_accounts
            WHERE integrated_accounts.id = email_messages.account_id
            AND integrated_accounts.user_id = auth.uid()
        )
    );

-- ============================================
-- 3. ADD BODY COLUMN FOR DRAFT CONTENT (if not exists)
-- ============================================
DO $$
BEGIN
    -- Add body column to store full HTML content for drafts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_messages' AND column_name = 'body') THEN
        ALTER TABLE email_messages ADD COLUMN body JSONB DEFAULT '{}';
        COMMENT ON COLUMN email_messages.body IS 'Stores email body content. For drafts: {html: string, text: string}';
    END IF;
    
    -- Add is_draft column for clearer filtering
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_messages' AND column_name = 'is_draft') THEN
        ALTER TABLE email_messages ADD COLUMN is_draft BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ============================================
-- 4. INDEX FOR DRAFTS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_email_messages_drafts 
    ON email_messages(account_id, folder_id) 
    WHERE folder_id = 'DRAFT';

-- ============================================
-- 5. VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: Email draft policies and columns added';
END $$;
