-- Migration to add updated_at column to direct_messages table
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Update existing rows to set updated_at to created_at
UPDATE public.direct_messages 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create trigger to automatically update the updated_at column for direct_messages
DROP TRIGGER IF EXISTS update_direct_messages_updated_at ON public.direct_messages;
CREATE TRIGGER update_direct_messages_updated_at
    BEFORE UPDATE ON public.direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();