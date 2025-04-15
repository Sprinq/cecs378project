-- Create a function to get all servers for a user (owned or member of)
CREATE OR REPLACE FUNCTION get_user_servers()
RETURNS SETOF servers
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Get servers the user owns
  SELECT s.* FROM servers s WHERE s.owner_id = auth.uid()
  UNION
  -- Get servers the user is a member of
  SELECT s.* FROM servers s
  JOIN server_members sm ON s.id = sm.server_id
  WHERE sm.user_id = auth.uid();
$$;