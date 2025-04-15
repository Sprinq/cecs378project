-- Create a function to safely create a server with default channels
CREATE OR REPLACE FUNCTION create_server_with_channels(
  server_name TEXT,
  server_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_server_id UUID;
BEGIN
  -- Create the server
  INSERT INTO servers (name, description, owner_id)
  VALUES (server_name, server_description, auth.uid())
  RETURNING id INTO new_server_id;
  
  -- Add the current user as an owner
  INSERT INTO server_members (server_id, user_id, role)
  VALUES (new_server_id, auth.uid(), 'owner');
  
  -- Create default channels
  INSERT INTO channels (server_id, name, description)
  VALUES 
    (new_server_id, 'general', 'General discussion channel'),
    (new_server_id, 'welcome', 'Welcome new members');
    
  -- Return the new server ID
  RETURN new_server_id;
END;
$$;