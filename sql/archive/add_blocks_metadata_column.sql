-- Adds structured block metadata storage for GTM Docs.
-- Run this migration in the Supabase SQL editor (safe to re-run).

ALTER TABLE gtm_docs
ADD COLUMN IF NOT EXISTS blocks_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN gtm_docs.blocks_metadata IS 'Structured block metadata persisted for canvas nodes (TextBox, Signature, etc.)';
