-- Fix workspace_invitations table
-- Run this in Supabase Dashboard → SQL Editor

-- Drop the existing table if it exists (it should be empty anyway)
DROP TABLE IF EXISTS workspace_invitations CASCADE;

-- Recreate with proper defaults
CREATE TABLE workspace_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role workspace_role DEFAULT 'member',
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "workspace_members_can_view_invitations" ON workspace_invitations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspace_invitations.workspace_id AND user_id = auth.uid()));

CREATE POLICY "owners_can_manage_invitations" ON workspace_invitations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_invitations.workspace_id AND owner_id = auth.uid()));

SELECT 'Invitations table fixed! Token generation added.' as status;
