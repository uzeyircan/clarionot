-- Run this in Supabase SQL Editor to enable device push notifications.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  forgotten_days integer not null default 30,
  theme_accent text not null default 'mint',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.user_settings
  drop column if exists push_enabled;

alter table if exists public.user_settings
  add column if not exists push_frequency text not null default 'daily';

alter table if exists public.user_settings
  add column if not exists push_last_sent_at timestamptz;

alter table if exists public.user_settings
  add column if not exists timezone text;

alter table if exists public.user_settings
  add column if not exists push_quiet_hours_start smallint;

alter table if exists public.user_settings
  add column if not exists push_quiet_hours_end smallint;

alter table if exists public.user_settings
  add column if not exists push_max_per_day smallint not null default 1;

alter table if exists public.user_settings
  drop constraint if exists user_settings_push_frequency_check;

alter table if exists public.user_settings
  add constraint user_settings_push_frequency_check
  check (push_frequency in ('daily', 'weekly'));

alter table if exists public.user_settings
  drop constraint if exists user_settings_push_quiet_hours_start_check;

alter table if exists public.user_settings
  add constraint user_settings_push_quiet_hours_start_check
  check (
    push_quiet_hours_start is null or
    (push_quiet_hours_start >= 0 and push_quiet_hours_start <= 23)
  );

alter table if exists public.user_settings
  drop constraint if exists user_settings_push_quiet_hours_end_check;

alter table if exists public.user_settings
  add constraint user_settings_push_quiet_hours_end_check
  check (
    push_quiet_hours_end is null or
    (push_quiet_hours_end >= 0 and push_quiet_hours_end <= 23)
  );

alter table if exists public.user_settings
  drop constraint if exists user_settings_push_max_per_day_check;

alter table if exists public.user_settings
  add constraint user_settings_push_max_per_day_check
  check (push_max_per_day between 1 and 3);

create table if not exists public.device_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'web',
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_push_subscriptions_platform_check
    check (platform in ('web', 'ios', 'android'))
);

alter table public.device_push_subscriptions enable row level security;

drop policy if exists "device_push_subscriptions_select_own" on public.device_push_subscriptions;
create policy "device_push_subscriptions_select_own"
  on public.device_push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "device_push_subscriptions_insert_own" on public.device_push_subscriptions;
create policy "device_push_subscriptions_insert_own"
  on public.device_push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "device_push_subscriptions_update_own" on public.device_push_subscriptions;
create policy "device_push_subscriptions_update_own"
  on public.device_push_subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "device_push_subscriptions_delete_own" on public.device_push_subscriptions;
create policy "device_push_subscriptions_delete_own"
  on public.device_push_subscriptions
  for delete using (auth.uid() = user_id);

create index if not exists device_push_subscriptions_user_idx
  on public.device_push_subscriptions (user_id, platform, revoked_at);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  channel text not null default 'web_push',
  kind text not null default 'forgotten_item',
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint notification_log_channel_check
    check (channel in ('web_push', 'mobile_push', 'email')),
  constraint notification_log_kind_check
    check (kind in ('forgotten_item', 'test')),
  constraint notification_log_status_check
    check (status in ('sent', 'failed', 'clicked', 'dismissed'))
);

alter table public.notification_log enable row level security;

drop policy if exists "notification_log_select_own" on public.notification_log;
create policy "notification_log_select_own"
  on public.notification_log
  for select using (auth.uid() = user_id);

drop policy if exists "notification_log_insert_own" on public.notification_log;
create policy "notification_log_insert_own"
  on public.notification_log
  for insert with check (auth.uid() = user_id);

create index if not exists notification_log_user_kind_idx
  on public.notification_log (user_id, kind, sent_at desc);
