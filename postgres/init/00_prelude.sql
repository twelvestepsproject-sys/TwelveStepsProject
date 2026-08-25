-- Runs BEFORE the existing supabase/migrations/*.sql files.
--
-- Those migrations were written against Supabase and reference two schemas
-- it provides but plain Postgres does not: `auth` (users + auth.uid()) and
-- `storage` (buckets + objects). Rather than fork all 27 migrations — which
-- would leave two diverging copies of the schema to keep in sync — this
-- prelude creates just enough of those schemas that the originals run
-- unchanged.
--
-- What it deliberately does NOT do: reimplement Supabase Auth. Password
-- hashing and sessions live in the application (see lib/auth/), and
-- `auth.users` here is a plain table the app owns.

-- The migrations create these too, but the prelude runs first and uses
-- citext for auth.users.email, so they have to exist by now. Both files
-- use IF NOT EXISTS, so neither fights the other.
create extension if not exists "uuid-ossp";
create extension if not exists citext;
create extension if not exists pg_trgm;

create schema if not exists auth;
create schema if not exists storage;

-- ---------------------------------------------------------------------
-- auth.users — the app's own user table.
--
-- Kept in the `auth` schema, under the name the migrations already
-- reference, so `references auth.users (id)` in migrations 3 and 10 keeps
-- working. Supabase stored far more here; these are the columns this
-- project actually uses.
-- ---------------------------------------------------------------------
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  -- bcrypt hash. Never a plaintext password, and never sent to the client.
  encrypted_password text not null,
  -- Migration 10 installs a trigger that reads this to seed public.profiles
  -- on user creation. Kept so that migration applies and behaves unchanged.
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- auth.uid() — the current request's user id.
--
-- Supabase derives this from the request JWT. Here it reads a session
-- variable the connection sets per request, so any RLS policy that calls
-- it keeps parsing and running.
--
-- IMPORTANT: authorization for this project is enforced in the server
-- layer (lib/queries/postgres/), not by RLS — that was the explicit
-- decision, since the database is never exposed to the internet. This
-- function exists so the 61 inherited policies remain valid SQL, not
-- because they are the security boundary. It returns NULL when unset,
-- which makes those policies deny rather than allow.
-- ---------------------------------------------------------------------
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.current_role', true), ''), 'anon');
$$;

-- ---------------------------------------------------------------------
-- storage.buckets / storage.objects
--
-- Files live on disk (see lib/storage/), not in Postgres. These tables
-- exist only so migration 13's inserts and policies apply cleanly; the
-- application does not read from them.
-- ---------------------------------------------------------------------
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id) on delete cascade,
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
