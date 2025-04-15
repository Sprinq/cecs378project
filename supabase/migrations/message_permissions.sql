-- Make sure RLS is enabled on the messages table
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on messages table
DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can manage their own messages" ON public.messages;

-- Create new policies for messages
-- Allow users to insert messages
CREATE POLICY "Users can insert messages" 
ON public.messages FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view all messages
CREATE POLICY "Users can view all messages" 
ON public.messages FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to update and delete their own messages
CREATE POLICY "Users can update their own messages" 
ON public.messages FOR UPDATE 
TO authenticated 
USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" 
ON public.messages FOR DELETE 
TO authenticated 
USING (sender_id = auth.uid());