-- Create table to track channel read status
CREATE TABLE IF NOT EXISTS public.channel_read_status (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

-- Enable RLS
ALTER TABLE public.channel_read_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own read status"
ON public.channel_read_status
FOR ALL
TO authenticated
USING (user_id = auth.uid());