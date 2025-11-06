-- Quick fix: Add missing ai_requests_used column to subscriptions table
-- Run this in Supabase SQL Editor if the subscriptions table exists but is missing columns

-- Check if subscriptions table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        -- Add ai_requests_used column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'subscriptions' 
            AND column_name = 'ai_requests_used'
        ) THEN
            ALTER TABLE subscriptions ADD COLUMN ai_requests_used INTEGER DEFAULT 0 NOT NULL;
            COMMENT ON COLUMN subscriptions.ai_requests_used IS 'Number of AI requests used in current period';
            RAISE NOTICE 'Added ai_requests_used column';
        ELSE
            RAISE NOTICE 'ai_requests_used column already exists';
        END IF;

        -- Add ai_requests_limit column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'subscriptions' 
            AND column_name = 'ai_requests_limit'
        ) THEN
            ALTER TABLE subscriptions ADD COLUMN ai_requests_limit INTEGER DEFAULT 1000 NOT NULL;
            COMMENT ON COLUMN subscriptions.ai_requests_limit IS 'Maximum AI requests allowed per period';
            RAISE NOTICE 'Added ai_requests_limit column';
        ELSE
            RAISE NOTICE 'ai_requests_limit column already exists';
        END IF;
    ELSE
        RAISE NOTICE 'Subscriptions table does not exist - run full migration 005_add_subscription_schema.sql first';
    END IF;
END $$;
