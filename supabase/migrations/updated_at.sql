-- Migration to add updated_at column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Update existing rows to set updated_at to created_at
UPDATE public.messages 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();