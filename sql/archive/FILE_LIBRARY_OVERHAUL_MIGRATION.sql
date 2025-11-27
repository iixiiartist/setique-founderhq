-- FILE LIBRARY OVERHAUL - Database Migration
-- Run this in Supabase Dashboard → SQL Editor
-- This adds new columns for the enhanced file library features

-- Add new columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS link_task_id UUID,
ADD COLUMN IF NOT EXISTS link_deal_id UUID,
ADD COLUMN IF NOT EXISTS link_event_id UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_is_starred ON documents(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_last_accessed ON documents(last_accessed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_documents_link_task ON documents(link_task_id) WHERE link_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_link_deal ON documents(link_deal_id) WHERE link_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_link_event ON documents(link_event_id) WHERE link_event_id IS NOT NULL;

-- Create document_activity table for activity feed
CREATE TABLE IF NOT EXISTS document_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL, -- 'uploaded', 'downloaded', 'shared', 'renamed', 'tagged', 'starred', 'linked', 'viewed'
    details JSONB, -- Additional context for the action
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_activity_document ON document_activity(document_id);
CREATE INDEX IF NOT EXISTS idx_document_activity_workspace ON document_activity(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_activity_created ON document_activity(created_at DESC);

-- Enable RLS on document_activity
ALTER TABLE document_activity ENABLE ROW LEVEL SECURITY;

-- RLS policy for document_activity (read)
CREATE POLICY "Users can view document activity in their workspace"
ON document_activity FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- RLS policy for document_activity (insert)
CREATE POLICY "Users can create document activity in their workspace"
ON document_activity FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- Create a function to log document activity
CREATE OR REPLACE FUNCTION log_document_activity(
    p_document_id UUID,
    p_workspace_id UUID,
    p_user_id UUID,
    p_user_name TEXT,
    p_action TEXT,
    p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO document_activity (document_id, workspace_id, user_id, user_name, action, details)
    VALUES (p_document_id, p_workspace_id, p_user_id, p_user_name, p_action, p_details);
END;
$$;

-- Verify migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('is_starred', 'tags', 'description', 'last_accessed_at', 'view_count', 'file_size', 'link_task_id', 'link_deal_id', 'link_event_id');

SELECT 'Migration completed successfully!' AS status;
