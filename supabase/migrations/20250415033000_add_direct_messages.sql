-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.users ON DELETE CASCADE,
  receiver_id uuid REFERENCES public.users ON DELETE CASCADE,
  encrypted_content text NOT NULL,
  iv text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for direct_messages
CREATE POLICY "Users can read their own messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can send messages" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.direct_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Add mark message as read function
CREATE OR REPLACE FUNCTION mark_message_as_read(message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_receiver_id uuid;
BEGIN
  -- Get the receiver_id of the message
  SELECT receiver_id INTO message_receiver_id
  FROM public.direct_messages
  WHERE id = message_id;
  
  -- Check if the current user is the receiver
  IF message_receiver_id = auth.uid() THEN
    -- Mark the message as read
    UPDATE public.direct_messages
    SET read = true
    WHERE id = message_id;
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;