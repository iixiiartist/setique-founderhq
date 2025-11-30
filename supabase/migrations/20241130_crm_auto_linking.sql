-- ============================================================================
-- CRM Auto-Linking for Form Submissions
-- Automatically creates/links contacts when forms have auto_create_contact=true
-- ============================================================================

-- Add helper function to extract contact info from form submission data
CREATE OR REPLACE FUNCTION extract_contact_from_submission(
  p_form_id UUID,
  p_data JSONB
)
RETURNS TABLE(
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field RECORD;
  v_name TEXT := NULL;
  v_email TEXT := NULL;
  v_phone TEXT := NULL;
BEGIN
  -- Look through form fields to find contact info based on field type and label
  FOR v_field IN 
    SELECT ff.id, ff.type, ff.label, ff.settings
    FROM form_fields ff
    WHERE ff.form_id = p_form_id
    ORDER BY ff.field_order
  LOOP
    -- Check field type
    IF v_field.type = 'email' AND v_email IS NULL THEN
      v_email := p_data->>v_field.id;
    ELSIF v_field.type = 'phone' AND v_phone IS NULL THEN
      v_phone := p_data->>v_field.id;
    ELSIF v_field.type IN ('short_text', 'text') THEN
      -- Check label for name indicators
      IF v_name IS NULL AND (
        LOWER(v_field.label) LIKE '%name%' OR
        LOWER(v_field.label) LIKE '%full name%' OR
        LOWER(v_field.label) = 'name'
      ) THEN
        v_name := p_data->>v_field.id;
      END IF;
    END IF;
  END LOOP;
  
  -- Return the extracted values
  contact_name := v_name;
  contact_email := v_email;
  contact_phone := v_phone;
  
  RETURN NEXT;
END;
$$;

-- Main function to create or find a contact from form submission
CREATE OR REPLACE FUNCTION create_or_find_contact_from_form(
  p_workspace_id UUID,
  p_form_id UUID,
  p_data JSONB,
  p_default_campaign_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_info RECORD;
  v_contact_id UUID;
  v_existing_contact_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
BEGIN
  -- Extract contact info from submission
  SELECT * INTO v_contact_info
  FROM extract_contact_from_submission(p_form_id, p_data);
  
  v_name := v_contact_info.contact_name;
  v_email := v_contact_info.contact_email;
  v_phone := v_contact_info.contact_phone;
  
  -- If no name, try to construct from first_name + last_name fields
  IF v_name IS NULL THEN
    SELECT 
      TRIM(CONCAT(
        COALESCE(p_data->>'first_name', ''),
        ' ',
        COALESCE(p_data->>'last_name', '')
      ))
    INTO v_name
    WHERE EXISTS (
      SELECT 1 FROM jsonb_each_text(p_data) 
      WHERE key IN ('first_name', 'last_name')
    );
  END IF;
  
  -- If still no name and we have email, use email local part
  IF (v_name IS NULL OR v_name = '') AND v_email IS NOT NULL THEN
    v_name := split_part(v_email, '@', 1);
  END IF;
  
  -- If we don't have enough info, return null
  IF (v_name IS NULL OR v_name = '') AND (v_email IS NULL OR v_email = '') THEN
    RETURN NULL;
  END IF;
  
  -- Provide default name if missing
  IF v_name IS NULL OR v_name = '' THEN
    v_name := 'Unknown';
  END IF;
  
  -- Try to find existing contact by email in this workspace
  IF v_email IS NOT NULL AND v_email != '' THEN
    SELECT id INTO v_existing_contact_id
    FROM contacts
    WHERE workspace_id = p_workspace_id
      AND LOWER(email) = LOWER(v_email)
    LIMIT 1;
    
    IF v_existing_contact_id IS NOT NULL THEN
      -- Update existing contact if we have new info
      UPDATE contacts
      SET 
        phone = COALESCE(contacts.phone, v_phone),
        name = CASE 
          WHEN contacts.name = 'Unknown' OR contacts.name LIKE '%@%' 
          THEN COALESCE(v_name, contacts.name)
          ELSE contacts.name
        END,
        updated_at = NOW()
      WHERE id = v_existing_contact_id;
      
      RETURN v_existing_contact_id;
    END IF;
  END IF;
  
  -- Create new contact
  INSERT INTO contacts (
    id,
    workspace_id,
    name,
    email,
    phone,
    tags,
    source,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_workspace_id,
    v_name,
    v_email,
    v_phone,
    ARRAY['form-submission'],
    'form',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_contact_id;
  
  RETURN v_contact_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail the submission
    RAISE WARNING 'Failed to create contact from form: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Now update the secure_submit_form to use auto-linking
-- This is an ALTER/UPDATE to the existing function
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
  v_workspace_id UUID;
  v_submission_id UUID;
  v_recent_submissions INTEGER;
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
  v_auto_contact_id UUID;
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
  
  -- CRM linkage from metadata (explicit linkage takes priority)
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

  -- Get form with lock for atomic operations
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
        'message', 'Too many submissions. Please wait a minute and try again.'
      );
    END IF;
  END IF;

  -- Rate limiting: IP-based (max 10 per minute)
  IF v_ip_hash IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_recent_submissions
    FROM form_submissions fs
    WHERE fs.form_id = p_form_id
      AND fs.ip_hash = v_ip_hash
      AND fs.created_at > NOW() - INTERVAL '1 minute';

    IF v_recent_submissions >= 10 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'rate_limited',
        'message', 'Too many submissions. Please wait a minute and try again.'
      );
    END IF;
  END IF;

  -- ============== CRM AUTO-LINKING ==============
  -- If auto_create_contact is enabled and no contact_id provided, create/find contact
  IF v_form.auto_create_contact = true AND v_contact_id IS NULL THEN
    v_auto_contact_id := create_or_find_contact_from_form(
      v_workspace_id,
      p_form_id,
      p_data,
      v_campaign_id
    );
    
    IF v_auto_contact_id IS NOT NULL THEN
      v_contact_id := v_auto_contact_id;
    END IF;
  END IF;
  -- ============== END CRM AUTO-LINKING ==============

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.extract_contact_from_submission(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_find_contact_from_form(UUID, UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_submit_form(UUID, JSONB, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_submit_form(UUID, JSONB, TEXT, TEXT, JSONB) TO anon;

-- Add source column to contacts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'source'
    ) THEN
        ALTER TABLE contacts ADD COLUMN source TEXT;
    END IF;
END
$$;

COMMENT ON FUNCTION public.extract_contact_from_submission IS 
'Extracts contact information (name, email, phone) from form submission data by analyzing field types and labels.';

COMMENT ON FUNCTION public.create_or_find_contact_from_form IS 
'Creates a new contact or finds an existing one based on email. Used for CRM auto-linking when auto_create_contact is enabled.';
