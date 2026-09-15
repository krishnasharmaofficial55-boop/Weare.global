-- ====================================================================
-- WE ARE. — Signup / Profile foundation
-- ====================================================================
-- Run this once in your Supabase project's SQL editor
-- (Dashboard → SQL Editor → New query), or via the Supabase CLI:
--   supabase db push
--
-- Prerequisite: Email/Password sign-in must be enabled under
-- Dashboard → Authentication → Providers → Email.
--
-- This file only builds the foundation signup.html needs:
--   - public.profiles (with RLS)
--   - an auth.users → public.profiles trigger
--   - the "avatars" storage bucket (with RLS)
-- It intentionally does NOT create tables for posts, feed, messages,
-- communities, etc. — those belong to their own future migrations.
-- ====================================================================


-- --------------------------------------------------------------------
-- 0. Extensions
-- --------------------------------------------------------------------
-- citext gives us a text type that compares/indexes case-insensitively,
-- which is what "case-insensitive unique username" needs.
create extension if not exists citext;


-- --------------------------------------------------------------------
-- 1. public.profiles
-- --------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  username      citext not null,
  bio           text,
  avatar_url    text,
  date_of_birth date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint username_length check (char_length(username::text) between 3 and 30),
  constraint username_format check (username::text ~ '^[A-Za-z0-9_]+$')
);

comment on table public.profiles is
  'Public-facing profile data for each WE ARE. user. One row per auth.users row, created automatically by the on_auth_user_created trigger below.';

-- Case-insensitive uniqueness: "Jordan" and "jordan" are the same username.
-- (citext columns already compare case-insensitively; this index also
-- gives Postgres an efficient uniqueness check and lookup path.)
create unique index if not exists profiles_username_key
  on public.profiles (username);

-- Keep updated_at accurate on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();


-- --------------------------------------------------------------------
-- 2. Row Level Security on public.profiles
-- --------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Read: profile discovery (Explore, Communities, search) is part of
-- the product, so basic profile fields are publicly readable.
-- If you'd rather profiles be visible only to signed-in users, change
-- `using (true)` to `using (auth.uid() is not null)`.
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

-- Insert: a user may only ever create the profile row matching their
-- own auth.uid(). (In normal use this happens via the trigger below,
-- not directly from the frontend — this policy exists as a safety net,
-- not as the primary creation path.)
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Update: a user may only update their own row. Deliberately NOT
-- `using (true)` — that would let any signed-in user edit anyone's
-- profile.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Delete: a user may only delete their own row.
drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles
  for delete
  using (auth.uid() = id);


-- --------------------------------------------------------------------
-- 3. Automatic profile creation
-- --------------------------------------------------------------------
-- SECURITY DEFINER lets this function write to public.profiles even
-- though it runs in response to an insert on the protected auth.users
-- table. It is not exposed as an RPC and cannot be called directly
-- from the frontend — Postgres only ever invokes it via the trigger
-- immediately below.
--
-- full_name/username arrive via raw_user_meta_data, which signup.js
-- sets through the `options.data` field of supabase.auth.signUp().
--
-- Username collisions: if the chosen username is taken (e.g. a race
-- between two people signing up with the same name at once), this
-- retries with a random numeric suffix rather than failing the whole
-- signup outright.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username   citext;
  final_username  citext;
  attempt         int := 0;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    'user_' || substr(new.id::text, 1, 8)
  );
  final_username := base_username;

  loop
    begin
      insert into public.profiles (id, full_name, username)
      values (
        new.id,
        coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'New member'),
        final_username
      );
      exit; -- insert succeeded, we're done
    exception
      when unique_violation then
        attempt := attempt + 1;
        -- Safety valve: extremely unlikely to ever be reached, but
        -- prevents an infinite loop if something truly pathological
        -- happens with the username sequence.
        exit when attempt > 20;
        final_username := base_username || '_' || floor(random() * 10000)::int;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- --------------------------------------------------------------------
-- 4. Avatar storage bucket
-- --------------------------------------------------------------------
-- Path convention enforced by the policies below: avatars/{user_id}/filename
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can view avatars (they're public profile images).
drop policy if exists "Avatar images are publicly viewable" on storage.objects;
create policy "Avatar images are publicly viewable"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- A user may only upload into their own folder.
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- A user may only update files inside their own folder.
drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- A user may only delete files inside their own folder.
drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ====================================================================
-- End of signup / profile foundation.
-- ====================================================================
