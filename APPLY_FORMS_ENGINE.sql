-- ============================================================================
-- COMPLETE Forms Engine Setup
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing policies to avoid conflicts (ignore errors if they don't exist)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view forms in their workspace" ON forms;
    DROP POLICY IF EXISTS "Users can create forms in their workspace" ON forms;
    DROP POLICY IF EXISTS "Users can update forms in their workspace" ON forms;
    DROP POLICY IF EXISTS "Users can delete forms in their workspace" ON forms;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage form fields" ON form_fields;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view submissions in their workspace" ON form_submissions;
    DROP POLICY IF EXISTS "Anyone can submit to public forms" ON form_submissions;
    DROP POLICY IF EXISTS "Users can update submissions in their workspace" ON form_submissions;
    DROP POLICY IF EXISTS "Users can delete submissions in their workspace" ON form_submissions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view analytics in their workspace" ON form_analytics;
    DROP POLICY IF EXISTS "Anyone can track analytics for public forms" ON form_analytics;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

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
    default_campaign_id UUID,
    default_account_id UUID,
    auto_create_contact BOOLEAN DEFAULT false,
    
    -- Stats
    total_submissions INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Add missing columns if table already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'total_submissions') THEN
        ALTER TABLE forms ADD COLUMN total_submissions INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'default_account_id') THEN
        ALTER TABLE forms ADD COLUMN default_account_id UUID;
    END IF;
END $$;

-- Form fields table
CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    
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
    help_text TEXT,
    
    required BOOLEAN DEFAULT false,
    validation JSONB DEFAULT '{}'::jsonb,
    options JSONB DEFAULT '[]'::jsonb,
    conditional_logic JSONB DEFAULT NULL,
    
    page_number INTEGER DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    width TEXT DEFAULT 'full' CHECK (width IN ('full', 'half', 'third')),
    
    crm_field_mapping TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referrer TEXT,
    ip_address TEXT,
    user_agent TEXT,
    source_url TEXT,
    completion_time_seconds INTEGER,
    ip_hash TEXT,
    utm_params JSONB,
    
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    
    contact_id UUID,
    deal_id UUID,
    account_id UUID,
    campaign_id UUID,
    
    status TEXT DEFAULT 'completed' CHECK (status IN ('partial', 'completed', 'spam', 'deleted')),
    is_test BOOLEAN DEFAULT false,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form analytics table
CREATE TABLE IF NOT EXISTS form_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL CHECK (event_type IN (
        'view', 'start', 'field_focus', 'field_complete', 
        'page_change', 'submit', 'abandon', 'share', 'embed_load',
        'field_interaction'
    )),
    
    event_data JSONB DEFAULT '{}'::jsonb,
    field_id TEXT,
    metadata JSONB,
    
    session_id TEXT,
    source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    utm_params JSONB,
    
    device_type TEXT,
    browser TEXT,
    os TEXT,
    
    country TEXT,
    region TEXT,
    city TEXT,
    
    ip_hash TEXT,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_forms_workspace_id ON forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
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

CREATE POLICY "Anyone can submit to public forms" ON form_submissions
    FOR INSERT WITH CHECK (
        form_id IN (SELECT id FROM forms WHERE is_public = true AND status = 'published')
        OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
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

CREATE POLICY "Anyone can track analytics for public forms" ON form_analytics
    FOR INSERT WITH CHECK (
        form_id IN (SELECT id FROM forms WHERE is_public = true)
        OR form_id IN (
            SELECT id FROM forms WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_form_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    new_slug TEXT;
BEGIN
    base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
    base_slug := substring(base_slug from 1 for 50);
    new_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 8);
    NEW.slug := new_slug;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_form_slug ON forms;
CREATE TRIGGER trigger_generate_form_slug
    BEFORE INSERT ON forms
    FOR EACH ROW
    WHEN (NEW.slug IS NULL)
    EXECUTE FUNCTION generate_form_slug();

-- Function to increment form submissions
CREATE OR REPLACE FUNCTION increment_form_submissions(p_form_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE forms 
    SET total_submissions = COALESCE(total_submissions, 0) + 1,
        updated_at = NOW()
    WHERE id = p_form_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_form_submissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_form_submissions(UUID) TO anon;

-- Function to get form analytics summary
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
        END
    ) INTO result
    FROM form_analytics
    WHERE form_id = p_form_id AND created_at > NOW() - (p_days || ' days')::interval;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_form_analytics_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_analytics_summary(UUID, INTEGER) TO anon;

-- Success message
SELECT 'Forms Engine tables created successfully!' as status;
