-- Create a migration file: supabase/migrations/create_dm_read_status.sql
CREATE TABLE IF NOT EXISTS public.dm_read_status (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

-- Enable RLS
ALTER TABLE public.dm_read_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own read status"
ON public.dm_read_status
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Create an index for faster lookups
CREATE INDEX idx_dm_read_status_user_message ON public.dm_read_status(user_id, message_id);