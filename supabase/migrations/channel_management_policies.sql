-- Migration file: supabase/migrations/20250403_channel_management_policies.sql

-- Drop existing channel policies
DROP POLICY IF EXISTS "Anyone can view channels" ON public.channels;
DROP POLICY IF EXISTS "Server owners can manage channels" ON public.channels;

-- Create updated policies for channels

-- Allow viewing channels for server members
CREATE POLICY "Members can view channels" 
ON public.channels FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_members.server_id = channels.server_id
    AND server_members.user_id = auth.uid()
  )
);

-- Allow server owners to manage channels (insert, update, delete)
CREATE POLICY "Server owners can manage channels" 
ON public.channels FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.servers 
    WHERE servers.id = channels.server_id 
    AND servers.owner_id = auth.uid()
  )
);

-- Allow server admins to also manage channels
CREATE POLICY "Server admins can manage channels" 
ON public.channels FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_members.server_id = channels.server_id 
    AND server_members.user_id = auth.uid()
    AND server_members.role = 'admin'
  )
);

-- Add a unique constraint to prevent duplicate channel names within a server
ALTER TABLE public.channels 
  ADD CONSTRAINT channels_server_id_name_unique UNIQUE (server_id, name);

-- Create an index for faster channel lookups by server
CREATE INDEX IF NOT EXISTS idx_channels_server_id ON public.channels (server_id);