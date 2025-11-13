-- =====================================================
-- STORAGE BUCKET SETUP FOR GTM DOCS IMAGE UPLOADS
-- =====================================================
-- Run this script in Supabase SQL Editor
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
AND policyname LIKE '%workspace%'
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
