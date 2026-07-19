-- Phase 5 — trainings + m2m instructors (→ lecturers).

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  title text not null,
  excerpt text not null,
  body text not null,
  cover_image_id uuid references public.media (id) on delete set null,
  starts_on date,
  ends_on date,
  meeting_day text,
  meeting_time text,
  academic_hours integer not null default 0 check (academic_hours >= 0),
  sessions_count integer not null default 0 check (sessions_count >= 0),
  syllabus jsonb not null default '[]'::jsonb,
  price integer check (price is null or price >= 0), -- smallest currency unit (agorot)
  registration_url text,
  is_featured boolean not null default false,
  status public.draft_published_status not null default 'draft',
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  seo_canonical text,
  seo_og_image_id uuid references public.media (id) on delete set null,
  seo_noindex boolean not null default false,
  is_placeholder boolean not null default false,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.trainings
  for each row execute function public.set_updated_at();
create index trainings_slug_idx on public.trainings (slug);
create index trainings_status_idx on public.trainings (status);
create index trainings_search_vector_idx on public.trainings using gin (search_vector);

create table public.training_instructors (
  training_id uuid not null references public.trainings (id) on delete cascade,
  lecturer_id uuid not null references public.lecturers (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (training_id, lecturer_id)
);
create index training_instructors_training_id_idx on public.training_instructors (training_id);
create index training_instructors_lecturer_id_idx on public.training_instructors (lecturer_id);
