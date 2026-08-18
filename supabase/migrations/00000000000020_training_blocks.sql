-- Lets training pages be composed of blocks, like `pages` already are.
--
-- Trainings previously rendered a fixed sequence hardcoded in
-- app/(site)/hachsharot/[slug]/page.tsx: cover, title, excerpt, details
-- table, body, syllabus, instructors, registration CTA. Editors could
-- change the VALUES (via /admin/trainings) but never the ORDER, and could
-- not add anything else — no FAQ, no requirements, no reading list.
--
-- Approach: reuse `page_blocks` rather than inventing a parallel
-- `training_blocks` table, so every block type, admin form, renderer and
-- validation path already built keeps working unchanged.
--
--  * `page_id` becomes nullable and gains a sibling `training_id`.
--  * A CHECK enforces exactly one owner, so a block can never be orphaned
--    or attached to both.
--
-- Four new block types carry the sections that used to be hardcoded, so
-- they can be reordered and hidden like any other block. They read from
-- the `trainings` row they belong to (not from `data`), which keeps
-- /admin/trainings the single place those values are edited — the client's
-- explicit requirement that existing functionality stay intact.

alter table public.page_blocks
  alter column page_id drop not null;

alter table public.page_blocks
  add column training_id uuid references public.trainings (id) on delete cascade;

-- Exactly one owner: page XOR training.
alter table public.page_blocks
  add constraint page_blocks_single_owner check (
    (page_id is not null and training_id is null)
    or (page_id is null and training_id is not null)
  );

create index page_blocks_training_id_idx on public.page_blocks (training_id);

-- Block types for the previously-hardcoded training sections.
alter type public.block_type add value if not exists 'training_intro';
alter type public.block_type add value if not exists 'training_body';
alter type public.block_type add value if not exists 'training_syllabus';
alter type public.block_type add value if not exists 'training_instructors';
alter type public.block_type add value if not exists 'training_registration_cta';

-- RLS: the existing public-select policy only knows how to reach a parent
-- `pages` row, so a training-owned block (page_id null) would fail its
-- EXISTS check and be invisible to anon visitors. Extend it with the
-- mirror-image clause for trainings — same rule, same strictness: visible
-- block + published parent, or an editor. Nothing is loosened; blocks whose
-- parent training is a draft stay hidden exactly as page blocks do.
drop policy page_blocks_select_public on public.page_blocks;

create policy page_blocks_select_public on public.page_blocks
  for select
  using (
    (
      is_visible = true
      and (
        exists (
          select 1 from public.pages
          where pages.id = page_blocks.page_id and pages.status = 'published'
        )
        or exists (
          select 1 from public.trainings
          where trainings.id = page_blocks.training_id and trainings.status = 'published'
        )
      )
    )
    or public.current_role_at_least_editor()
  );
