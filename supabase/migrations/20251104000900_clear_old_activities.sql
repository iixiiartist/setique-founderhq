-- Clear old activity_log entries that can't resolve user names
-- This is needed because old entries were created before the foreign key was fixed
-- New activities will automatically have correct user information

-- Delete all existing activities (they'll be regenerated as users perform actions)
TRUNCATE TABLE activity_log;

-- Add comment
COMMENT ON TABLE activity_log IS 'Activity log cleared to fix user name resolution after foreign key update';

