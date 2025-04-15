-- Drop the problematic policies
DROP POLICY IF EXISTS "Server members can read server data" ON public.servers;
DROP POLICY IF EXISTS "Users can read server members" ON public.server_members;

-- Create better policies that avoid circular dependencies
-- Allow any authenticated user to see servers they're a member of
CREATE POLICY "Users can view servers they're members of" ON public.servers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members
      WHERE server_members.server_id = id
      AND server_members.user_id = auth.uid()
    )
  );

-- Allow any authenticated user to see all servers (for browsing/joining)
CREATE POLICY "Users can see all servers" ON public.servers
  FOR SELECT TO authenticated
  USING (true);

-- Allow server members to view other members in the same server
CREATE POLICY "Members can view other members in same server" ON public.server_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members AS my_membership
      WHERE my_membership.server_id = server_members.server_id
      AND my_membership.user_id = auth.uid()
    )
  );

-- Allow anyone to see which servers they're members of
CREATE POLICY "Users can see their own memberships" ON public.server_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());