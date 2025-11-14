-- Create workspace-images storage bucket for GTM Docs
-- This migration creates the bucket and configures RLS policies

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'workspace-images',
    'workspace-images',
    true,
    5242880, -- 5MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing policies if they exist (for clean migrations)
DROP POLICY IF EXISTS "Users can upload to their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their workspace images" ON storage.objects;

-- Step 3: Create policy for authenticated users to upload images to their workspace folders
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

-- Step 4: Create policy for public read access to all images
CREATE POLICY "Images are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'workspace-images');

-- Step 5: Create policy for users to delete images from their workspace
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
