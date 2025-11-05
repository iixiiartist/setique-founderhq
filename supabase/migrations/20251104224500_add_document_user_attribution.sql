-- Add user attribution to documents table
-- This enables tracking who uploaded each file
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT;

-- Create index for efficient filtering by uploader
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Add comment for documentation
COMMENT ON COLUMN documents.uploaded_by IS 'User ID of the team member who uploaded this document';
COMMENT ON COLUMN documents.uploaded_by_name IS 'Display name of the uploader (denormalized for performance)';
