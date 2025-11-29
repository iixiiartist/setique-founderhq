-- FIX: The INSERT policy has NULL check clause - need to recreate it properly
-- Run this in Supabase SQL Editor

-- Drop the broken INSERT policy
DROP POLICY IF EXISTS "Users can upload to their workspace" ON storage.objects;

-- Recreate the INSERT policy with proper WITH CHECK clause
CREATE POLICY "Users can upload to their workspace"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT w.id::text 
    FROM workspaces w
    INNER JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Verify the policy was created correctly (check that qual is not null for INSERT)
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname = 'Users can upload to their workspace';
