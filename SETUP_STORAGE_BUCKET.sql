-- =====================================================
-- STORAGE BUCKET SETUP FOR GTM DOCS IMAGE UPLOADS
-- =====================================================
-- Run this script in Supabase SQL Editor (MUST run as service_role/admin)
-- Project: https://jffnzpdcmdalxqhkfymx.supabase.co
-- Date: November 13, 2025
-- =====================================================

-- Step 1: Create the storage bucket for workspace images
-- This stores all GTM document images uploaded via drag-drop
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'workspace-images',
    'workspace-images',
    true,  -- Public access for image URLs
    5242880,  -- 5MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Users can upload to their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their workspace images" ON storage.objects;

-- Step 3: Allow authenticated users to upload images to their workspace folders
-- Images are stored as: workspace-images/{workspaceId}/{docId}/{filename}
CREATE POLICY "Users can upload to their workspace"
ON storage.objects
FOR INSERT
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

-- Step 4: Allow public read access to all images
-- This enables image URLs to work in documents shared with others
CREATE POLICY "Images are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'workspace-images');

-- Step 5: Allow users to delete images from their workspace
CREATE POLICY "Users can delete their workspace images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'workspace-images'
    AND (storage.foldername(name))[1] IN (
        SELECT w.id::text 
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.user_id = auth.uid()
    )
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify bucket was created
SELECT 
    id,
    name,
    public,
    file_size_limit / 1024 / 1024 AS size_limit_mb,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'workspace-images';

-- Verify policies are active
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
AND (policyname LIKE '%workspace%' OR policyname LIKE '%publicly readable%')
ORDER BY policyname;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- File Organization:
--   workspace-images/{workspaceId}/{docId}/{timestamp}-{random}.{ext}
--   Example: workspace-images/abc123/doc456/1699891234567-x8k2p.jpg
--
-- File Size Limit: 5MB (enforced by bucket config)
-- 
-- Allowed Types:
--   - image/jpeg (.jpg, .jpeg)
--   - image/png (.png)
--   - image/webp (.webp)
--   - image/gif (.gif)
--
-- Security:
--   - Only workspace members can upload to their workspace folder
--   - Anyone can view images (public read for document sharing)
--   - Only workspace members can delete images from their workspace
--
-- Image Compression:
--   - Client-side compression to max 1920px width @ 85% quality
--   - Happens in imageUploadService.compressImage() before upload
--   - Reduces storage costs and improves load times
--
-- =====================================================
