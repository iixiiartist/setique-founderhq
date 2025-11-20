-- Creates baseline Supabase auth users for automated tests.
-- Run this inside the Supabase SQL editor connected to your project.

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

-- Verify users exist
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'name' AS name
FROM auth.users
WHERE email IN (
  'test-owner@example.com',
  'test-member@example.com',
  'test-nonmember@example.com'
)
ORDER BY email;
