-- Update iixiiartist profile to have proper display info
UPDATE profiles
SET 
  full_name = 'iixiiartist',
  updated_at = NOW()
WHERE email = 'iixiiartist@gmail.com'
  AND (full_name IS NULL OR full_name = '');

-- Verify the update
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record
  FROM profiles
  WHERE email = 'iixiiartist@gmail.com';
  
  IF FOUND THEN
    RAISE NOTICE 'Profile updated: email=%, full_name=%, id=%', 
      profile_record.email, 
      profile_record.full_name,
      profile_record.id;
  ELSE
    RAISE NOTICE 'Profile not found for iixiiartist@gmail.com';
  END IF;
END $$;

