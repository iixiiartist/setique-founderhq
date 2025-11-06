-- Fix: Add missing columns to subscriptions table
-- Run this if you get "column does not exist" errors

-- Check if columns exist and add them if missing
DO $$ 
BEGIN
    -- Add ai_requests_reset_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'ai_requests_reset_at'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN ai_requests_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add used_seats if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'used_seats'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN used_seats INTEGER DEFAULT 1 NOT NULL CHECK (used_seats >= 0);
    END IF;

    -- Add storage_bytes_used if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'storage_bytes_used'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN storage_bytes_used BIGINT DEFAULT 0 NOT NULL;
    END IF;

    -- Add storage_bytes_limit if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'storage_bytes_limit'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN storage_bytes_limit BIGINT;
    END IF;

    -- Add file_count_used if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'file_count_used'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN file_count_used INTEGER DEFAULT 0 NOT NULL;
    END IF;

    -- Add file_count_limit if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'file_count_limit'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN file_count_limit INTEGER;
    END IF;
END $$;

-- Verify all columns exist now
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
