-- DROP ALL EXISTING POLICIES
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Public keys are readable by all authenticated users" ON public.user_keys;
DROP POLICY IF EXISTS "Users can manage their own keys" ON public.user_keys;
DROP POLICY IF EXISTS "Server members can read server data" ON public.servers;
DROP POLICY IF EXISTS "Server owners can manage their servers" ON public.servers;
DROP POLICY IF EXISTS "Users can read server members" ON public.server_members;
DROP POLICY IF EXISTS "Users can read channel data" ON public.channels;
DROP POLICY IF EXISTS "Users can read messages" ON public.messages;
DROP POLICY IF EXISTS "Users can manage their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can manage their friends" ON public.friends;
DROP POLICY IF EXISTS "Users can view servers they're members of" ON public.servers;
DROP POLICY IF EXISTS "Users can see all servers" ON public.servers;
DROP POLICY IF EXISTS "Members can view other members in same server" ON public.server_members;
DROP POLICY IF EXISTS "Users can see their own memberships" ON public.server_members;

-- CREATE SIMPLIFIED POLICIES

-- USERS POLICIES
CREATE POLICY "Users can view all users" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can update their own data" 
ON public.users FOR UPDATE 
TO authenticated 
USING (id = auth.uid());

-- USER KEYS POLICIES
CREATE POLICY "Users can view all public keys" 
ON public.user_keys FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can manage their own keys" 
ON public.user_keys FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

-- SERVERS POLICIES
CREATE POLICY "Anyone can view servers" 
ON public.servers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Owners can manage servers" 
ON public.servers FOR ALL 
TO authenticated 
USING (owner_id = auth.uid());

-- SERVER MEMBERS POLICIES
CREATE POLICY "Anyone can view server members" 
ON public.server_members FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Owners can manage server members" 
ON public.server_members FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM servers 
    WHERE servers.id = server_id 
    AND servers.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can join/leave servers" 
ON public.server_members FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

-- CHANNEL POLICIES
CREATE POLICY "Anyone can view channels" 
ON public.channels FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Server owners can manage channels" 
ON public.channels FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM servers 
    WHERE servers.id = server_id 
    AND servers.owner_id = auth.uid()
  )
);

-- MESSAGES POLICIES
CREATE POLICY "Anyone can view messages" 
ON public.messages FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can manage their own messages" 
ON public.messages FOR ALL 
TO authenticated 
USING (sender_id = auth.uid());

-- FRIENDS POLICIES
CREATE POLICY "Users can manage their friends" 
ON public.friends FOR ALL 
TO authenticated 
USING (auth.uid() IN (user_id1, user_id2));