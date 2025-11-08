# Create Test Users for RLS Testing

This SQL script creates the test users needed for RLS automated tests.

## Instructions

1. Go to: https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx
2. Navigate to: SQL Editor
3. Copy and paste this script
4. Click "Run"

## Script

```sql
-- Create test users for RLS testing
-- These users will be used in automated RLS test suite

-- Test Owner User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-owner@example.com',
  crypt('test-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Owner"}'
)
ON CONFLICT (email) DO NOTHING;

-- Test Member User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-member@example.com',
  crypt('test-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Member"}'
)
ON CONFLICT (email) DO NOTHING;

-- Test Non-Member User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-nonmember@example.com',
  crypt('test-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Non-Member"}'
)
ON CONFLICT (email) DO NOTHING;

-- Verify users were created
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email IN (
  'test-owner@example.com',
  'test-member@example.com',
  'test-nonmember@example.com'
)
ORDER BY email;
```

## Expected Output

You should see 3 users:
- test-owner@example.com (Test Owner)
- test-member@example.com (Test Member)
- test-nonmember@example.com (Test Non-Member)

All should have `email_confirmed_at` set to now().

## Cleanup

To remove test users after testing:

```sql
-- Delete test users
DELETE FROM auth.users
WHERE email IN (
  'test-owner@example.com',
  'test-member@example.com',
  'test-nonmember@example.com'
);
```

**Note**: This will also cascade delete their workspaces and associated data.
