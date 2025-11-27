-- Enable the pg_cron extension if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the email sync function to run every 10 minutes
-- Note: You need to replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- because current_setting('app.settings.service_role_key') might not be available in all contexts
-- or you can use the vault if configured.
-- For now, we will assume the user runs this in the SQL editor where they can paste the key.

-- However, a better way for Edge Functions is to just let the function run on a schedule via config.toml
-- But since we are in production/remote, pg_cron is the standard way.

select
  cron.schedule(
    'email-sync-every-10-minutes',
    '*/10 * * * *',
    $$
    select
      net.http_post(
          url:='https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/email-sync',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || 'YOUR_SERVICE_ROLE_KEY_HERE' || '"}'::jsonb
      ) as request_id;
    $$
  );
