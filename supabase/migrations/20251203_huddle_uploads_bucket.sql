-- Huddle uploads bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'huddle-uploads',
    'huddle-uploads',
    false,
    20971520, -- 20MB
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS "Huddle uploads insert" ON storage.objects;
DROP POLICY IF EXISTS "Huddle uploads select" ON storage.objects;
DROP POLICY IF EXISTS "Huddle uploads delete" ON storage.objects;

-- Allow workspace members to upload to their workspace folder
CREATE POLICY "Huddle uploads insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'huddle-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT w.id::text
    FROM workspaces w
    INNER JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Allow workspace members to read files in their workspace folder
CREATE POLICY "Huddle uploads select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'huddle-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT w.id::text
    FROM workspaces w
    INNER JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Allow workspace members to delete their files
CREATE POLICY "Huddle uploads delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'huddle-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT w.id::text
    FROM workspaces w
    INNER JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);
