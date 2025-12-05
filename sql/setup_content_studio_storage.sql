-- Content Studio Storage Bucket Setup
-- Note: Content Studio now uses the existing 'workspace-images' bucket
-- This file is kept for reference but no longer needs to be run
-- Images are stored under: workspace-images/{workspaceId}/{documentId}/{filename}

-- The following policies are already set up for the workspace-images bucket
-- from the 20251113_create_workspace_images_bucket.sql migration:
-- - Authenticated users can upload to their workspace folder
-- - Authenticated users can update their own uploads
-- - Authenticated users can delete their workspace assets
-- - Public read access for all images

-- If you need a dedicated bucket for Content Studio, uncomment below:

/*
-- Create the content-studio-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-studio-assets',
  'content-studio-assets',
  true,  -- public bucket for easy access
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for the content-studio-assets bucket

-- Allow authenticated users to upload to their workspace folder
CREATE POLICY "Users can upload to their workspace folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-studio-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces 
    WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id::text FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their workspace assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-studio-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces 
    WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id::text FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their workspace assets
CREATE POLICY "Users can delete their workspace assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-studio-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces 
    WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id::text FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow public read access (since bucket is public)
CREATE POLICY "Public read access for content-studio-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content-studio-assets');
*/
