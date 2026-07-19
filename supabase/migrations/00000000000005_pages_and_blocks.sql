-- Phase 5 — pages + page_blocks.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  title text not null,
  status public.draft_published_status not null default 'draft',
  published_at timestamptz,
  template text,
  seo_title text,
  seo_description text,
  seo_canonical text,
  seo_og_image_id uuid references public.media (id) on delete set null,
  seo_noindex boolean not null default false,
  is_placeholder boolean not null default false,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.pages
  for each row execute function public.set_updated_at();
create index pages_slug_idx on public.pages (slug);
create index pages_status_idx on public.pages (status);
create index pages_search_vector_idx on public.pages using gin (search_vector);

create table public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  block_type public.block_type not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.page_blocks
  for each row execute function public.set_updated_at();
create index page_blocks_page_id_idx on public.page_blocks (page_id);
create index page_blocks_sort_order_idx on public.page_blocks (page_id, sort_order);
