/*
  # Add Test Data

  1. Changes
    - Insert test user with encrypted credentials
    - Create test server
    - Add test user as server member
    - Create default channels

  2. Security
    - Maintains existing RLS policies
    - Test user has same security constraints as regular users
*/

-- Insert test user (password: testpass123)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  'c9c0d8c1-5538-4d3b-8eef-7f12b10843ab',
  'test@example.com',
  '$2a$10$5RqbGnRQRFG7JqgzKgHqB.FG3p2D5E6xD5Ku1KJ1xGq2LX5LyEhGi',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Insert test server
INSERT INTO public.servers (
  id,
  name,
  description,
  owner_id,
  created_at
)
VALUES (
  'a1b2c3d4-e5f6-4321-8765-1a2b3c4d5e6f',
  'Test Server',
  'A server for testing purposes',
  'c9c0d8c1-5538-4d3b-8eef-7f12b10843ab',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Add test user as server member
INSERT INTO public.server_members (
  server_id,
  user_id,
  role,
  joined_at
)
VALUES (
  'a1b2c3d4-e5f6-4321-8765-1a2b3c4d5e6f',
  'c9c0d8c1-5538-4d3b-8eef-7f12b10843ab',
  'owner',
  now()
)
ON CONFLICT (server_id, user_id) DO NOTHING;

-- Create default channels
INSERT INTO public.channels (
  id,
  server_id,
  name,
  description,
  created_at
)
VALUES
  (
    'b2c3d4e5-f6a7-5432-8765-2b3c4d5e6f7a',
    'a1b2c3d4-e5f6-4321-8765-1a2b3c4d5e6f',
    'general',
    'General discussion channel',
    now()
  ),
  (
    'c3d4e5f6-a7b8-6543-8765-3c4d5e6f7a8b',
    'a1b2c3d4-e5f6-4321-8765-1a2b3c4d5e6f',
    'announcements',
    'Important announcements',
    now()
  )
ON CONFLICT (id) DO NOTHING;