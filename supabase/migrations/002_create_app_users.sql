-- Create app_users table in public schema
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add policy for public read (for login)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for login" ON public.app_users
  FOR SELECT USING (true);

-- Insert test user
INSERT INTO public.app_users (handle, email, password_hash, name)
VALUES ('soossv', 'soossv@nopact.local', '000243', 'SOOSSV')
ON CONFLICT (handle) DO UPDATE
  SET password_hash = '000243';
