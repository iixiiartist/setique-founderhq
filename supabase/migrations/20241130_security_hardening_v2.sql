-- ============================================================================
-- SECURITY HARDENING V2
-- Addresses: storage RLS, captcha enforcement, field validation, rate limiting
-- ============================================================================

-- ============================================================================
-- PART 1: SECURE FILE UPLOADS WITH TOKEN-BASED AUTHORIZATION
-- ============================================================================

-- Create table to track authorized upload tokens
CREATE TABLE IF NOT EXISTS form_upload_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,  -- The exact path that's authorized
  content_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,  -- Set when upload completes
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes'
);

-- Index for cleanup and validation
CREATE INDEX IF NOT EXISTS idx_upload_tokens_path ON form_upload_tokens(file_path);
CREATE INDEX IF NOT EXISTS idx_upload_tokens_expires ON form_upload_tokens(expires_at) WHERE used_at IS NULL;

-- Make bucket PRIVATE (not public read)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'form-submissions';

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Anyone can upload form submission files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for form submission files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete form submission files" ON storage.objects;

-- NEW POLICY: Only allow uploads that have a valid, unused token
CREATE POLICY "Token-authorized uploads only"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'form-submissions'
  AND EXISTS (
    SELECT 1 FROM form_upload_tokens t
    WHERE t.file_path = name
      AND t.used_at IS NULL
      AND t.expires_at > NOW()
  )
);

-- NEW POLICY: Only form workspace members can read submission files
CREATE POLICY "Workspace members can read submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-submissions'
  AND EXISTS (
    SELECT 1 FROM forms f
    JOIN workspace_members wm ON wm.workspace_id = f.workspace_id
    WHERE f.id = (string_to_array(name, '/'))[1]::UUID
      AND wm.user_id = auth.uid()
  )
);

-- NEW POLICY: Only form workspace owners can delete
CREATE POLICY "Workspace owners can delete submission files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-submissions'
  AND EXISTS (
    SELECT 1 FROM forms f
    JOIN workspace_members wm ON wm.workspace_id = f.workspace_id
    WHERE f.id = (string_to_array(name, '/'))[1]::UUID
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
  )
);

-- Update the upload URL function to create tokens
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
  v_token_id UUID;
BEGIN
  -- Validate form exists and accepts submissions
  SELECT id, workspace_id, visibility, settings, status
  INTO v_form
  FROM forms
  WHERE id = p_form_id
    AND status = 'published';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Form not found or not accepting submissions');
  END IF;
  
  -- Validate session_id format (prevents path traversal)
  IF p_session_id !~ '^[a-zA-Z0-9_-]+$' OR LENGTH(p_session_id) > 64 THEN
    RETURN jsonb_build_object('error', 'Invalid session ID format');
  END IF;
  
  -- Validate filename (prevent path traversal, limit length)
  IF p_filename !~ '^[a-zA-Z0-9_.-]+$' OR LENGTH(p_filename) > 255 THEN
    RETURN jsonb_build_object('error', 'Invalid filename');
  END IF;
  
  -- Validate file size (max 10MB)
  IF p_file_size > 10485760 OR p_file_size <= 0 THEN
    RETURN jsonb_build_object('error', 'Invalid file size (max 10MB)');
  END IF;
  
  -- Validate content type against allowlist
  v_allowed_types := ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];
  
  IF NOT (p_content_type = ANY(v_allowed_types)) THEN
    RETURN jsonb_build_object('error', 'File type not allowed: ' || p_content_type);
  END IF;
  
  -- Rate limit: max 10 upload tokens per session per form per hour
  IF (
    SELECT COUNT(*) FROM form_upload_tokens
    WHERE form_id = p_form_id
      AND session_id = p_session_id
      AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 10 THEN
    RETURN jsonb_build_object('error', 'Too many upload requests');
  END IF;
  
  -- Generate unique path with timestamp to prevent collisions
  v_path := p_form_id || '/' || p_session_id || '/' || 
            EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
            encode(gen_random_bytes(4), 'hex') || '_' || p_filename;
  
  -- Create upload token
  INSERT INTO form_upload_tokens (form_id, session_id, file_path, content_type, file_size)
  VALUES (p_form_id, p_session_id, v_path, p_content_type, p_file_size)
  RETURNING id INTO v_token_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'path', v_path,
    'bucket', 'form-submissions',
    'token_id', v_token_id,
    'expires_in', 900  -- 15 minutes
  );
END;
$$;

-- Function to mark token as used (called after successful upload)
CREATE OR REPLACE FUNCTION mark_upload_token_used(p_file_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE form_upload_tokens
  SET used_at = NOW()
  WHERE file_path = p_file_path
    AND used_at IS NULL
    AND expires_at > NOW();
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_form_upload_url TO anon;
GRANT EXECUTE ON FUNCTION generate_form_upload_url TO authenticated;
GRANT EXECUTE ON FUNCTION mark_upload_token_used TO anon;
GRANT EXECUTE ON FUNCTION mark_upload_token_used TO authenticated;

-- ============================================================================
-- PART 2: ENFORCE CAPTCHA AND FIELD VALIDATION IN RPC
-- ============================================================================

-- Drop the old RPC to replace with secured version
DROP FUNCTION IF EXISTS public.secure_submit_form(UUID, JSONB, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.secure_submit_form(
  p_form_id UUID,
  p_data JSONB,
  p_password TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form RECORD;
  v_field RECORD;
  v_workspace_id UUID;
  v_submission_id UUID;
  v_recent_submissions INTEGER;
  v_ip_hash TEXT;
  v_captcha_verified BOOLEAN;
  v_captcha_required BOOLEAN;
  v_utm_source TEXT;
  v_utm_medium TEXT;
  v_utm_campaign TEXT;
  v_utm_term TEXT;
  v_utm_content TEXT;
  v_user_agent TEXT;
  v_referrer TEXT;
  v_completion_time INTEGER;
  v_contact_id UUID;
  v_deal_id UUID;
  v_campaign_id UUID;
  v_account_id UUID;
  v_source_url TEXT;
  v_field_value JSONB;
  v_field_text TEXT;
  v_validation_errors JSONB := '[]'::JSONB;
  v_visible_field_ids UUID[];
  v_submitted_field_ids TEXT[];
BEGIN
  -- ============== EXTRACT METADATA ==============
  v_ip_hash := p_metadata->>'ipHash';
  v_captcha_verified := COALESCE((p_metadata->>'captchaVerified')::BOOLEAN, false);
  v_utm_source := p_metadata->'utmParams'->>'utm_source';
  v_utm_medium := p_metadata->'utmParams'->>'utm_medium';
  v_utm_campaign := p_metadata->'utmParams'->>'utm_campaign';
  v_utm_term := p_metadata->'utmParams'->>'utm_term';
  v_utm_content := p_metadata->'utmParams'->>'utm_content';
  v_user_agent := p_metadata->>'userAgent';
  v_referrer := p_metadata->>'referrer';
  v_completion_time := (p_metadata->>'completionTime')::INTEGER;
  v_source_url := p_metadata->>'sourceUrl';
  
  -- CRM linkage
  BEGIN v_contact_id := (p_metadata->>'contactId')::UUID;
  EXCEPTION WHEN OTHERS THEN v_contact_id := NULL; END;
  BEGIN v_deal_id := (p_metadata->>'dealId')::UUID;
  EXCEPTION WHEN OTHERS THEN v_deal_id := NULL; END;
  BEGIN v_campaign_id := (p_metadata->>'campaignId')::UUID;
  EXCEPTION WHEN OTHERS THEN v_campaign_id := NULL; END;
  BEGIN v_account_id := (p_metadata->>'accountId')::UUID;
  EXCEPTION WHEN OTHERS THEN v_account_id := NULL; END;

  -- ============== GET FORM WITH LOCK ==============
  SELECT 
    f.id,
    f.workspace_id,
    f.status,
    f.visibility,
    f.access_password,
    f.expires_at,
    f.response_limit,
    f.total_submissions,
    f.default_campaign_id,
    f.auto_create_contact,
    f.settings,
    (f.settings->>'closeAfterDate')::TIMESTAMPTZ as close_after_date,
    (f.settings->>'closeAfterResponses')::INTEGER as close_after_responses,
    f.settings->>'closedMessage' as closed_message,
    f.settings->>'limitMessage' as limit_message,
    COALESCE((f.settings->>'captchaEnabled')::BOOLEAN, false) as captcha_enabled,
    f.settings->>'captchaType' as captcha_type
  INTO v_form
  FROM forms f
  WHERE f.id = p_form_id
  FOR UPDATE;

  IF v_form.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'form_not_found', 'message', 'Form not found');
  END IF;

  v_workspace_id := v_form.workspace_id;
  IF v_campaign_id IS NULL THEN v_campaign_id := v_form.default_campaign_id; END IF;

  -- ============== FORM STATUS CHECKS ==============
  IF v_form.status != 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'form_not_published', 'message', 'This form is not currently accepting responses');
  END IF;

  IF v_form.expires_at IS NOT NULL AND v_form.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'form_expired', 'message', COALESCE(v_form.closed_message, 'This form has expired'));
  END IF;

  IF v_form.close_after_date IS NOT NULL AND v_form.close_after_date < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'form_expired', 'message', COALESCE(v_form.closed_message, 'This form has expired'));
  END IF;

  -- ============== PASSWORD CHECK ==============
  IF v_form.visibility = 'password_protected' AND v_form.access_password IS NOT NULL THEN
    IF p_password IS NULL OR p_password != v_form.access_password THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_password', 'message', 'Invalid password');
    END IF;
  END IF;

  -- ============== RESPONSE LIMIT CHECK ==============
  IF v_form.response_limit IS NOT NULL AND v_form.total_submissions >= v_form.response_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit_reached', 'message', COALESCE(v_form.limit_message, 'Maximum responses reached'));
  END IF;

  IF v_form.close_after_responses IS NOT NULL AND v_form.total_submissions >= v_form.close_after_responses THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit_reached', 'message', COALESCE(v_form.limit_message, 'Maximum responses reached'));
  END IF;

  -- ============== CAPTCHA ENFORCEMENT ==============
  -- If form requires captcha and it wasn't verified by Edge Function, reject
  v_captcha_required := v_form.captcha_enabled AND v_form.captcha_type IS NOT NULL AND v_form.captcha_type != 'none';
  
  IF v_captcha_required AND NOT v_captcha_verified THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'captcha_required', 
      'message', 'Captcha verification required. Please complete the captcha.'
    );
  END IF;

  -- ============== RATE LIMITING ==============
  -- Session-based (always enforced)
  IF p_session_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_submissions
    FROM form_submissions fs
    WHERE fs.form_id = p_form_id
      AND fs.session_id = p_session_id
      AND fs.created_at > NOW() - INTERVAL '1 minute';

    IF v_recent_submissions >= 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited', 'message', 'Too many submissions. Please wait a minute.');
    END IF;
  ELSE
    -- No session ID provided - suspicious, apply stricter limit
    SELECT COUNT(*) INTO v_recent_submissions
    FROM form_submissions fs
    WHERE fs.form_id = p_form_id
      AND fs.created_at > NOW() - INTERVAL '1 minute';
    
    -- If many submissions without session, might be abuse
    IF v_recent_submissions >= 20 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited', 'message', 'Too many submissions. Please try again later.');
    END IF;
  END IF;

  -- IP-based (only if provided by Edge Function)
  IF v_ip_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_submissions
    FROM form_submissions fs
    WHERE fs.form_id = p_form_id
      AND fs.ip_hash = v_ip_hash
      AND fs.created_at > NOW() - INTERVAL '1 minute';

    IF v_recent_submissions >= 10 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited', 'message', 'Too many submissions from this location.');
    END IF;
  END IF;

  -- ============== FIELD VALIDATION ==============
  -- Get list of submitted field IDs
  SELECT array_agg(key) INTO v_submitted_field_ids FROM jsonb_each(p_data);
  
  -- Validate each form field
  FOR v_field IN 
    SELECT ff.id, ff.type, ff.label, ff.required, ff.validation, ff.conditional_logic
    FROM form_fields ff
    WHERE ff.form_id = p_form_id
    ORDER BY ff.sort_order
  LOOP
    -- Skip layout fields
    IF v_field.type IN ('heading', 'paragraph', 'divider', 'image') THEN
      CONTINUE;
    END IF;
    
    -- TODO: Evaluate conditional logic to determine visibility
    -- For now, assume all fields are visible (conditional logic is complex)
    
    v_field_value := p_data->v_field.id::TEXT;
    v_field_text := p_data->>v_field.id::TEXT;
    
    -- Check required fields
    IF v_field.required = true THEN
      IF v_field_value IS NULL OR v_field_text IS NULL OR v_field_text = '' THEN
        -- Check if it's an empty array for multi-select
        IF v_field_value IS NULL OR (jsonb_typeof(v_field_value) = 'array' AND jsonb_array_length(v_field_value) = 0) THEN
          v_validation_errors := v_validation_errors || jsonb_build_object(
            'field_id', v_field.id,
            'field_label', v_field.label,
            'error', 'This field is required'
          );
        END IF;
      END IF;
    END IF;
    
    -- Apply validation rules if value is present
    IF v_field_text IS NOT NULL AND v_field_text != '' AND v_field.validation IS NOT NULL THEN
      -- Min length
      IF (v_field.validation->>'minLength')::INTEGER IS NOT NULL THEN
        IF LENGTH(v_field_text) < (v_field.validation->>'minLength')::INTEGER THEN
          v_validation_errors := v_validation_errors || jsonb_build_object(
            'field_id', v_field.id,
            'field_label', v_field.label,
            'error', 'Minimum length is ' || (v_field.validation->>'minLength')
          );
        END IF;
      END IF;
      
      -- Max length
      IF (v_field.validation->>'maxLength')::INTEGER IS NOT NULL THEN
        IF LENGTH(v_field_text) > (v_field.validation->>'maxLength')::INTEGER THEN
          v_validation_errors := v_validation_errors || jsonb_build_object(
            'field_id', v_field.id,
            'field_label', v_field.label,
            'error', 'Maximum length is ' || (v_field.validation->>'maxLength')
          );
        END IF;
      END IF;
      
      -- Email validation for email fields
      IF v_field.type = 'email' THEN
        IF v_field_text !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
          v_validation_errors := v_validation_errors || jsonb_build_object(
            'field_id', v_field.id,
            'field_label', v_field.label,
            'error', 'Invalid email address'
          );
        END IF;
      END IF;
      
      -- Number range validation
      IF v_field.type = 'number' THEN
        BEGIN
          IF (v_field.validation->>'min')::NUMERIC IS NOT NULL AND v_field_text::NUMERIC < (v_field.validation->>'min')::NUMERIC THEN
            v_validation_errors := v_validation_errors || jsonb_build_object(
              'field_id', v_field.id,
              'field_label', v_field.label,
              'error', 'Minimum value is ' || (v_field.validation->>'min')
            );
          END IF;
          IF (v_field.validation->>'max')::NUMERIC IS NOT NULL AND v_field_text::NUMERIC > (v_field.validation->>'max')::NUMERIC THEN
            v_validation_errors := v_validation_errors || jsonb_build_object(
              'field_id', v_field.id,
              'field_label', v_field.label,
              'error', 'Maximum value is ' || (v_field.validation->>'max')
            );
          END IF;
        EXCEPTION WHEN OTHERS THEN
          v_validation_errors := v_validation_errors || jsonb_build_object(
            'field_id', v_field.id,
            'field_label', v_field.label,
            'error', 'Invalid number'
          );
        END;
      END IF;
    END IF;
  END LOOP;
  
  -- Return validation errors if any
  IF jsonb_array_length(v_validation_errors) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'validation_failed',
      'message', 'Please fix the errors below',
      'validation_errors', v_validation_errors
    );
  END IF;

  -- ============== CRM AUTO-LINKING ==============
  IF v_form.auto_create_contact = true AND v_contact_id IS NULL THEN
    BEGIN
      v_contact_id := create_or_find_contact_from_form(v_workspace_id, p_form_id, p_data, v_campaign_id);
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail submission if contact creation fails
      RAISE WARNING 'Contact auto-creation failed: %', SQLERRM;
    END;
  END IF;

  -- ============== INSERT SUBMISSION ==============
  INSERT INTO form_submissions (
    form_id, workspace_id, data, session_id, ip_hash,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    user_agent, referrer, completion_time_seconds,
    contact_id, deal_id, campaign_id, account_id,
    status, created_at, completed_at
  ) VALUES (
    p_form_id, v_workspace_id, p_data, p_session_id, v_ip_hash,
    v_utm_source, v_utm_medium, v_utm_campaign, v_utm_term, v_utm_content,
    v_user_agent, v_referrer, v_completion_time,
    v_contact_id, v_deal_id, v_campaign_id, v_account_id,
    'completed', NOW(), NOW()
  )
  RETURNING id INTO v_submission_id;

  -- Update submission count
  UPDATE forms SET total_submissions = total_submissions + 1 WHERE id = p_form_id;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'contact_id', v_contact_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'internal_error',
      'message', 'An error occurred while submitting the form',
      'detail', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.secure_submit_form(UUID, JSONB, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_submit_form(UUID, JSONB, TEXT, TEXT, JSONB) TO anon;

-- ============================================================================
-- PART 3: CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up expired/unused upload tokens and orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_uploads()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_token RECORD;
BEGIN
  -- Delete expired unused tokens
  DELETE FROM form_upload_tokens
  WHERE expires_at < NOW() AND used_at IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Note: Actual file cleanup would need to be done via Edge Function
  -- since we can't call storage.remove from SQL directly
  
  RETURN v_deleted_count;
END;
$$;

-- Schedule cleanup (run daily via cron or pg_cron if available)
-- SELECT cron.schedule('cleanup-upload-tokens', '0 3 * * *', 'SELECT cleanup_orphaned_uploads()');

COMMENT ON FUNCTION cleanup_orphaned_uploads IS 
'Cleans up expired upload tokens. Should be run periodically via cron or scheduled job.';

-- ============================================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_form_submissions_rate_limit 
ON form_submissions (form_id, session_id, created_at)
WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_submissions_ip_rate 
ON form_submissions (form_id, ip_hash, created_at)
WHERE ip_hash IS NOT NULL;

-- Index already exists as idx_form_fields_sort_order, skip duplicate
-- CREATE INDEX IF NOT EXISTS idx_form_fields_sort_order ON form_fields (form_id, sort_order);
