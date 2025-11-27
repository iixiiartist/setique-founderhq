-- Fix for "record new has no field content" error in gtm_docs table
-- This error occurs because a database trigger is trying to access a 'content' column that doesn't exist.
-- This likely happened due to a schema migration where 'content' was renamed to 'content_json'/'content_plain'
-- but the search indexing trigger wasn't updated.

-- 1. Add the missing 'content' column as a generated column or just a nullable column to satisfy the trigger
ALTER TABLE gtm_docs ADD COLUMN IF NOT EXISTS content TEXT;

-- 2. (Optional) If you want to clean up the trigger, you can find it with:
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'gtm_docs';
-- AND then DROP TRIGGER ... ON gtm_docs;

-- 3. Verify the fix
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gtm_docs' 
AND column_name = 'content';
