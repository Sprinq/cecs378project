/*
  # SecureChat Database Schema

  1. New Tables
    - users
      - Extended user profile information
    - servers
      - Chat servers that users can join
    - server_members
      - Members of each server
    - channels
      - Text channels within servers
    - messages
      - Encrypted messages
    - friend_requests
      - Pending friend requests
    - friends
      - Confirmed friendships
    - user_keys
      - Public keys for E2E encryption

  2. Security
    - RLS policies for all tables
    - Encrypted message storage
    - User authentication required
*/

-- Create custom types
CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'blocked');

-- Create tables
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_keys (
  user_id uuid REFERENCES public.users ON DELETE CASCADE,
  public_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public.servers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  owner_id uuid REFERENCES public.users NOT NULL,
  icon_url text,
  invite_code text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.server_members (
  server_id uuid REFERENCES public.servers ON DELETE CASCADE,
  user_id uuid REFERENCES public.users ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.channels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id uuid REFERENCES public.servers ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid REFERENCES public.channels ON DELETE CASCADE,
  sender_id uuid REFERENCES public.users ON DELETE CASCADE,
  encrypted_content text NOT NULL,
  iv text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friends (
  user_id1 uuid REFERENCES public.users ON DELETE CASCADE,
  user_id2 uuid REFERENCES public.users ON DELETE CASCADE,
  status friend_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id1, user_id2)
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public keys are readable by all authenticated users" ON public.user_keys
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own keys" ON public.user_keys
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Server members can read server data" ON public.servers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_members.server_id = servers.id
    AND server_members.user_id = auth.uid()
  ));

CREATE POLICY "Server owners can manage their servers" ON public.servers
  FOR ALL TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can read server members" ON public.server_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.server_members sm
    WHERE sm.server_id = server_members.server_id
    AND sm.user_id = auth.uid()
  ));

CREATE POLICY "Users can read channel data" ON public.channels
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_members.server_id = channels.server_id
    AND server_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.channels c
    JOIN public.server_members sm ON c.server_id = sm.server_id
    WHERE c.id = messages.channel_id
    AND sm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own messages" ON public.messages
  FOR ALL TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can manage their friends" ON public.friends
  FOR ALL TO authenticated
  USING (auth.uid() IN (user_id1, user_id2));

-- Create functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();