-- Phase 5 (§16) — extensions and shared helper trigger.
-- One trigger function, applied to every table with created_at/updated_at (§6).

create extension if not exists "uuid-ossp";
create extension if not exists citext;
create extension if not exists pg_trgm; -- helps ILIKE-style admin search fall back gracefully

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Shared updated_at trigger (§6): applied to every table with created_at/updated_at.';
