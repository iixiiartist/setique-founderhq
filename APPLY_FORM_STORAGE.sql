-- Create storage bucket for form assets (logos, images)
-- Run this in Supabase SQL Editor

-- Create the form-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-assets',
  'form-assets',
  true,  -- Public bucket so form logos are accessible
  2097152,  -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Authenticated users can upload form assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'form-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update form assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'form-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete form assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'form-assets');

-- Allow public read access (for displaying logos on forms)
CREATE POLICY "Public read access for form assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'form-assets');
