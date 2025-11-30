-- ============================================================================
-- Secure Form RPCs
-- Server-side validation for form access and submissions
-- ============================================================================

-- Drop old function signatures to avoid conflicts
DROP FUNCTION IF EXISTS public.secure_submit_form(UUID, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.secure_submit_form(UUID, JSONB, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.get_public_form(TEXT, TEXT);

-- First, add columns if they don't exist
DO $$
BEGIN
    -- Add session_id to form_submissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_submissions' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE form_submissions ADD COLUMN session_id TEXT;
    END IF;
    
    -- Add completion_time_seconds if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_submissions' AND column_name = 'completion_time_seconds'
    ) THEN
        ALTER TABLE form_submissions ADD COLUMN completion_time_seconds INTEGER;
    END IF;
    
    -- Add account_id if missing (for CRM linkage)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_submissions' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE form_submissions ADD COLUMN account_id UUID;
    END IF;
    
    -- Add ip_hash for rate limiting (hashed, not raw IP)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_submissions' AND column_name = 'ip_hash'
    ) THEN
        ALTER TABLE form_submissions ADD COLUMN ip_hash TEXT;
    END IF;
    
    -- Add visibility and access_password to forms if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forms' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE forms ADD COLUMN visibility TEXT DEFAULT 'public' 
            CHECK (visibility IN ('public', 'private', 'password_protected'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forms' AND column_name = 'access_password'
    ) THEN
        ALTER TABLE forms ADD COLUMN access_password TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forms' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE forms ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forms' AND column_name = 'response_limit'
    ) THEN
        ALTER TABLE forms ADD COLUMN response_limit INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forms' AND column_name = 'total_submissions'
    ) THEN
        ALTER TABLE forms ADD COLUMN total_submissions INTEGER DEFAULT 0;
    END IF;
    
    -- Add missing form_fields columns for full field metadata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_fields' AND column_name = 'help_text'
    ) THEN
        ALTER TABLE form_fields ADD COLUMN help_text TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_fields' AND column_name = 'default_value'
    ) THEN
        ALTER TABLE form_fields ADD COLUMN default_value TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_fields' AND column_name = 'alignment'
    ) THEN
        ALTER TABLE form_fields ADD COLUMN alignment TEXT DEFAULT 'left' 
            CHECK (alignment IN ('left', 'center', 'right'));
    END IF;
END $$;


-- ============================================================================
-- SECURE FORM FETCH RPC
-- Returns form data with fields, enforcing visibility/password/expiry
-- NEVER returns access_password to client
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_form(
  p_slug TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form RECORD;
  v_fields JSONB;
  v_result JSONB;
BEGIN
  -- Fetch form (without access_password)
  SELECT 
    f.id,
    f.workspace_id,
    f.title,
    f.description,
    f.type,
    f.status,
    f.theme,
    f.logo_url,
    f.cover_image_url,
    f.custom_css,
    f.settings,
    f.slug,
    f.is_public,
    f.visibility,
    f.access_password, -- only used for comparison, never returned
    f.expires_at,
    f.response_limit,
    f.total_submissions,
    f.default_campaign_id,
    f.default_crm_type,
    f.auto_create_contact,
    (f.settings->>'closeAfterDate')::TIMESTAMPTZ as close_after_date,
    (f.settings->>'closeAfterResponses')::INTEGER as close_after_responses,
    f.settings->>'closedMessage' as closed_message,
    f.settings->>'limitMessage' as limit_message,
    f.settings->>'thankYouMessage' as thank_you_message,
    f.settings->>'redirectUrl' as redirect_url
  INTO v_form
  FROM forms f
  WHERE f.slug = p_slug;

  -- Check if form exists
  IF v_form.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_not_found',
      'message', 'Form not found'
    );
  END IF;

  -- Check if form is published
  IF v_form.status != 'published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_not_published',
      'message', 'This form is not currently accepting responses'
    );
  END IF;

  -- Check visibility - private forms cannot be accessed
  IF v_form.visibility = 'private' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_private',
      'message', 'This form is private'
    );
  END IF;

  -- Check password protection BEFORE returning any form data
  IF v_form.visibility = 'password_protected' AND v_form.access_password IS NOT NULL THEN
    IF p_password IS NULL THEN
      -- Return ONLY minimal branding info for password screen - NO form content
      RETURN jsonb_build_object(
        'success', false,
        'error', 'password_required',
        'message', 'This form requires a password',
        'form', jsonb_build_object(
          'id', v_form.id,
          'title', v_form.title,
          'logo_url', v_form.logo_url,
          'theme', jsonb_build_object(
            'primaryColor', v_form.theme->>'primaryColor',
            'backgroundColor', v_form.theme->>'backgroundColor',
            'fontFamily', v_form.theme->>'fontFamily'
          )
        )
      );
    END IF;
    
    IF p_password != v_form.access_password THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'invalid_password',
        'message', 'Invalid password'
      );
    END IF;
  END IF;

  -- Check expiration
  IF v_form.expires_at IS NOT NULL AND v_form.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_expired',
      'message', COALESCE(v_form.closed_message, 'This form has expired')
    );
  END IF;

  IF v_form.close_after_date IS NOT NULL AND v_form.close_after_date < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_expired',
      'message', COALESCE(v_form.closed_message, 'This form has expired')
    );
  END IF;

  -- Check response limit
  IF v_form.response_limit IS NOT NULL AND v_form.total_submissions >= v_form.response_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_reached',
      'message', COALESCE(v_form.limit_message, 'Maximum responses reached')
    );
  END IF;

  IF v_form.close_after_responses IS NOT NULL AND v_form.total_submissions >= v_form.close_after_responses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_reached',
      'message', COALESCE(v_form.limit_message, 'Maximum responses reached')
    );
  END IF;

  -- Fetch form fields with ALL metadata needed by client
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ff.id,
      'form_id', ff.form_id,
      'type', ff.type,
      'label', ff.label,
      'description', ff.description,
      'placeholder', ff.placeholder,
      'help_text', ff.help_text,
      'required', ff.required,
      'validation', ff.validation,
      'options', ff.options,
      'conditional_logic', ff.conditional_logic,
      'page_number', ff.page_number,
      'sort_order', ff.sort_order,
      'width', ff.width,
      'alignment', COALESCE(ff.alignment, 'left'),
      'default_value', ff.default_value,
      'crm_field_mapping', ff.crm_field_mapping,
      'created_at', ff.created_at,
      'updated_at', ff.updated_at
    ) ORDER BY ff.page_number, ff.sort_order
  )
  INTO v_fields
  FROM form_fields ff
  WHERE ff.form_id = v_form.id;

  -- Build result WITHOUT access_password
  v_result := jsonb_build_object(
    'success', true,
    'form', jsonb_build_object(
      'id', v_form.id,
      'workspace_id', v_form.workspace_id,
      'title', v_form.title,
      'description', v_form.description,
      'type', v_form.type,
      'status', v_form.status,
      'theme', v_form.theme,
      'logo_url', v_form.logo_url,
      'cover_image_url', v_form.cover_image_url,
      'custom_css', v_form.custom_css,
      'settings', v_form.settings - 'password', -- strip password from settings too
      'slug', v_form.slug,
      'is_public', v_form.is_public,
      'visibility', v_form.visibility,
      'total_submissions', v_form.total_submissions,
      'default_campaign_id', v_form.default_campaign_id,
      'default_crm_type', v_form.default_crm_type,
      'auto_create_contact', v_form.auto_create_contact,
      'fields', COALESCE(v_fields, '[]'::jsonb)
    )
  );

  RETURN v_result;
END;
$$;


-- ============================================================================
-- SECURE FORM SUBMIT RPC
-- Handles submissions with full validation and metadata persistence
-- ============================================================================

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
  v_submission_id UUID;
  v_recent_submissions INTEGER;
  v_workspace_id UUID;
  v_ip_hash TEXT;
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
BEGIN
  -- Extract metadata
  v_ip_hash := p_metadata->>'ipHash';
  v_utm_source := p_metadata->'utmParams'->>'utm_source';
  v_utm_medium := p_metadata->'utmParams'->>'utm_medium';
  v_utm_campaign := p_metadata->'utmParams'->>'utm_campaign';
  v_utm_term := p_metadata->'utmParams'->>'utm_term';
  v_utm_content := p_metadata->'utmParams'->>'utm_content';
  v_user_agent := p_metadata->>'userAgent';
  v_referrer := p_metadata->>'referrer';
  v_completion_time := (p_metadata->>'completionTime')::INTEGER;
  v_source_url := p_metadata->>'sourceUrl';
  
  -- CRM linkage (UUIDs need explicit casting)
  BEGIN
    v_contact_id := (p_metadata->>'contactId')::UUID;
  EXCEPTION WHEN OTHERS THEN v_contact_id := NULL;
  END;
  BEGIN
    v_deal_id := (p_metadata->>'dealId')::UUID;
  EXCEPTION WHEN OTHERS THEN v_deal_id := NULL;
  END;
  BEGIN
    v_campaign_id := (p_metadata->>'campaignId')::UUID;
  EXCEPTION WHEN OTHERS THEN v_campaign_id := NULL;
  END;
  BEGIN
    v_account_id := (p_metadata->>'accountId')::UUID;
  EXCEPTION WHEN OTHERS THEN v_account_id := NULL;
  END;

  -- Lock the form row to prevent race conditions on response limit
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
    (f.settings->>'closeAfterDate')::TIMESTAMPTZ as close_after_date,
    (f.settings->>'closeAfterResponses')::INTEGER as close_after_responses,
    f.settings->>'closedMessage' as closed_message,
    f.settings->>'limitMessage' as limit_message
  INTO v_form
  FROM forms f
  WHERE f.id = p_form_id
  FOR UPDATE;

  -- Check if form exists
  IF v_form.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_not_found',
      'message', 'Form not found'
    );
  END IF;

  v_workspace_id := v_form.workspace_id;
  
  -- Use form's default campaign if not provided
  IF v_campaign_id IS NULL THEN
    v_campaign_id := v_form.default_campaign_id;
  END IF;

  -- Check if form is published
  IF v_form.status != 'published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_not_published',
      'message', 'This form is not currently accepting responses'
    );
  END IF;

  -- Check expiration
  IF v_form.expires_at IS NOT NULL AND v_form.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_expired',
      'message', COALESCE(v_form.closed_message, 'This form has expired')
    );
  END IF;

  IF v_form.close_after_date IS NOT NULL AND v_form.close_after_date < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'form_expired',
      'message', COALESCE(v_form.closed_message, 'This form has expired')
    );
  END IF;

  -- Check password protection
  IF v_form.visibility = 'password_protected' AND v_form.access_password IS NOT NULL THEN
    IF p_password IS NULL OR p_password != v_form.access_password THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'invalid_password',
        'message', 'Invalid password'
      );
    END IF;
  END IF;

  -- Check response limit
  IF v_form.response_limit IS NOT NULL AND v_form.total_submissions >= v_form.response_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_reached',
      'message', COALESCE(v_form.limit_message, 'Maximum responses reached')
    );
  END IF;

  IF v_form.close_after_responses IS NOT NULL AND v_form.total_submissions >= v_form.close_after_responses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_reached',
      'message', COALESCE(v_form.limit_message, 'Maximum responses reached')
    );
  END IF;

  -- Rate limiting: session-based (max 5 per minute)
  IF p_session_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_recent_submissions
    FROM form_submissions fs
    WHERE fs.form_id = p_form_id
      AND fs.session_id = p_session_id
      AND fs.created_at > NOW() - INTERVAL '1 minute';

    IF v_recent_submissions >= 5 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'rate_limited',
        'message', 'Too many submissions. Please wait a moment.'
      );
    END IF;
  END IF;

  -- Rate limiting: IP-based (max 20 per minute per IP)
  IF v_ip_hash IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_recent_submissions
    FROM form_submissions fs
    WHERE fs.form_id = p_form_id
      AND fs.ip_hash = v_ip_hash
      AND fs.created_at > NOW() - INTERVAL '1 minute';

    IF v_recent_submissions >= 20 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'rate_limited',
        'message', 'Too many submissions from this location. Please wait.'
      );
    END IF;
  END IF;

  -- All checks passed - insert the submission with full metadata
  INSERT INTO form_submissions (
    form_id,
    workspace_id,
    data,
    session_id,
    ip_hash,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    user_agent,
    referrer,
    completion_time_seconds,
    contact_id,
    deal_id,
    campaign_id,
    account_id,
    status,
    created_at,
    completed_at
  ) VALUES (
    p_form_id,
    v_workspace_id,
    p_data,
    p_session_id,
    v_ip_hash,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_utm_term,
    v_utm_content,
    v_user_agent,
    v_referrer,
    v_completion_time,
    v_contact_id,
    v_deal_id,
    v_campaign_id,
    v_account_id,
    'completed',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_submission_id;

  -- Update the form's total_submissions count atomically
  UPDATE forms
  SET total_submissions = total_submissions + 1
  WHERE id = p_form_id;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id
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


-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_form(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_form(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.secure_submit_form(UUID, JSONB, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_submit_form(UUID, JSONB, TEXT, TEXT, JSONB) TO anon;

-- Comments
COMMENT ON FUNCTION public.get_public_form IS 
'Securely fetches a public form by slug, enforcing visibility, password protection, 
expiration, and response limits. Never returns access_password to client.';

COMMENT ON FUNCTION public.secure_submit_form IS 
'Securely submits a form response with full validation and metadata persistence.
Handles password protection, response limits, rate limiting (session + IP), 
and persists all UTM/analytics/CRM fields.';

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_form_submissions_session_rate 
ON form_submissions (form_id, session_id, created_at)
WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_submissions_ip_rate 
ON form_submissions (form_id, ip_hash, created_at)
WHERE ip_hash IS NOT NULL;
