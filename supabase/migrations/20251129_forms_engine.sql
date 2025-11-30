-- ============================================================================
-- Branded Interactive Forms Engine
-- Create tables for forms, fields, submissions, and analytics
-- ============================================================================

-- Forms table - main form configuration
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic info
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'form' CHECK (type IN ('form', 'survey', 'poll', 'quiz', 'feedback')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'closed')),
    
    -- Branding/Theme
    theme JSONB DEFAULT '{
        "preset": "default",
        "primaryColor": "#3B82F6",
        "secondaryColor": "#1E40AF",
        "backgroundColor": "#FFFFFF",
        "textColor": "#1F2937",
        "fontFamily": "Inter",
        "borderRadius": "8px",
        "buttonStyle": "solid"
    }'::jsonb,
    logo_url TEXT,
    cover_image_url TEXT,
    custom_css TEXT,
    
    -- Settings
    settings JSONB DEFAULT '{
        "showProgressBar": true,
        "showPageNumbers": false,
        "allowMultipleSubmissions": false,
        "requireLogin": false,
        "shuffleQuestions": false,
        "showThankYouPage": true,
        "thankYouMessage": "Thank you for your submission!",
        "thankYouRedirectUrl": null,
        "notifyOnSubmission": true,
        "notificationEmails": [],
        "closeAfterDate": null,
        "closeAfterResponses": null,
        "passwordProtected": false,
        "password": null
    }'::jsonb,
    
    -- Public URL
    slug TEXT UNIQUE,
    public_url TEXT,
    is_public BOOLEAN DEFAULT false,
    
    -- CRM Integration
    default_crm_type TEXT CHECK (default_crm_type IN ('investor', 'customer', 'partner')),
    default_campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    auto_create_contact BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Form fields table - individual form questions/fields
CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    
    -- Field configuration
    type TEXT NOT NULL CHECK (type IN (
        'text', 'email', 'phone', 'number', 'url', 'textarea',
        'select', 'multiselect', 'radio', 'checkbox',
        'date', 'time', 'datetime',
        'file', 'image',
        'rating', 'scale', 'nps',
        'heading', 'paragraph', 'divider', 'image_block',
        'hidden', 'signature'
    )),
    label TEXT NOT NULL,
    description TEXT,
    placeholder TEXT,
    
    -- Validation
    required BOOLEAN DEFAULT false,
    validation JSONB DEFAULT '{}'::jsonb, -- min, max, pattern, custom rules
    
    -- Options (for select, radio, checkbox)
    options JSONB DEFAULT '[]'::jsonb, -- [{value, label, image?}]
    
    -- Conditional logic
    conditional_logic JSONB DEFAULT NULL, -- {show_if: [{field_id, operator, value}]}
    
    -- Layout
    page_number INTEGER DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    width TEXT DEFAULT 'full' CHECK (width IN ('full', 'half', 'third')),
    
    -- CRM mapping
    crm_field_mapping TEXT, -- maps to contact fields: name, email, phone, company, etc.
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Submission data
    data JSONB NOT NULL DEFAULT '{}'::jsonb, -- {field_id: value}
    
    -- Source tracking
    source TEXT, -- direct, embed, social, email
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referrer TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    -- User info (if logged in or identified)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    
    -- CRM connections
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    crm_item_id UUID REFERENCES crm_items(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    
    -- Status
    status TEXT DEFAULT 'completed' CHECK (status IN ('partial', 'completed', 'spam', 'deleted')),
    is_test BOOLEAN DEFAULT false,
    
    -- Metadata
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form analytics table - track views and interactions
CREATE TABLE IF NOT EXISTS form_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    
    -- Event type
    event_type TEXT NOT NULL CHECK (event_type IN (
        'view', 'start', 'field_focus', 'field_complete', 
        'page_change', 'submit', 'abandon', 'share', 'embed_load'
    )),
    
    -- Event data
    event_data JSONB DEFAULT '{}'::jsonb,
    
    -- Source tracking
    session_id TEXT,
    source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    
    -- Device info
    device_type TEXT, -- desktop, mobile, tablet
    browser TEXT,
    os TEXT,
    
    -- Location (optional, from IP)
    country TEXT,
    region TEXT,
    city TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_forms_workspace_id ON forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_sort_order ON form_fields(form_id, page_number, sort_order);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_workspace_id ON form_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_contact_id ON form_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_event_type ON form_analytics(form_id, event_type);
CREATE INDEX IF NOT EXISTS idx_form_analytics_created_at ON form_analytics(created_at);

-- Enable RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forms
CREATE POLICY "Users can view forms in their workspace" ON forms
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create forms in their workspace" ON forms
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update forms in their workspace" ON forms
    FOR UPDATE USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete forms in their workspace" ON forms
    FOR DELETE USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- RLS Policies for form_fields
CREATE POLICY "Users can manage form fields" ON form_fields
    FOR ALL USING (
        form_id IN (
            SELECT id FROM forms WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for form_submissions
CREATE POLICY "Users can view submissions in their workspace" ON form_submissions
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- Allow anonymous submissions for public forms
CREATE POLICY "Anyone can submit to public forms" ON form_submissions
    FOR INSERT WITH CHECK (
        form_id IN (SELECT id FROM forms WHERE is_public = true AND status = 'published')
    );

CREATE POLICY "Users can update submissions in their workspace" ON form_submissions
    FOR UPDATE USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete submissions in their workspace" ON form_submissions
    FOR DELETE USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- RLS Policies for form_analytics
CREATE POLICY "Users can view analytics in their workspace" ON form_analytics
    FOR SELECT USING (
        form_id IN (
            SELECT id FROM forms WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- Allow anonymous analytics tracking for public forms
CREATE POLICY "Anyone can track analytics for public forms" ON form_analytics
    FOR INSERT WITH CHECK (
        form_id IN (SELECT id FROM forms WHERE is_public = true)
    );

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_form_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    new_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base slug from title
    base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
    base_slug := substring(base_slug from 1 for 50);
    
    -- Add random suffix for uniqueness
    new_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 8);
    
    NEW.slug := new_slug;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug
DROP TRIGGER IF EXISTS trigger_generate_form_slug ON forms;
CREATE TRIGGER trigger_generate_form_slug
    BEFORE INSERT ON forms
    FOR EACH ROW
    WHEN (NEW.slug IS NULL)
    EXECUTE FUNCTION generate_form_slug();

-- Function to update form analytics aggregates
CREATE OR REPLACE FUNCTION get_form_analytics_summary(p_form_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'totalViews', COUNT(*) FILTER (WHERE event_type = 'view'),
        'totalStarts', COUNT(*) FILTER (WHERE event_type = 'start'),
        'totalSubmissions', COUNT(*) FILTER (WHERE event_type = 'submit'),
        'conversionRate', CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'view') > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'submit')::numeric / COUNT(*) FILTER (WHERE event_type = 'view') * 100), 2)
            ELSE 0 
        END,
        'abandonRate', CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'start') > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'abandon')::numeric / COUNT(*) FILTER (WHERE event_type = 'start') * 100), 2)
            ELSE 0 
        END,
        'bySource', (
            SELECT jsonb_object_agg(COALESCE(source, 'direct'), cnt)
            FROM (
                SELECT source, COUNT(*) as cnt
                FROM form_analytics
                WHERE form_id = p_form_id AND created_at > NOW() - (p_days || ' days')::interval
                GROUP BY source
            ) s
        ),
        'byDevice', (
            SELECT jsonb_object_agg(COALESCE(device_type, 'unknown'), cnt)
            FROM (
                SELECT device_type, COUNT(*) as cnt
                FROM form_analytics
                WHERE form_id = p_form_id AND event_type = 'view' AND created_at > NOW() - (p_days || ' days')::interval
                GROUP BY device_type
            ) d
        )
    ) INTO result
    FROM form_analytics
    WHERE form_id = p_form_id AND created_at > NOW() - (p_days || ' days')::interval;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_form_analytics_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_analytics_summary(UUID, INTEGER) TO anon;
