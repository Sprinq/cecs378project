-- Make display_name unique in users table
ALTER TABLE public.users ADD CONSTRAINT users_display_name_unique UNIQUE (display_name);

-- Add index for faster lookups by display name
CREATE INDEX IF NOT EXISTS idx_users_display_name ON public.users (display_name);