-- Job Radar — Supabase schema for persistent application tracking.
--
-- To use:
-- 1. Create a free Supabase project at https://supabase.com
-- 2. Run this SQL in the Supabase SQL Editor
-- 3. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env
-- 4. The app will automatically sync localStorage <-> Supabase

create table if not exists applications (
  id            bigint generated always as identity primary key,
  job_key       text unique not null,      -- "Company::Role"
  status        text not null default 'applied',
  notes         text default '',
  applied_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- Index for fast lookups by job key
create index if not exists idx_applications_job_key on applications (job_key);

-- Index for filtering by status
create index if not exists idx_applications_status on applications (status);

-- Row-level security: enable for production use with auth
-- alter table applications enable row level security;
-- create policy "Users can manage own applications"
--   on applications for all
--   using (auth.uid() = user_id);

-- Optional: add user_id column if you want multi-user support
-- alter table applications add column user_id uuid references auth.users(id);
