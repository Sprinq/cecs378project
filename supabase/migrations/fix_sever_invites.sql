-- Drop the existing function
DROP FUNCTION IF EXISTS generate_server_invite;

-- Create a corrected version with explicit table references
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
  -- Explicitly reference the server_id parameter with sm.server_id
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
  expires_at := CURRENT_TIMESTAMP + expires_in;
  
  -- Update the server with the new invite code
  -- Explicitly reference the server_id parameter
  UPDATE public.servers
  SET 
    invite_code = new_invite_code,
    invite_expires_at = expires_at
  WHERE id = $1;
  
  RETURN new_invite_code;
END;
$$;