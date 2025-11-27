-- Verify contacts.source column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' AND column_name = 'source';

-- Verify marketing_campaigns table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'marketing_campaigns'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'marketing_campaigns';
