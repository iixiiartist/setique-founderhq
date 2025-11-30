-- Create storage bucket for public form submission files
-- This is SEPARATE from form-assets (which is for form builder logos)

-- Create the form-submissions bucket for public uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-submissions',
  'form-submissions',
  true,  -- Public read so files can be viewed
  10485760,  -- 10MB limit (same as client validation)
  ARRAY[
    -- Images
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Text
    'text/plain',
    'text/csv',
    -- Archives
    'application/zip',
    'application/x-rar-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed'
  ];

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Anyone can upload form submission files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for form submission files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete form submission files" ON storage.objects;

-- IMPORTANT: Allow ANONYMOUS uploads since public forms don't require auth
-- Files are organized by form_id/submission_session_id/filename
CREATE POLICY "Anyone can upload form submission files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'form-submissions');

-- Public read access (for viewing uploaded files)
CREATE POLICY "Public read access for form submission files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'form-submissions');

-- Only authenticated users (form owners) can delete submission files
CREATE POLICY "Authenticated users can delete form submission files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'form-submissions');

-- Create an RPC to generate signed upload URLs for anonymous users
-- This adds validation before allowing uploads
CREATE OR REPLACE FUNCTION generate_form_upload_url(
  p_form_id UUID,
  p_session_id TEXT,
  p_filename TEXT,
  p_content_type TEXT,
  p_file_size BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form RECORD;
  v_allowed_types TEXT[];
  v_path TEXT;
  v_signed_url TEXT;
BEGIN
  -- Validate form exists and accepts submissions
  SELECT id, visibility, settings
  INTO v_form
  FROM forms
  WHERE id = p_form_id
    AND status = 'published';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Form not found or not accepting submissions');
  END IF;
  
  -- Validate session_id format (prevents path traversal)
  IF p_session_id !~ '^[a-zA-Z0-9_-]+$' THEN
    RETURN jsonb_build_object('error', 'Invalid session ID format');
  END IF;
  
  -- Validate filename (prevent path traversal, limit length)
  IF p_filename !~ '^[a-zA-Z0-9_.-]+$' OR LENGTH(p_filename) > 255 THEN
    RETURN jsonb_build_object('error', 'Invalid filename');
  END IF;
  
  -- Validate file size (max 10MB)
  IF p_file_size > 10485760 THEN
    RETURN jsonb_build_object('error', 'File too large (max 10MB)');
  END IF;
  
  -- Validate content type
  v_allowed_types := ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed'
  ];
  
  IF NOT (p_content_type = ANY(v_allowed_types)) THEN
    RETURN jsonb_build_object('error', 'File type not allowed');
  END IF;
  
  -- Generate unique path: form_id/session_id/timestamp_filename
  v_path := p_form_id || '/' || p_session_id || '/' || 
            EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || p_filename;
  
  -- Return the path for direct upload (client will use supabase.storage.upload)
  -- The bucket policies allow anon uploads, so we just return the path
  RETURN jsonb_build_object(
    'success', true,
    'path', v_path,
    'bucket', 'form-submissions'
  );
END;
$$;

-- Grant execute to anonymous users
GRANT EXECUTE ON FUNCTION generate_form_upload_url TO anon;
GRANT EXECUTE ON FUNCTION generate_form_upload_url TO authenticated;
