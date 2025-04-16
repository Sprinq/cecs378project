-- Add migration tracking column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_encrypted_messages BOOLEAN DEFAULT false;