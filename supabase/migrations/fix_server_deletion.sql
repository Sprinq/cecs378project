-- Drop the existing function first
DROP FUNCTION IF EXISTS delete_server(UUID);

-- Create improved delete_server function
CREATE OR REPLACE FUNCTION delete_server(
  server_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  -- Check if the current user is the owner of the server
  SELECT EXISTS (
    SELECT 1 FROM public.servers
    WHERE id = server_id
    AND owner_id = auth.uid()
  ) INTO is_owner;
  
  -- Only allow server owners to delete servers
  IF NOT is_owner THEN
    RAISE EXCEPTION 'Only the server owner can delete a server';
  END IF;
  
  -- First, delete all dependent data explicitly to avoid constraint issues
  
  -- Delete messages from channels in this server
  DELETE FROM public.messages 
  WHERE channel_id IN (
    SELECT id FROM public.channels WHERE server_id = server_id
  );
  
  -- Delete channels
  DELETE FROM public.channels
  WHERE server_id = server_id;
  
  -- Delete server members
  DELETE FROM public.server_members
  WHERE server_id = server_id;
  
  -- Delete server invites
  DELETE FROM public.server_invites
  WHERE server_id = server_id;
  
  -- Finally, delete the server itself
  DELETE FROM public.servers
  WHERE id = server_id
  AND owner_id = auth.uid();
  
  -- Return true if the server was deleted
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_server(UUID) TO authenticated;