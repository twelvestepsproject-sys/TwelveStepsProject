-- Phase 5 — structural tables: media, site_settings, menus + menu_items.
-- media comes first: nearly every content table FKs into it.

create table public.media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  alt_he text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  blurhash text,
  license_note text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.media
  for each row execute function public.set_updated_at();

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  -- Branding
  site_name text not null,
  tagline text not null,
  logo_id uuid references public.media (id) on delete set null,
  logo_dark_id uuid references public.media (id) on delete set null,
  favicon_id uuid references public.media (id) on delete set null,
  og_default_image_id uuid references public.media (id) on delete set null,
  theme jsonb not null default '{}'::jsonb,
  font_display text not null default 'Heebo',
  font_body text not null default 'Assistant',
  radius_scale text not null default 'soft' check (radius_scale in ('sharp', 'soft', 'round')),
  -- Contact
  contact_phone text,
  contact_email citext,
  contact_address text,
  -- Links
  social_links jsonb not null default '{}'::jsonb,
  community_url text,
  donation_url text,
  -- Misc
  gtm_id text,
  footer_credits text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- Singleton enforcement: only one row may ever exist.
create unique index site_settings_singleton on public.site_settings ((true));

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  location public.menu_location not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.menus
  for each row execute function public.set_updated_at();

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  parent_id uuid references public.menu_items (id) on delete cascade,
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();
create index menu_items_menu_id_idx on public.menu_items (menu_id);
create index menu_items_parent_id_idx on public.menu_items (parent_id);
