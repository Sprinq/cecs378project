-- Migration file: supabase/migrations/20250502_fix_server_deletion_conflict.sql

-- Drop the existing function
DROP FUNCTION IF EXISTS delete_server(UUID);

-- Create a corrected delete_server function with proper parameter reference
CREATE OR REPLACE FUNCTION delete_server(
  p_server_id UUID
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
    WHERE id = p_server_id
    AND owner_id = auth.uid()
  ) INTO is_owner;
  
  -- Only allow server owners to delete servers
  IF NOT is_owner THEN
    RAISE EXCEPTION 'Only the server owner can delete a server';
  END IF;
  
  -- Delete the server and all related data will cascade due to foreign key constraints
  DELETE FROM public.servers
  WHERE id = p_server_id
  AND owner_id = auth.uid();
  
  -- Return true if the server was deleted
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_server(UUID) TO authenticated;