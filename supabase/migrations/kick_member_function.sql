-- Drop the existing function first
DROP FUNCTION IF EXISTS kick_server_member(uuid, uuid);

-- Create the fixed function with the same name but explicit parameter names
CREATE OR REPLACE FUNCTION kick_server_member(
  server_id UUID,
  member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_authorized BOOLEAN;
  is_owner BOOLEAN;
  target_is_owner BOOLEAN;
  target_role TEXT;
BEGIN
  -- Check if the current user is the owner or admin of the server
  SELECT EXISTS (
    SELECT 1 FROM public.server_members sm
    WHERE sm.server_id = $1  -- Using positional parameters instead of names
    AND sm.user_id = auth.uid()
    AND sm.role IN ('owner', 'admin')
  ) INTO is_authorized;
  
  -- Check if the current user is the server owner
  SELECT EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id = $1  -- Using positional parameters instead of names
    AND s.owner_id = auth.uid()
  ) INTO is_owner;
  
  -- Get the target member's role
  SELECT sm.role INTO target_role
  FROM public.server_members sm
  WHERE sm.server_id = $1  -- Using positional parameters instead of names
  AND sm.user_id = $2;
  
  -- Check if target is the owner (by role or by servers.owner_id)
  SELECT EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id = $1  -- Using positional parameters instead of names
    AND s.owner_id = $2
  ) INTO target_is_owner;
  
  -- Enforce permissions
  -- 1. User must be authorized (owner or admin)
  IF NOT is_authorized THEN
    RAISE EXCEPTION 'You must be a server owner or admin to kick members';
  END IF;
  
  -- 2. Cannot kick server owner
  IF target_is_owner OR target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot kick the server owner';
  END IF;
  
  -- 3. Admins cannot kick other admins (only owners can)
  IF target_role = 'admin' AND NOT is_owner THEN
    RAISE EXCEPTION 'Only server owners can kick admins';
  END IF;
  
  -- 4. Users cannot kick themselves
  IF auth.uid() = $2 THEN
    RAISE EXCEPTION 'You cannot kick yourself from the server';
  END IF;
  
  -- All checks passed, proceed with kicking the member
  DELETE FROM public.server_members sm
  WHERE sm.server_id = $1  -- Using positional parameters instead of names
  AND sm.user_id = $2;
  
  RETURN FOUND;
END;
$$;