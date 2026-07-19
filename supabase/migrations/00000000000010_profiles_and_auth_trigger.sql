-- Phase 5 — profiles mirrors auth.users (§6, §7). Standard Supabase pattern:
-- a trigger on auth.users insert auto-creates the matching profiles row.
--
-- lib/schemas/admin.ts profileSchema also carries `email` and `is_active`,
-- flagged there as justified additive fields beyond §6's literal list (so
-- the Users screen has something to invite/display and a concrete
-- "deactivate" toggle). Both are carried into the real schema here.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'viewer',
  full_name text not null default '',
  email citext not null,
  avatar_id uuid references public.media (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create index profiles_role_idx on public.profiles (role);

-- Now that profiles exists, wire posts.author_id -> profiles(id).
alter table public.posts
  add constraint posts_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;
create index posts_author_id_idx on public.posts (author_id);

-- Auto-create a profiles row whenever a new auth.users row appears.
-- SECURITY DEFINER is required here: this trigger runs as part of the
-- Supabase Auth signup flow (which executes with the invoking user's
-- privileges, insufficient to insert into public.profiles under RLS), and
-- is the standard, narrowly-scoped Supabase pattern for this exact problem
-- — it does nothing except mirror auth.users -> profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Mirrors auth.users -> public.profiles on signup (§6/§7 standard Supabase pattern). SECURITY DEFINER is required because this fires as part of the Auth signup transaction, which does not otherwise have INSERT rights on public.profiles under RLS.';
