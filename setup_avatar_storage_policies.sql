-- Storage policies for workspace-images bucket
-- Run this in Supabase SQL Editor if avatar uploads are failing

-- First, check if the bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'workspace-images';

-- If the bucket doesn't exist, create it (requires service role or dashboard)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'workspace-images',
--   'workspace-images', 
--   true,
--   5242880, -- 5MB
--   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
-- );

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can upload to their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their workspace images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their workspace images" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to their workspace folder
CREATE POLICY "Users can upload to their workspace"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-images' AND
  (storage.foldername(name))[1] IN (
    SELECT w.id::text FROM workspaces w
    INNER JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Policy 2: Allow public read access to all images in the bucket
CREATE POLICY "Images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workspace-images');

-- Policy 3: Allow authenticated users to delete images in their workspace
CREATE POLICY "Users can delete their workspace images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  (storage.foldername(name))[1] IN (
    SELECT w.id::text FROM workspaces w
    INNER JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Policy 4: Allow authenticated users to update images in their workspace
CREATE POLICY "Users can update their workspace images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  (storage.foldername(name))[1] IN (
    SELECT w.id::text FROM workspaces w
    INNER JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
