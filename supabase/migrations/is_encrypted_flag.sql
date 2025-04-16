-- Add is_encrypted flag to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Add is_encrypted flag to direct_messages table
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;