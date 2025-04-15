-- Drop the existing function
DROP FUNCTION IF EXISTS join_server_by_invite;

-- Create a corrected version with better error handling
CREATE OR REPLACE FUNCTION join_server_by_invite(
  invite_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_server_id UUID;
  invite_expires_at TIMESTAMPTZ;
  already_member BOOLEAN;
BEGIN
  -- Find the server with this invite code
  SELECT id, invite_expires_at INTO target_server_id, invite_expires_at
  FROM public.servers
  WHERE invite_code = $1;
  
  -- Check if the server exists
  IF target_server_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  -- Check if the invite code has expired
  IF invite_expires_at IS NOT NULL AND invite_expires_at < CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'Invite code has expired';
  END IF;
  
  -- Check if the user is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = target_server_id
    AND user_id = auth.uid()
  ) INTO already_member;
  
  IF already_member THEN
    -- If already a member, just return the server ID instead of raising an exception
    RETURN target_server_id;
  END IF;
  
  -- Add the user to the server
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (target_server_id, auth.uid(), 'member');
  
  RETURN target_server_id;
END;
$$;