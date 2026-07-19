-- Phase 5 — posts. author_id references profiles (admin/system), not auth.users
-- directly, per lib/schemas/post.ts comment: "Author is modeled as a nullable
-- uuid FK to profiles". profiles is created in a later migration, so this FK
-- is added there via ALTER TABLE to keep migration ordering linear.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  title text not null,
  excerpt text not null,
  body text not null,
  cover_image_id uuid references public.media (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  author_id uuid, -- FK added in 00000000000010 once profiles exists
  published_at timestamptz,
  reading_time integer not null check (reading_time > 0), -- minutes, integer only
  status public.draft_published_status not null default 'draft',
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
create trigger set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();
create index posts_slug_idx on public.posts (slug);
create index posts_status_idx on public.posts (status);
create index posts_category_id_idx on public.posts (category_id);
create index posts_published_at_idx on public.posts (published_at);
create index posts_search_vector_idx on public.posts using gin (search_vector);
