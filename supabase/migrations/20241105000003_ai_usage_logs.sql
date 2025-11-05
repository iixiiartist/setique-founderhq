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
