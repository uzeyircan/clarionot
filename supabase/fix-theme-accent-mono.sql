-- Run this once in Supabase SQL Editor.
-- It updates the existing theme_accent check constraint to allow "mono".

alter table if exists public.user_settings
  drop constraint if exists user_settings_theme_accent_check;

alter table if exists public.user_settings
  add constraint user_settings_theme_accent_check
  check (theme_accent in ('mint', 'teal', 'violet', 'rose', 'amber', 'mono'));
