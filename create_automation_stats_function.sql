-- Create function to get automation statistics
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_automation_stats(workspace_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_executions', COUNT(*),
    'success_rate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE result = 'success')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE 0
      END,
    'failed_last_24h', 
      COUNT(*) FILTER (
        WHERE result = 'failed' 
        AND triggered_at >= NOW() - INTERVAL '24 hours'
      ),
    'avg_execution_time', 
      COALESCE(ROUND(AVG(execution_time_ms)::NUMERIC, 2), 0)
  ) INTO result
  FROM automation_logs
  WHERE workspace_id = workspace_id_param
    AND triggered_at >= NOW() - INTERVAL '30 days';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_automation_stats(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_automation_stats(UUID) IS 'Calculate automation statistics for the last 30 days';
