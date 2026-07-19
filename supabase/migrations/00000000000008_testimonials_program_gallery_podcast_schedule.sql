-- Phase 5 — testimonials, program_stages/steps, galleries/gallery_images,
-- podcast_episodes, schedule_entries.

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  quote text not null,
  photo_id uuid references public.media (id) on delete set null,
  sort_order integer not null default 0,
  is_visible boolean not null default false,
  consent_on_file boolean not null default false,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonials_consent_check
    check (is_placeholder or not is_visible or consent_on_file)
);
create trigger set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();
create index testimonials_sort_order_idx on public.testimonials (sort_order);

create table public.program_stages (
  id uuid primary key default gen_random_uuid(),
  stage_number integer not null check (stage_number > 0),
  title text not null,
  subtitle text,
  sort_order integer not null default 0,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.program_stages
  for each row execute function public.set_updated_at();
create index program_stages_sort_order_idx on public.program_stages (sort_order);

create table public.program_steps (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.program_stages (id) on delete cascade,
  step_number integer not null check (step_number > 0),
  title text not null,
  body text not null,
  sort_order integer not null default 0,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.program_steps
  for each row execute function public.set_updated_at();
create index program_steps_stage_id_idx on public.program_steps (stage_id);

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  title text not null,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.galleries
  for each row execute function public.set_updated_at();
create index galleries_slug_idx on public.galleries (slug);

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete cascade,
  alt_he text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.gallery_images
  for each row execute function public.set_updated_at();
create index gallery_images_gallery_id_idx on public.gallery_images (gallery_id);

create table public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  spotify_url text not null,
  published_at timestamptz not null,
  duration integer not null check (duration > 0), -- seconds
  cover_image_id uuid references public.media (id) on delete set null,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.podcast_episodes
  for each row execute function public.set_updated_at();
create index podcast_episodes_published_at_idx on public.podcast_episodes (published_at);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  day_label text not null,
  start_date date not null,
  end_date date,
  time_range text,
  program_name text not null,
  cohort text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.schedule_entries
  for each row execute function public.set_updated_at();
create index schedule_entries_sort_order_idx on public.schedule_entries (sort_order);
