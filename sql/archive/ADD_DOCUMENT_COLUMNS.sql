-- Run this in Supabase Dashboard → SQL Editor
-- This adds the uploaded_by tracking columns to documents table

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Verify it worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('uploaded_by', 'uploaded_by_name');
