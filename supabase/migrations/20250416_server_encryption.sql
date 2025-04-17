-- Migration file: supabase/migrations/20250416_server_encryption.sql

-- Create table for storing encrypted keys
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  key_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index on entity_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_encryption_keys_entity_id ON public.encryption_keys (entity_id);

-- Enable RLS
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for encryption_keys
CREATE POLICY "Authenticated users can read encryption keys" 
ON public.encryption_keys FOR SELECT 
TO authenticated 
USING (true);

-- Only service role can insert/update/delete encryption keys
CREATE POLICY "Service role can manage encryption keys" 
ON public.encryption_keys FOR ALL 
TO service_role 
USING (true);

-- Create function to rotate encryption keys
CREATE OR REPLACE FUNCTION rotate_encryption_key(
  entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_key TEXT;
  new_key TEXT;
BEGIN
  -- Generate a new random key
  new_key := encode(gen_random_bytes(32), 'base64');
  
  -- Get the old key
  SELECT key_value INTO old_key
  FROM public.encryption_keys
  WHERE encryption_keys.entity_id = $1;
  
  -- Store the new key
  UPDATE public.encryption_keys
  SET 
    key_value = new_key,
    updated_at = now()
  WHERE encryption_keys.entity_id = $1;
  
  -- If no key existed, insert a new one
  IF NOT FOUND THEN
    INSERT INTO public.encryption_keys (entity_id, entity_type, key_value)
    VALUES ($1, 'auto', new_key);
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Update messages and direct_messages tables to add encryption_version column
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Add encryption_enabled flag to channels table
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT true;