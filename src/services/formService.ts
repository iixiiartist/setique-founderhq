import { supabase } from '../../lib/supabase';
import {
  Form,
  FormField,
  FormSubmission,
  FormAnalyticsEvent,
  FormAnalyticsSummary,
  FormThemePreset,
  FormStatus,
  DEFAULT_FORM_THEME,
  DEFAULT_FORM_BRANDING,
  DEFAULT_FORM_SETTINGS,
  DEFAULT_ANALYTICS_SETTINGS,
} from '../../types/forms';

// Form type from database
type DbFormType = 'form' | 'survey' | 'poll' | 'quiz' | 'feedback';

// Helper function to map database row to Form type
function mapDbToForm(dbRow: any): Form {
  // Properly merge settings with defaults (DB values override defaults)
  const mergedSettings = { ...DEFAULT_FORM_SETTINGS, ...(dbRow.settings || {}) };
  
  // Theme is stored in theme JSONB - extract pure theme fields
  const themeData = dbRow.theme || {};
  const mergedTheme = { 
    ...DEFAULT_FORM_THEME, 
    ...themeData,
  };
  // Remove non-theme fields that may be stored in theme JSONB
  delete (mergedTheme as any).branding;
  delete (mergedTheme as any).analytics_settings;
  
  // Build branding from theme.branding JSONB + separate columns
  const dbBranding = themeData.branding || {};
  const mergedBranding = {
    ...DEFAULT_FORM_BRANDING,
    ...dbBranding,
    logoUrl: dbRow.logo_url || dbBranding.logoUrl,
    headerImageUrl: dbRow.cover_image_url || dbBranding.headerImageUrl,
    customCss: dbRow.custom_css || dbBranding.customCss,
  };
  
  // Analytics settings from theme.analytics_settings JSONB
  const mergedAnalytics = { 
    ...DEFAULT_ANALYTICS_SETTINGS, 
    ...(themeData.analytics_settings || {}) 
  };
  
  // Use the visibility column directly if available, fall back to inference
  let visibility: 'public' | 'private' | 'password_protected' = 
    dbRow.visibility || // Use actual column first
    (dbRow.settings?.passwordProtected ? 'password_protected' : 
     dbRow.is_public ? 'public' : 'private');
  
  return {
    id: dbRow.id,
    workspace_id: dbRow.workspace_id,
    created_by: dbRow.user_id,
    name: dbRow.title,
    description: dbRow.description,
    slug: dbRow.slug,
    status: dbRow.status as FormStatus,
    settings: mergedSettings,
    theme: mergedTheme,
    branding: mergedBranding,
    analytics_settings: mergedAnalytics,
    visibility,
    // Don't expose access_password to client - only indicate if protected
    expires_at: dbRow.settings?.closeAfterDate,
    response_limit: dbRow.settings?.closeAfterResponses,
    total_submissions: dbRow.total_submissions || 0,
    created_at: dbRow.created_at,
    updated_at: dbRow.updated_at,
    published_at: dbRow.published_at,
    fields: dbRow.fields ? dbRow.fields.map(mapDbToField) : undefined,
    // Extended fields for CRM integration
    type: dbRow.type as DbFormType,
    default_campaign_id: dbRow.default_campaign_id,
    default_account_id: dbRow.default_account_id,
    auto_create_contact: dbRow.auto_create_contact,
    default_crm_type: dbRow.default_crm_type,
  } as Form & { type?: DbFormType; default_campaign_id?: string; default_account_id?: string; auto_create_contact?: boolean; default_crm_type?: string };
}

// Helper function to map database row to FormField type
function mapDbToField(dbRow: any): FormField {
  // Map DB width values to our type system
  const widthMap: Record<string, string> = {
    'full': '100%',
    'half': '50%',
    'third': '33%',
    '100%': '100%',
    '75%': '75%',
    '66%': '66%',
    '50%': '50%',
    '33%': '33%',
    '25%': '25%',
  };
  
  return {
    id: dbRow.id,
    form_id: dbRow.form_id,
    type: dbRow.type === 'multiselect' ? 'multi_select' : dbRow.type, // Normalize type
    label: dbRow.label,
    description: dbRow.description,
    placeholder: dbRow.placeholder,
    help_text: dbRow.help_text,
    required: dbRow.required || false,
    validation_rules: dbRow.validation || {}, // DB column is 'validation'
    options: dbRow.options,
    conditional_logic: dbRow.conditional_logic,
    styling: { 
      width: widthMap[dbRow.width] || dbRow.width || '100%', 
      alignment: dbRow.alignment || 'left' 
    },
    position: dbRow.sort_order || 0,
    default_value: dbRow.default_value,
    created_at: dbRow.created_at,
    updated_at: dbRow.updated_at,
    crm_field_mapping: dbRow.crm_field_mapping,
  } as FormField & { crm_field_mapping?: string };
}

// Generate unique slug for form (fallback, DB has trigger)
const generateSlug = (name: string): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${random}`;
};

// ============== FORM CRUD ==============

export async function createForm(
  workspaceId: string,
  userId: string,
  data: Partial<Form> & { type?: DbFormType; default_campaign_id?: string; auto_create_contact?: boolean; default_crm_type?: string }
): Promise<{ data: Form | null; error: string | null }> {
  try {
    console.log('[FormService] Creating form:', { workspaceId, userId, data });
    
    // Map our types to database schema
    const { data: form, error } = await supabase
      .from('forms')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        title: data.name || 'Untitled Form',
        description: data.description,
        type: data.type || 'form',
        status: 'draft',
        settings: data.settings || DEFAULT_FORM_SETTINGS,
        theme: data.theme || DEFAULT_FORM_THEME,
        is_public: data.visibility === 'public',
        default_campaign_id: data.default_campaign_id || null,
        auto_create_contact: data.auto_create_contact || false,
        default_crm_type: data.default_crm_type || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[FormService] Create form error:', error);
      throw error;
    }
    
    console.log('[FormService] Form created successfully:', form);
    return { data: mapDbToForm(form), error: null };
  } catch (error: any) {
    console.error('[FormService] Error creating form:', error);
    return { data: null, error: error.message };
  }
}

export async function getForm(formId: string): Promise<{ data: Form | null; error: string | null }> {
  try {
    const { data: form, error } = await supabase
      .from('forms')
      .select('*, form_fields(*)') 
      .eq('id', formId)
      .single();

    if (error) throw error;
    
    // Sort fields by position and map
    if (form?.form_fields) {
      form.form_fields.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      form.fields = form.form_fields;
      delete form.form_fields;
    }
    
    return { data: mapDbToForm(form), error: null };
  } catch (error: any) {
    console.error('Error fetching form:', error);
    return { data: null, error: error.message };
  }
}

export async function getFormBySlug(
  slug: string,
  password?: string
): Promise<{ data: Form | null; error: string | null; passwordRequired?: boolean }> {
  try {
    // Use secure RPC that enforces visibility/password/expiry and never returns access_password
    const { data: result, error } = await supabase.rpc('get_public_form', {
      p_slug: slug,
      p_password: password || null,
    });

    if (error) {
      console.error('RPC error:', error);
      // Only fall back if RPC truly doesn't exist (migration not applied)
      if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
        console.warn('get_public_form RPC not available - please apply migration');
        // Minimal fallback - DO NOT expose access_password
        const { data: form, error: fetchError } = await supabase
          .from('forms')
          .select('id, workspace_id, title, description, type, status, theme, logo_url, cover_image_url, custom_css, settings, slug, is_public, visibility, total_submissions, default_campaign_id, default_crm_type, auto_create_contact')
          .eq('slug', slug)
          .eq('status', 'published')
          .single();
        
        if (fetchError || !form) {
          return { data: null, error: 'Form not found' };
        }
        
        // Fetch fields separately
        const { data: fields } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', form.id)
          .order('page_number')
          .order('sort_order');
        
        form.fields = fields || [];
        return { data: mapDbToForm(form), error: null };
      }
      return { data: null, error: error.message };
    }

    // Parse RPC response
    const response = result as { 
      success: boolean; 
      error?: string; 
      message?: string; 
      form?: any;
    };
    
    if (!response.success) {
      // Handle password requirement
      if (response.error === 'password_required') {
        return { 
          data: response.form ? mapDbToForm(response.form) : null, 
          error: null,
          passwordRequired: true,
        };
      }
      return { data: null, error: response.message || response.error || 'Failed to fetch form' };
    }

    return { data: mapDbToForm(response.form), error: null };
  } catch (error: any) {
    console.error('Error fetching form by slug:', error);
    return { data: null, error: error.message };
  }
}

export async function getWorkspaceForms(workspaceId: string): Promise<{ data: Form[]; error: string | null }> {
  try {
    console.log('[FormService] Fetching forms for workspace:', workspaceId);
    
    const { data: forms, error } = await supabase
      .from('forms')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[FormService] Fetch forms error:', error);
      throw error;
    }
    
    console.log('[FormService] Forms fetched:', forms?.length || 0);
    return { data: (forms || []).map(mapDbToForm), error: null };
  } catch (error: any) {
    console.error('[FormService] Error fetching workspace forms:', error);
    return { data: [], error: error.message };
  }
}

export async function updateForm(
  formId: string,
  data: Partial<Form> & { type?: DbFormType; default_campaign_id?: string | null; auto_create_contact?: boolean; default_crm_type?: string | null; default_account_id?: string | null }
): Promise<{ data: Form | null; error: string | null }> {
  try {
    // Map form data to database columns
    const dbData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.name !== undefined) dbData.title = data.name;
    if (data.description !== undefined) dbData.description = data.description;
    if (data.status !== undefined) dbData.status = data.status;
    
    // Settings - merge with response limits and password
    if (data.settings !== undefined) {
      const settingsWithLimits = { ...data.settings };
      if (data.expires_at) settingsWithLimits.closeAfterDate = data.expires_at;
      if (data.response_limit) settingsWithLimits.closeAfterResponses = data.response_limit;
      if (data.access_password) {
        settingsWithLimits.passwordProtected = true;
        settingsWithLimits.password = data.access_password;
      }
      dbData.settings = settingsWithLimits;
    }
    
    // Theme - store as JSONB
    if (data.theme !== undefined) dbData.theme = data.theme;
    
    // Branding - map to separate columns
    if (data.branding !== undefined) {
      if (data.branding.logoUrl) dbData.logo_url = data.branding.logoUrl;
      if (data.branding.headerImageUrl) dbData.cover_image_url = data.branding.headerImageUrl;
      if (data.branding.customCss) dbData.custom_css = data.branding.customCss;
      // Store full branding in theme JSONB for round-trip
      dbData.theme = { ...(data.theme || {}), branding: data.branding };
    }
    
    // Analytics settings - store in theme JSONB
    if (data.analytics_settings !== undefined) {
      dbData.theme = { ...(dbData.theme || data.theme || {}), analytics_settings: data.analytics_settings };
    }
    
    // Visibility handling
    if (data.visibility !== undefined) {
      dbData.is_public = data.visibility === 'public';
      if (data.visibility === 'password_protected') {
        dbData.settings = { ...(dbData.settings || {}), passwordProtected: true };
      }
    }
    
    // CRM fields
    if (data.type !== undefined) dbData.type = data.type;
    if (data.default_campaign_id !== undefined) dbData.default_campaign_id = data.default_campaign_id;
    if (data.default_account_id !== undefined) dbData.default_account_id = data.default_account_id;
    if (data.auto_create_contact !== undefined) dbData.auto_create_contact = data.auto_create_contact;
    if (data.default_crm_type !== undefined) dbData.default_crm_type = data.default_crm_type;
    if (data.published_at !== undefined) dbData.published_at = data.published_at;
    
    const { data: form, error } = await supabase
      .from('forms')
      .update(dbData)
      .eq('id', formId)
      .select()
      .single();

    if (error) throw error;
    return { data: mapDbToForm(form), error: null };
  } catch (error: any) {
    console.error('Error updating form:', error);
    return { data: null, error: error.message };
  }
}

export async function publishForm(formId: string): Promise<{ data: Form | null; error: string | null }> {
  return updateForm(formId, {
    status: 'published',
    visibility: 'public',
    published_at: new Date().toISOString(),
  } as Partial<Form>);
}

export async function unpublishForm(formId: string): Promise<{ data: Form | null; error: string | null }> {
  return updateForm(formId, { status: 'draft', visibility: 'private' } as Partial<Form>);
}

export async function archiveForm(formId: string): Promise<{ data: Form | null; error: string | null }> {
  return updateForm(formId, { status: 'archived' } as Partial<Form>);
}

export async function deleteForm(formId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('forms').delete().eq('id', formId);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting form:', error);
    return { error: error.message };
  }
}

export async function duplicateForm(
  formId: string,
  workspaceId: string,
  userId: string
): Promise<{ data: Form | null; error: string | null }> {
  try {
    // Get original form with fields
    const { data: original, error: fetchError } = await getForm(formId);
    if (fetchError || !original) throw new Error(fetchError || 'Form not found');

    // Create new form
    const { data: newForm, error: createError } = await createForm(workspaceId, userId, {
      name: `${original.name} (Copy)`,
      description: original.description,
      settings: original.settings,
      theme: original.theme,
      branding: original.branding,
      analytics_settings: original.analytics_settings,
      visibility: original.visibility,
    });

    if (createError || !newForm) throw new Error(createError || 'Failed to create form copy');

    // Duplicate fields if any
    if (original.fields && original.fields.length > 0) {
      // Map width values to DB format
      const mapWidth = (width?: string): string => {
        if (!width) return 'full';
        if (width === '100%') return 'full';
        if (width === '50%') return 'half';
        if (width === '33%') return 'third';
        return 'full';
      };
      
      const newFields = original.fields.map((field, index) => ({
        form_id: newForm.id,
        type: field.type === 'multi_select' ? 'multiselect' : field.type,
        label: field.label,
        description: field.description,
        placeholder: field.placeholder,
        help_text: field.help_text,
        required: field.required,
        validation: field.validation_rules, // DB column is 'validation'
        options: field.options,
        conditional_logic: field.conditional_logic,
        width: mapWidth(field.styling?.width),
        sort_order: index,
        default_value: field.default_value,
      }));

      const { error: fieldsError } = await supabase.from('form_fields').insert(newFields);
      if (fieldsError) console.error('Error duplicating fields:', fieldsError);
    }

    return { data: newForm, error: null };
  } catch (error: any) {
    console.error('Error duplicating form:', error);
    return { data: null, error: error.message };
  }
}

// ============== FORM FIELDS ==============

export async function createFormField(
  formId: string,
  data: Partial<FormField>
): Promise<{ data: FormField | null; error: string | null }> {
  try {
    // Get current max position
    const { data: existingFields } = await supabase
      .from('form_fields')
      .select('position')
      .eq('form_id', formId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingFields && existingFields.length > 0 ? existingFields[0].position + 1 : 0;

    // Normalize type for DB
    const dbType = data.type === 'multi_select' ? 'multiselect' : (data.type || 'text');
    
    const { data: field, error } = await supabase
      .from('form_fields')
      .insert({
        form_id: formId,
        type: dbType,
        label: data.label || 'New Field',
        description: data.description,
        placeholder: data.placeholder,
        help_text: data.help_text,
        required: data.required || false,
        validation: data.validation_rules || {}, // DB column is 'validation'
        options: data.options,
        conditional_logic: data.conditional_logic,
        width: data.styling?.width === '100%' ? 'full' : data.styling?.width === '50%' ? 'half' : data.styling?.width === '33%' ? 'third' : 'full',
        sort_order: data.position ?? nextPosition,
        default_value: data.default_value,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: field, error: null };
  } catch (error: any) {
    console.error('Error creating form field:', error);
    return { data: null, error: error.message };
  }
}

export async function updateFormField(
  fieldId: string,
  data: Partial<FormField>
): Promise<{ data: FormField | null; error: string | null }> {
  try {
    const { data: field, error } = await supabase
      .from('form_fields')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fieldId)
      .select()
      .single();

    if (error) throw error;
    return { data: field, error: null };
  } catch (error: any) {
    console.error('Error updating form field:', error);
    return { data: null, error: error.message };
  }
}

export async function deleteFormField(fieldId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('form_fields').delete().eq('id', fieldId);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting form field:', error);
    return { error: error.message };
  }
}

export async function reorderFormFields(
  formId: string,
  fieldIds: string[]
): Promise<{ error: string | null }> {
  try {
    const updates = fieldIds.map((id, index) => ({
      id,
      form_id: formId,
      position: index,
      updated_at: new Date().toISOString(),
    }));

    // Batch update positions
    for (const update of updates) {
      const { error } = await supabase
        .from('form_fields')
        .update({ position: update.position, updated_at: update.updated_at })
        .eq('id', update.id);
      if (error) throw error;
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error reordering form fields:', error);
    return { error: error.message };
  }
}

export async function bulkSaveFields(
  formId: string,
  fields: (Partial<FormField> & { crm_field_mapping?: string })[]
): Promise<{ error: string | null }> {
  try {
    // Delete existing fields
    await supabase.from('form_fields').delete().eq('form_id', formId);

    // Insert new fields
    if (fields.length > 0) {
      // Map width values to DB format
      const mapWidth = (width?: string): string => {
        if (!width) return 'full';
        if (width === '100%') return 'full';
        if (width === '50%') return 'half';
        if (width === '33%') return 'third';
        return width;
      };
      
      // Normalize field type for DB
      const normalizeType = (type?: string): string => {
        if (type === 'multi_select') return 'multiselect';
        return type || 'text';
      };
      
      const fieldsToInsert = fields.map((field, index) => ({
        form_id: formId,
        type: normalizeType(field.type),
        label: field.label,
        description: field.description,
        placeholder: field.placeholder,
        help_text: field.help_text,
        required: field.required || false,
        validation: field.validation_rules || {}, // DB column is 'validation'
        options: field.options,
        conditional_logic: field.conditional_logic,
        width: mapWidth(field.styling?.width),
        sort_order: index,
        default_value: field.default_value,
        crm_field_mapping: field.crm_field_mapping || null,
      }));

      const { error } = await supabase.from('form_fields').insert(fieldsToInsert);
      if (error) throw error;
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error bulk saving fields:', error);
    return { error: error.message };
  }
}

// ============== FORM SUBMISSIONS ==============

/**
 * NOTE: IP-based rate limiting is handled server-side via Supabase Edge Functions
 * or by deploying an API proxy that extracts the real IP and hashes it.
 * The client cannot reliably provide IP information.
 * 
 * Session-based rate limiting (using sessionId) works from the client.
 */

/**
 * Secure form submission using server-side RPC for atomic validation
 * This should be used for ALL public forms - no insecure fallback
 * 
 * When captcha is required or useEdgeFunction is true, submission goes through
 * the Edge Function which provides server-side IP hashing and captcha verification.
 */
export async function secureSubmitForm(
  formId: string,
  data: Record<string, any>,
  options?: {
    password?: string;
    sessionId?: string;
    captchaToken?: string;
    captchaProvider?: 'recaptcha' | 'hcaptcha' | 'turnstile';
    useEdgeFunction?: boolean;
    metadata?: {
      sourceUrl?: string;
      utmParams?: Record<string, string | undefined>;
      completionTime?: number;
      userAgent?: string;
      referrer?: string;
      campaignId?: string;
      accountId?: string;
      contactId?: string;
      dealId?: string;
    };
  }
): Promise<{ data: { submission_id: string } | null; error: string | null }> {
  try {
    // Build metadata object
    // Note: ipHash is NOT sent from client - extracted by Edge Function
    const metadata = {
      sourceUrl: options?.metadata?.sourceUrl || window.location.href,
      utmParams: options?.metadata?.utmParams || {},
      completionTime: options?.metadata?.completionTime,
      userAgent: options?.metadata?.userAgent || navigator.userAgent,
      referrer: options?.metadata?.referrer || document.referrer,
      // ipHash intentionally omitted - cannot be trusted from client
      campaignId: options?.metadata?.campaignId,
      accountId: options?.metadata?.accountId,
      contactId: options?.metadata?.contactId,
      dealId: options?.metadata?.dealId,
    };
    
    // Use Edge Function when captcha is provided or explicitly requested
    // This provides server-side IP hashing and captcha verification
    if (options?.captchaToken || options?.useEdgeFunction) {
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/form-submit`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          form_id: formId,
          data,
          password: options?.password || null,
          session_id: options?.sessionId || null,
          metadata,
          captcha_token: options?.captchaToken || null,
          captcha_provider: options?.captchaProvider || null,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || result.error) {
        return { data: null, error: result.error || 'Submission failed' };
      }

      return { data: { submission_id: result.submission_id }, error: null };
    }
    
    // Direct RPC call (no server-side IP hashing, no captcha)
    const { data: result, error } = await supabase.rpc('secure_submit_form', {
      p_form_id: formId,
      p_data: data,
      p_password: options?.password || null,
      p_session_id: options?.sessionId || null,
      p_metadata: metadata,
    });

    if (error) {
      console.error('RPC error:', error);
      // If RPC doesn't exist, return error - DO NOT fall back to insecure path
      if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
        console.error('secure_submit_form RPC not available - please apply migration');
        return { data: null, error: 'Form submission temporarily unavailable. Please try again later.' };
      }
      return { data: null, error: error.message };
    }

    // Parse RPC response
    const response = result as { success: boolean; error?: string; message?: string; submission_id?: string };
    
    if (!response.success) {
      return { data: null, error: response.message || response.error || 'Submission failed' };
    }

    return { data: { submission_id: response.submission_id! }, error: null };
  } catch (error: any) {
    console.error('Error in secure form submission:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Standard form submission - used internally and as fallback
 * For public forms, prefer secureSubmitForm which has atomic validation
 */
export async function submitForm(
  formId: string,
  data: Record<string, any>,
  metadata?: {
    contactId?: string;
    dealId?: string;
    campaignId?: string;
    accountId?: string;
    sourceUrl?: string;
    utmParams?: Record<string, string>;
    completionTime?: number;
    userAgent?: string;
    ipHash?: string;
  }
): Promise<{ data: FormSubmission | null; error: string | null }> {
  try {
    // Fetch form to validate submission is allowed
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, status, is_public, settings, total_submissions')
      .eq('id', formId)
      .single();
    
    if (formError || !form) {
      return { data: null, error: 'Form not found' };
    }
    
    // Validate form is published
    if (form.status !== 'published') {
      return { data: null, error: 'Form is not accepting responses' };
    }
    
    // Validate expiration
    const closeAfterDate = form.settings?.closeAfterDate;
    if (closeAfterDate && new Date(closeAfterDate) < new Date()) {
      return { data: null, error: 'Form has expired' };
    }
    
    // Validate response limit
    const responseLimit = form.settings?.closeAfterResponses;
    if (responseLimit && form.total_submissions >= responseLimit) {
      return { data: null, error: 'Maximum responses reached' };
    }
    
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        data,
        contact_id: metadata?.contactId,
        deal_id: metadata?.dealId,
        campaign_id: metadata?.campaignId,
        account_id: metadata?.accountId,
        source_url: metadata?.sourceUrl,
        utm_params: metadata?.utmParams,
        completion_time_seconds: metadata?.completionTime,
        user_agent: metadata?.userAgent,
        ip_hash: metadata?.ipHash,
      })
      .select()
      .single();

    if (error) throw error;

    // Increment total_submissions counter
    await supabase.rpc('increment_form_submissions', { form_id: formId });

    return { data: submission, error: null };
  } catch (error: any) {
    console.error('Error submitting form:', error);
    return { data: null, error: error.message };
  }
}

export async function getFormSubmissions(
  formId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ data: FormSubmission[]; total: number; error: string | null }> {
  try {
    let query = supabase
      .from('form_submissions')
      .select('*', { count: 'exact' })
      .eq('form_id', formId)
      .order('created_at', { ascending: false });

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

    const { data, count, error } = await query;

    if (error) throw error;
    return { data: data || [], total: count || 0, error: null };
  } catch (error: any) {
    console.error('Error fetching form submissions:', error);
    return { data: [], total: 0, error: error.message };
  }
}

export async function deleteSubmission(submissionId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('form_submissions').delete().eq('id', submissionId);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting submission:', error);
    return { error: error.message };
  }
}

// ============== FORM ANALYTICS ==============

export async function trackFormEvent(
  formId: string,
  eventType: 'view' | 'start' | 'submit' | 'abandon' | 'field_interaction',
  metadata?: {
    fieldId?: string;
    data?: Record<string, any>;
    userAgent?: string;
    ipHash?: string;
    referrer?: string;
    utmParams?: Record<string, string>;
    sessionId?: string;
  }
): Promise<void> {
  try {
    await supabase.from('form_analytics').insert({
      form_id: formId,
      event_type: eventType,
      field_id: metadata?.fieldId,
      metadata: metadata?.data,
      user_agent: metadata?.userAgent,
      ip_hash: metadata?.ipHash,
      referrer: metadata?.referrer,
      utm_params: metadata?.utmParams,
      session_id: metadata?.sessionId,
    });
  } catch (error) {
    console.error('Error tracking form event:', error);
  }
}

export async function getFormAnalytics(
  formId: string,
  dateRange?: { from: string; to: string }
): Promise<{ data: FormAnalyticsSummary | null; error: string | null }> {
  try {
    let query = supabase
      .from('form_analytics')
      .select('*')
      .eq('form_id', formId);

    if (dateRange) {
      query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    // Calculate summary
    const views = events?.filter(e => e.event_type === 'view').length || 0;
    const starts = events?.filter(e => e.event_type === 'start').length || 0;
    const submits = events?.filter(e => e.event_type === 'submit').length || 0;
    const abandons = events?.filter(e => e.event_type === 'abandon').length || 0;

    // Get submissions for completion time
    const { data: submissions } = await supabase
      .from('form_submissions')
      .select('completion_time_seconds')
      .eq('form_id', formId)
      .not('completion_time_seconds', 'is', null);

    const avgTime = submissions && submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.completion_time_seconds || 0), 0) / submissions.length
      : 0;

    // Group by referrer
    const referrerCounts: Record<string, number> = {};
    events?.forEach(e => {
      if (e.referrer) {
        referrerCounts[e.referrer] = (referrerCounts[e.referrer] || 0) + 1;
      }
    });

    const topReferrers = Object.entries(referrerCounts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // UTM breakdown
    const utmBreakdown = { source: {} as Record<string, number>, medium: {} as Record<string, number>, campaign: {} as Record<string, number> };
    events?.forEach(e => {
      const utm = e.utm_params as any;
      if (utm?.utm_source) utmBreakdown.source[utm.utm_source] = (utmBreakdown.source[utm.utm_source] || 0) + 1;
      if (utm?.utm_medium) utmBreakdown.medium[utm.utm_medium] = (utmBreakdown.medium[utm.utm_medium] || 0) + 1;
      if (utm?.utm_campaign) utmBreakdown.campaign[utm.utm_campaign] = (utmBreakdown.campaign[utm.utm_campaign] || 0) + 1;
    });

    const summary: FormAnalyticsSummary = {
      form_id: formId,
      total_views: views,
      total_starts: starts,
      total_submissions: submits,
      total_abandons: abandons,
      conversion_rate: views > 0 ? (submits / views) * 100 : 0,
      average_completion_time: Math.round(avgTime),
      top_referrers: topReferrers,
      utm_breakdown: utmBreakdown,
      field_dropoff: [], // Would need more complex query
      submissions_over_time: [], // Would need date grouping
    };

    return { data: summary, error: null };
  } catch (error: any) {
    console.error('Error fetching form analytics:', error);
    return { data: null, error: error.message };
  }
}

// ============== THEME PRESETS ==============

export async function getThemePresets(): Promise<{ data: FormThemePreset[]; error: string | null }> {
  try {
    const { data: presets, error } = await supabase
      .from('form_theme_presets')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

    if (error) throw error;
    return { data: presets || [], error: null };
  } catch (error: any) {
    console.error('Error fetching theme presets:', error);
    return { data: [], error: error.message };
  }
}

export async function createThemePreset(
  data: Omit<FormThemePreset, 'id' | 'created_at'>,
  userId: string
): Promise<{ data: FormThemePreset | null; error: string | null }> {
  try {
    const { data: preset, error } = await supabase
      .from('form_theme_presets')
      .insert({
        ...data,
        created_by: userId,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: preset, error: null };
  } catch (error: any) {
    console.error('Error creating theme preset:', error);
    return { data: null, error: error.message };
  }
}

// ============== EMBED & SHARE ==============

export function generateEmbedCode(formId: string, slug: string, options?: {
  width?: string;
  height?: string;
  mode?: 'iframe' | 'popup' | 'inline';
}): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const formUrl = `${baseUrl}/forms/${slug}`;
  const width = options?.width || '100%';
  const height = options?.height || '600px';
  const mode = options?.mode || 'iframe';

  if (mode === 'iframe') {
    return `<iframe src="${formUrl}?embed=true" width="${width}" height="${height}" frameborder="0" style="border: none; max-width: 100%;"></iframe>`;
  }

  if (mode === 'popup') {
    return `<button onclick="window.open('${formUrl}?popup=true', 'form_popup', 'width=600,height=700,scrollbars=yes')" style="padding: 12px 24px; background: #8B5CF6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Open Form</button>`;
  }

  // Inline script embed
  return `<div id="form-${formId}"></div>
<script src="${baseUrl}/embed/form.js"></script>
<script>
  SetiqueForms.render('${formId}', '#form-${formId}');
</script>`;
}

export function generateShareLinks(slug: string): {
  direct: string;
  twitter: string;
  linkedin: string;
  facebook: string;
  email: string;
} {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const formUrl = `${baseUrl}/forms/${slug}`;
  const encodedUrl = encodeURIComponent(formUrl);
  const text = encodeURIComponent('Check out this form!');

  return {
    direct: formUrl,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=Check out this form&body=${formUrl}`,
  };
}

// ============== FILE UPLOADS ==============

export interface FormFileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a file for a form submission to Supabase storage.
 * This uses server-side validation via the generate_form_upload_url RPC.
 * 
 * @param formId - The form ID
 * @param sessionId - Unique session ID for this submission
 * @param file - The file to upload
 * @returns Upload result with public URL or error
 */
export async function uploadFormFile(
  formId: string,
  sessionId: string,
  file: File
): Promise<FormFileUploadResult> {
  try {
    // Step 1: Get validated upload path from RPC
    const { data: pathData, error: pathError } = await supabase.rpc(
      'generate_form_upload_url',
      {
        p_form_id: formId,
        p_session_id: sessionId,
        p_filename: file.name.replace(/[^a-zA-Z0-9_.-]/g, '_'), // Sanitize filename
        p_content_type: file.type,
        p_file_size: file.size,
      }
    );

    if (pathError) {
      console.error('Upload path generation failed:', pathError);
      return { success: false, error: 'Failed to prepare upload' };
    }

    if (pathData?.error) {
      return { success: false, error: pathData.error };
    }

    if (!pathData?.path || !pathData?.bucket) {
      return { success: false, error: 'Invalid upload response' };
    }

    // Step 2: Upload directly to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(pathData.bucket)
      .upload(pathData.path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('File upload failed:', uploadError);
      return { success: false, error: 'Upload failed: ' + uploadError.message };
    }

    // Step 3: Mark upload token as used (for security - validates upload was authorized)
    await supabase.rpc('mark_upload_token_used', { p_file_path: pathData.path });

    // Step 4: Get signed URL (bucket is now private)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(pathData.bucket)
      .createSignedUrl(pathData.path, 3600); // 1 hour expiry

    return {
      success: true,
      url: urlData?.signedUrl || pathData.path, // Fall back to path if signed URL fails
      path: pathData.path,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

/**
 * Upload multiple files for a form submission.
 * Returns a map of field IDs to their upload results.
 * 
 * @param formId - The form ID
 * @param sessionId - Unique session ID for this submission
 * @param files - Map of field ID to File
 * @returns Map of field ID to upload result
 */
export async function uploadFormFiles(
  formId: string,
  sessionId: string,
  files: Map<string, File>
): Promise<Map<string, FormFileUploadResult>> {
  const results = new Map<string, FormFileUploadResult>();
  
  // Upload files in parallel (up to 3 at a time to avoid overload)
  const entries = Array.from(files.entries());
  const batchSize = 3;
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const uploadPromises = batch.map(async ([fieldId, file]) => {
      const result = await uploadFormFile(formId, sessionId, file);
      return { fieldId, result };
    });
    
    const batchResults = await Promise.all(uploadPromises);
    batchResults.forEach(({ fieldId, result }) => {
      results.set(fieldId, result);
    });
  }
  
  return results;
}
