-- Create login_users table
create table public.login_users (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  password text not null,
  created_at timestamp with time zone default now()
);

-- Insert test user
insert into public.login_users (username, password) values ('soossv', '000243');

-- Enable read access
alter table public.login_users enable row level security;
create policy "Enable read access for all users" on public.login_users for select using (true);
