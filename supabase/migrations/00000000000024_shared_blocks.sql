-- Shared blocks (§5): one block instance rendered on several pages, edited
-- in one place.
--
-- Motivation: the client built a reading list ("הספרייה של הנני") on the
-- homepage and a three-year link-cards block on the psychotherapy training,
-- and wants those exact blocks on other pages — explicitly "not to write it
-- again, but to show the same one", i.e. editing once must update every
-- placement.
--
-- Why a separate table rather than pointing page_blocks rows at each other:
-- `savePage` replaces a page's blocks wholesale (delete-then-reinsert) on
-- every save, so a source block living in `page_blocks` would be destroyed
-- and re-created — with a new id — every time its host page was saved,
-- breaking every reference to it. Shared content therefore needs storage
-- that no page's save cycle touches.
--
-- `page_blocks` gains a nullable `shared_block_id`. A row carrying it is a
-- REFERENCE: it holds placement (which page, what order, visible or not)
-- while the content comes from `shared_blocks`. Its own `data` stays empty
-- and its `block_type` mirrors the source, so existing renderers and the
-- block_type enum need no special case.

create table public.shared_blocks (
  id uuid primary key default gen_random_uuid(),
  -- Editor-facing name, e.g. "הספרייה של הנני" — how the block is picked
  -- from the list when adding it to a page.
  name text not null,
  block_type public.block_type not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.shared_blocks
  for each row execute function public.set_updated_at();
create index shared_blocks_block_type_idx on public.shared_blocks (block_type);

alter table public.page_blocks
  add column shared_block_id uuid references public.shared_blocks (id) on delete cascade;

create index page_blocks_shared_block_id_idx on public.page_blocks (shared_block_id);

-- RLS: shared content is public-readable (it renders on public pages) and
-- editor-writable, matching every other content table. Visibility is still
-- governed by the referencing page_blocks row's own policy, so a shared
-- block placed on a draft page stays hidden exactly as before.
alter table public.shared_blocks enable row level security;

create policy shared_blocks_select_public on public.shared_blocks
  for select using (true);

create policy shared_blocks_editor_write on public.shared_blocks
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());
