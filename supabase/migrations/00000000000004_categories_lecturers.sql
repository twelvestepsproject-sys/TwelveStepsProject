-- Phase 5 — categories, lecturers (referenced by posts/trainings).

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create index categories_slug_idx on public.categories (slug);

create table public.lecturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text not null,
  photo_id uuid references public.media (id) on delete set null,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_visible boolean not null default false,
  page_slug citext,
  consent_on_file boolean not null default false,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- §6 / lib/schemas/lecturer.ts .refine()s, mirrored exactly:
  constraint lecturers_consent_check
    check (is_placeholder or not is_visible or consent_on_file),
  constraint lecturers_featured_requires_visible_check
    check (not is_featured or is_visible)
);
create trigger set_updated_at before update on public.lecturers
  for each row execute function public.set_updated_at();
create index lecturers_page_slug_idx on public.lecturers (page_slug);
create index lecturers_sort_order_idx on public.lecturers (sort_order);
