-- Remove the has_encrypted_messages column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS has_encrypted_messages;
