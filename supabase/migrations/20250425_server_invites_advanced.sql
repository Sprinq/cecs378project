-- Migration file: supabase/migrations/20250425_server_invites_advanced.sql

-- Create a new table for server invites with advanced options
CREATE TABLE IF NOT EXISTS public.server_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  creator_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  hide_history BOOLEAN DEFAULT false,
  temporary_access BOOLEAN DEFAULT false,
  temporary_duration TEXT
);

-- Add new columns to server_members table to support the new invite options
ALTER TABLE public.server_members ADD COLUMN IF NOT EXISTS hide_history BOOLEAN DEFAULT false;
ALTER TABLE public.server_members ADD COLUMN IF NOT EXISTS temporary_access BOOLEAN DEFAULT false;
ALTER TABLE public.server_members ADD COLUMN IF NOT EXISTS temporary_duration TEXT;
ALTER TABLE public.server_members ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;

-- Update existing users to have hide_history set to false
UPDATE public.server_members SET hide_history = false WHERE hide_history IS NULL;

-- Create index for faster lookup of invite codes
CREATE INDEX IF NOT EXISTS idx_server_invites_code ON public.server_invites (code);

-- Create function to generate a new invite with advanced options
CREATE OR REPLACE FUNCTION generate_server_invite_with_options(
  server_id UUID,
  expires_in TEXT DEFAULT '7 days',
  hide_history BOOLEAN DEFAULT false,
  temporary_access BOOLEAN DEFAULT false,
  temporary_duration TEXT DEFAULT '24 hours',
  max_uses INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_invite_code TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- Check if the current user is the owner or admin of the server
  IF NOT EXISTS (
    SELECT 1 FROM public.server_members sm
    WHERE sm.server_id = $1
    AND sm.user_id = auth.uid()
    AND sm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only server owners and admins can generate invite codes';
  END IF;
  
  -- Generate a unique invite code
  new_invite_code := generate_random_code(8);
  
  -- Calculate expiration date
  expires_at := CURRENT_TIMESTAMP + expires_in::INTERVAL;
  
  -- Insert the new invite
  INSERT INTO public.server_invites (
    server_id,
    code,
    creator_id,
    expires_at,
    max_uses,
    hide_history,
    temporary_access,
    temporary_duration
  ) VALUES (
    $1,
    new_invite_code,
    auth.uid(),
    expires_at,
    max_uses,
    hide_history,
    temporary_access,
    temporary_duration
  );
  
  -- Also set the invite code in the servers table for backward compatibility
  UPDATE public.servers
  SET 
    invite_code = new_invite_code,
    invite_expires_at = expires_at
  WHERE id = $1;
  
  RETURN new_invite_code;
END;
$$;

-- Function to join a server using an invite code with advanced options
CREATE OR REPLACE FUNCTION join_server_by_invite_code(
  invite_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
  server_id UUID;
  already_member BOOLEAN;
  access_expires_at TIMESTAMPTZ;
BEGIN
  -- Find the invite by code
  SELECT 
    i.*, 
    s.id as server_id 
  INTO invite_record
  FROM public.server_invites i
  JOIN public.servers s ON i.server_id = s.id
  WHERE i.code = $1;
  
  -- If not found in server_invites, check the legacy invite system
  IF invite_record IS NULL THEN
    SELECT id, invite_expires_at INTO server_id, access_expires_at
    FROM public.servers
    WHERE invite_code = $1;
    
    IF server_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invite code';
    END IF;
    
    -- Check if the invite has expired
    IF access_expires_at IS NOT NULL AND access_expires_at < CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'Invite code has expired';
    END IF;
  ELSE
    -- Use data from the invite record
    server_id := invite_record.server_id;
    
    -- Check if the invite has expired
    IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'Invite code has expired';
    END IF;
    
    -- Check if the invite has reached max uses
    IF invite_record.max_uses IS NOT NULL AND invite_record.uses >= invite_record.max_uses THEN
      RAISE EXCEPTION 'Invite code has reached maximum uses';
    END IF;
    
    -- Calculate when temporary access expires, if applicable
    IF invite_record.temporary_access AND invite_record.temporary_duration IS NOT NULL THEN
      access_expires_at := CURRENT_TIMESTAMP + invite_record.temporary_duration::INTERVAL;
    END IF;
  END IF;
  
  -- Check if the user is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = server_id
    AND user_id = auth.uid()
  ) INTO already_member;
  
  IF already_member THEN
    -- If already a member, just return the server ID
    RETURN server_id;
  END IF;
  
  -- Add the user to the server with invite restrictions if applicable
  INSERT INTO public.server_members (
    server_id,
    user_id,
    role,
    hide_history,
    temporary_access,
    temporary_duration,
    access_expires_at
  ) VALUES (
    server_id,
    auth.uid(),
    'member',
    COALESCE(invite_record.hide_history, false),
    COALESCE(invite_record.temporary_access, false),
    invite_record.temporary_duration,
    access_expires_at
  );
  
  -- Increment the number of uses for the invite
  IF invite_record.id IS NOT NULL THEN
    UPDATE public.server_invites
    SET uses = uses + 1
    WHERE id = invite_record.id;
  END IF;
  
  RETURN server_id;
END;
$$;

-- Function to increment invite uses when using the manual join fallback
CREATE OR REPLACE FUNCTION increment_invite_uses(
  invite_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.server_invites
  SET uses = uses + 1
  WHERE code = $1;
  
  RETURN FOUND;
END;
$$;

-- Create a cron job function to remove temporary members
CREATE OR REPLACE FUNCTION remove_expired_temporary_members()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removed_count INTEGER;
BEGIN
  -- Delete members whose temporary access has expired
  DELETE FROM public.server_members
  WHERE temporary_access = true
    AND access_expires_at IS NOT NULL
    AND access_expires_at < CURRENT_TIMESTAMP
  RETURNING COUNT(*) INTO removed_count;
  
  RETURN removed_count;
END;
$$;

-- Set up RLS policies for the server_invites table
ALTER TABLE public.server_invites ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view server invites
CREATE POLICY "Anyone can view server invites" 
ON public.server_invites FOR SELECT 
TO authenticated 
USING (true);

-- Only server owners and admins can manage invites
CREATE POLICY "Owners and admins can manage server invites" 
ON public.server_invites FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM server_members 
    WHERE server_members.server_id = server_id 
    AND server_members.user_id = auth.uid()
    AND server_members.role IN ('owner', 'admin')
  )
);