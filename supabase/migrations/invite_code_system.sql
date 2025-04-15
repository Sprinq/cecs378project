-- Add invite code generation function
CREATE OR REPLACE FUNCTION generate_random_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add invite_expires_at column to servers table
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Function to generate a new server invite code
CREATE OR REPLACE FUNCTION generate_server_invite(
  server_id UUID,
  expires_in INTERVAL DEFAULT INTERVAL '7 days'
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
    SELECT 1 FROM public.server_members
    WHERE server_id = $1
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only server owners and admins can generate invite codes';
  END IF;
  
  -- Generate a unique invite code
  new_invite_code := generate_random_code(8);
  
  -- Calculate expiration date
  expires_at := CURRENT_TIMESTAMP + expires_in;
  
  -- Update the server with the new invite code
  UPDATE public.servers
  SET 
    invite_code = new_invite_code,
    invite_expires_at = expires_at
  WHERE id = server_id;
  
  RETURN new_invite_code;
END;
$$;

-- Function to join a server using an invite code
CREATE OR REPLACE FUNCTION join_server_by_invite(
  invite_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  server_record RECORD;
  already_member BOOLEAN;
BEGIN
  -- Find the server with this invite code
  SELECT id, invite_expires_at INTO server_record
  FROM public.servers
  WHERE invite_code = $1;
  
  -- Check if the server exists
  IF server_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  -- Check if the invite code has expired
  IF server_record.invite_expires_at IS NOT NULL AND server_record.invite_expires_at < CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'Invite code has expired';
  END IF;
  
  -- Check if the user is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = server_record.id
    AND user_id = auth.uid()
  ) INTO already_member;
  
  IF already_member THEN
    RAISE EXCEPTION 'You are already a member of this server';
  END IF;
  
  -- Add the user to the server
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (server_record.id, auth.uid(), 'member');
  
  RETURN server_record.id;
END;
$$;