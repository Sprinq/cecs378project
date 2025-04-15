-- Function to delete a server and all associated data
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
  
  -- Delete the server and all related data will cascade due to foreign key constraints
  DELETE FROM public.servers
  WHERE id = server_id
  AND owner_id = auth.uid();
  
  RETURN TRUE;
END;
$$;