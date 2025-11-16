-- Setup cron job for task reminders
-- Run this in Supabase SQL Editor after deploying the Edge Function

-- Enable pg_cron extension (requires Supabase Pro plan or higher)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule task reminder check to run every hour
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your actual values
SELECT cron.schedule(
    'check-task-reminders-hourly',
    '0 * * * *', -- Run at the start of every hour
    $$
    SELECT net.http_post(
        url := 'https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/check-task-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZm56cGRjbWRhbHhxaGtmeW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyODIxNjQsImV4cCI6MjA0ODg1ODE2NH0.8EuT8vQG5xQVxKJhPvNhLnL-_xY0B0-R3KcDPqL5Mes'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);

-- Verify the cron job is scheduled
SELECT * FROM cron.job ORDER BY jobname;

-- To manually trigger the function for testing:
/*
SELECT net.http_post(
    url := 'https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/check-task-reminders',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZm56cGRjbWRhbHhxaGtmeW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyODIxNjQsImV4cCI6MjA0ODg1ODE2NH0.8EuT8vQG5xQVxKJhPvNhLnL-_xY0B0-R3KcDPqL5Mes'
    ),
    body := '{}'::jsonb
);
*/

-- To view cron job execution history (if available):
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('check-task-reminders-hourly');

COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler for PostgreSQL';
