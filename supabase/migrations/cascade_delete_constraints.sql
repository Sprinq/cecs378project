-- Drop existing foreign key constraints and add CASCADE DELETE

-- For messages table
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_channel_id_fkey,
  ADD CONSTRAINT messages_channel_id_fkey 
    FOREIGN KEY (channel_id) 
    REFERENCES public.channels(id) 
    ON DELETE CASCADE;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
  ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- For channels table
ALTER TABLE public.channels
  DROP CONSTRAINT IF EXISTS channels_server_id_fkey,
  ADD CONSTRAINT channels_server_id_fkey 
    FOREIGN KEY (server_id) 
    REFERENCES public.servers(id) 
    ON DELETE CASCADE;

-- For server_members table
ALTER TABLE public.server_members
  DROP CONSTRAINT IF EXISTS server_members_server_id_fkey,
  ADD CONSTRAINT server_members_server_id_fkey 
    FOREIGN KEY (server_id) 
    REFERENCES public.servers(id) 
    ON DELETE CASCADE;

ALTER TABLE public.server_members
  DROP CONSTRAINT IF EXISTS server_members_user_id_fkey,
  ADD CONSTRAINT server_members_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- For server_invites table  
ALTER TABLE public.server_invites
  DROP CONSTRAINT IF EXISTS server_invites_server_id_fkey,
  ADD CONSTRAINT server_invites_server_id_fkey 
    FOREIGN KEY (server_id) 
    REFERENCES public.servers(id) 
    ON DELETE CASCADE;

ALTER TABLE public.server_invites
  DROP CONSTRAINT IF EXISTS server_invites_creator_id_fkey,
  ADD CONSTRAINT server_invites_creator_id_fkey 
    FOREIGN KEY (creator_id) 
    REFERENCES public.users(id) 
    ON DELETE SET NULL;

-- For direct_messages table
ALTER TABLE public.direct_messages
  DROP CONSTRAINT IF EXISTS direct_messages_sender_id_fkey,
  ADD CONSTRAINT direct_messages_sender_id_fkey 
    FOREIGN KEY (sender_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

ALTER TABLE public.direct_messages
  DROP CONSTRAINT IF EXISTS direct_messages_receiver_id_fkey,
  ADD CONSTRAINT direct_messages_receiver_id_fkey 
    FOREIGN KEY (receiver_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- For friends table
ALTER TABLE public.friends
  DROP CONSTRAINT IF EXISTS friends_user_id1_fkey,
  ADD CONSTRAINT friends_user_id1_fkey 
    FOREIGN KEY (user_id1) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

ALTER TABLE public.friends
  DROP CONSTRAINT IF EXISTS friends_user_id2_fkey,
  ADD CONSTRAINT friends_user_id2_fkey 
    FOREIGN KEY (user_id2) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;