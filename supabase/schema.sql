-- clarionot schema (run in Supabase SQL Editor)

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('link','note')),
  title text not null default '',
  content text not null default '',
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.items enable row level security;

-- Policies: users can access only their own rows
create policy "items_select_own" on public.items
  for select using (auth.uid() = user_id);

create policy "items_insert_own" on public.items
  for insert with check (auth.uid() = user_id);

create policy "items_update_own" on public.items
  for update using (auth.uid() = user_id);

create policy "items_delete_own" on public.items
  for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists items_user_created_idx on public.items (user_id, created_at desc);
create index if not exists items_tags_gin_idx on public.items using gin (tags);
