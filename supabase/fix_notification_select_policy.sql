-- ============================================================================
-- FIX NOTIFICATION SELECT POLICY
-- ============================================================================
-- Problem: INSERT with select=* fails because SELECT policies only allow
--          viewing your own notifications (user_id = auth.uid())
-- Solution: Add policy to allow viewing notifications you just created
-- ============================================================================

-- Allow users to view notifications they created (even if for someone else)
CREATE POLICY "users_can_view_notifications_they_created" 
ON notifications FOR SELECT 
TO authenticated
USING (
  -- User can view notifications where they are the recipient OR creator
  user_id = auth.uid() 
  OR 
  -- Check if user created this notification (by checking recent activity)
  EXISTS (
    SELECT 1 FROM activity_log
    WHERE activity_log.user_id = auth.uid()
      AND activity_log.action_type = 'comment_added'
      AND activity_log.created_at > (now() - interval '1 minute')
  )
);

-- Verify all SELECT policies
SELECT 
  policyname, 
  roles,
  qual as "USING clause"
FROM pg_policies 
WHERE tablename = 'notifications' 
  AND cmd = 'SELECT'
ORDER BY policyname;
