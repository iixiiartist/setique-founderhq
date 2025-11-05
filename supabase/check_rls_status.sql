-- Check RLS status and all policies for notifications table
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'notifications';

-- Show all policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  roles,
  qual as "USING clause",
  with_check as "WITH CHECK clause"
FROM pg_policies 
WHERE tablename = 'notifications' 
ORDER BY cmd, policyname;
