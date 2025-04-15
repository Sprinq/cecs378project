ALTER TABLE public.users ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;
CREATE TABLE public.user_presence (
  user_id UUID REFERENCES public.users(id) PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);