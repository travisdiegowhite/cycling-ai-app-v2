-- Create Demo Account for tribos.studio
-- Run this in Supabase SQL Editor to create the demo account

-- Demo credentials:
-- Email: demo@tribos.studio
-- Password: demo2024tribos

-- Insert demo user into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'demo@tribos.studio',
  crypt('demo2024tribos', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Demo User"}',
  false,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'demo@tribos.studio'
);

-- Verify the demo account was created
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'demo@tribos.studio';

-- Success message
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@tribos.studio') THEN
    RAISE NOTICE '✅ Demo account created successfully!';
    RAISE NOTICE 'Email: demo@tribos.studio';
    RAISE NOTICE 'Password: demo2024tribos';
  ELSE
    RAISE NOTICE '❌ Failed to create demo account';
  END IF;
END $$;
