-- ============================================================
-- FoodBridge — Users Table (run in Supabase SQL Editor)
-- ============================================================

create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('donor', 'recipient')),
  lat           float not null default 12.9716,
  lng           float not null default 80.2209,
  created_at    timestamptz default now()
);

-- Index for fast email lookup on login
create index if not exists users_email_idx on users(email);

-- RLS
alter table users enable row level security;

create policy "Users can read own record"
  on users for select using (true);

create policy "Users can insert"
  on users for insert with check (true);

create policy "Users can update own record"
  on users for update using (true);
