# Manual Migration Instructions - AI Usage Logs

Since there are migration conflicts with old migrations, apply this SQL directly to your Supabase database via the SQL Editor in the Supabase dashboard.

## SQL to Execute

```sql
-- Create AI usage logs table for admin analytics (admin-only feature)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_workspace ON public.ai_usage_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_timestamp ON public.ai_usage_logs(timestamp DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "System can insert AI usage logs" ON public.ai_usage_logs;

-- Only admins can view AI usage logs (proprietary feature)
CREATE POLICY "Admins can view AI usage logs"
    ON public.ai_usage_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Allow the system to insert AI usage logs
CREATE POLICY "System can insert AI usage logs"
    ON public.ai_usage_logs
    FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE public.ai_usage_logs IS 'Admin-only analytics table for tracking AI API usage and costs per user';
```

## Steps

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL above
4. Click **Run** to execute
5. Verify the table was created successfully

## Verification

Run this query to verify the table exists:

```sql
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_usage_logs' 
ORDER BY ordinal_position;
```

Expected result:
- id (uuid)
- workspace_id (uuid)
- user_id (uuid)
- timestamp (timestamp with time zone)
- created_at (timestamp with time zone)

## Testing

To test that RLS is working correctly:

```sql
-- This should return 0 for non-admin users
SELECT COUNT(*) FROM ai_usage_logs;

-- This should work (system can insert)
INSERT INTO ai_usage_logs (workspace_id, user_id) 
VALUES (
    (SELECT id FROM workspaces LIMIT 1),
    auth.uid()
);
```

## Note

The migration file `supabase/migrations/20241105000003_ai_usage_logs.sql` contains the same SQL for future reference, but due to conflicts with historical migrations, it's safer to apply manually for now.
