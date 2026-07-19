-- Phase 5 — Row Level Security. §7, no exceptions: RLS enabled on EVERY
-- table. This is the highest-stakes migration in the whole phase.
--
-- Role model:
--   anon        -- unauthenticated visitor (Supabase's built-in `anon` role)
--   authenticated -- any logged-in user (Supabase's built-in role)
--   our app roles (admin/editor/viewer) live in public.profiles.role and are
--   read via the helper functions below, checked against auth.uid().
--
-- Helper functions (SECURITY DEFINER, minimal surface) so policies don't
-- each re-derive the caller's role from profiles directly (avoids RLS
-- recursion on profiles itself, and keeps every policy readable).

create or replace function public.current_role_is(target public.user_role)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = target and is_active
  );
$$;

create or replace function public.current_role_at_least_editor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'editor') and is_active
  );
$$;

create or replace function public.current_role_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

comment on function public.current_role_is_admin() is
  'SECURITY DEFINER: reads public.profiles to resolve the caller''s role for RLS policies elsewhere. Must bypass RLS on profiles itself to avoid recursive policy evaluation; does not expose any row data, only a boolean.';

-- ===========================================================================
-- media
-- ===========================================================================
alter table public.media enable row level security;

create policy media_select_all on public.media
  for select using (true); -- media itself carries no draft/publish state

create policy media_editor_write on public.media
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- site_settings — admin only (editor has no access per §7)
-- ===========================================================================
alter table public.site_settings enable row level security;

create policy site_settings_select_anon on public.site_settings
  for select using (true); -- public site needs branding/contact info

create policy site_settings_admin_write on public.site_settings
  for all using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

-- ===========================================================================
-- menus / menu_items — public read, editor write
-- ===========================================================================
alter table public.menus enable row level security;
create policy menus_select_all on public.menus for select using (true);
create policy menus_editor_write on public.menus
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

alter table public.menu_items enable row level security;
create policy menu_items_select_all on public.menu_items for select using (true);
create policy menu_items_editor_write on public.menu_items
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- categories — public read, editor write
-- ===========================================================================
alter table public.categories enable row level security;
create policy categories_select_all on public.categories for select using (true);
create policy categories_editor_write on public.categories
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- lecturers — anon sees only is_visible = true; editor sees/writes all
-- ===========================================================================
alter table public.lecturers enable row level security;

create policy lecturers_select_public on public.lecturers
  for select
  using (is_visible = true or public.current_role_at_least_editor());

create policy lecturers_editor_write on public.lecturers
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- pages — anon sees only status = 'published'
-- ===========================================================================
alter table public.pages enable row level security;

create policy pages_select_public on public.pages
  for select
  using (status = 'published' or public.current_role_at_least_editor());

create policy pages_editor_write on public.pages
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- page_blocks — visibility follows the parent page's status/visibility
-- ===========================================================================
alter table public.page_blocks enable row level security;

create policy page_blocks_select_public on public.page_blocks
  for select
  using (
    is_visible = true
    and exists (
      select 1 from public.pages
      where pages.id = page_blocks.page_id and pages.status = 'published'
    )
    or public.current_role_at_least_editor()
  );

create policy page_blocks_editor_write on public.page_blocks
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- trainings — anon sees only status = 'published'
-- ===========================================================================
alter table public.trainings enable row level security;

create policy trainings_select_public on public.trainings
  for select
  using (status = 'published' or public.current_role_at_least_editor());

create policy trainings_editor_write on public.trainings
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

alter table public.training_instructors enable row level security;

create policy training_instructors_select_public on public.training_instructors
  for select
  using (
    exists (
      select 1 from public.trainings
      where trainings.id = training_instructors.training_id
        and (trainings.status = 'published' or public.current_role_at_least_editor())
    )
  );

create policy training_instructors_editor_write on public.training_instructors
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- posts — anon sees only status = 'published' AND published_at <= now()
-- (§5.5 rule 5 / §6: two independent filters, both required)
-- ===========================================================================
alter table public.posts enable row level security;

create policy posts_select_public on public.posts
  for select
  using (
    (status = 'published' and published_at is not null and published_at <= now())
    or public.current_role_at_least_editor()
  );

create policy posts_editor_write on public.posts
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- testimonials — anon sees only is_visible = true
-- ===========================================================================
alter table public.testimonials enable row level security;

create policy testimonials_select_public on public.testimonials
  for select
  using (is_visible = true or public.current_role_at_least_editor());

create policy testimonials_editor_write on public.testimonials
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- program_stages / program_steps — public read (no draft/visible flag —
-- these ship as a whole once published; editor-only write)
-- ===========================================================================
alter table public.program_stages enable row level security;
create policy program_stages_select_all on public.program_stages for select using (true);
create policy program_stages_editor_write on public.program_stages
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

alter table public.program_steps enable row level security;
create policy program_steps_select_all on public.program_steps for select using (true);
create policy program_steps_editor_write on public.program_steps
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- galleries / gallery_images — public read, editor write
-- ===========================================================================
alter table public.galleries enable row level security;
create policy galleries_select_all on public.galleries for select using (true);
create policy galleries_editor_write on public.galleries
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

alter table public.gallery_images enable row level security;
create policy gallery_images_select_all on public.gallery_images for select using (true);
create policy gallery_images_editor_write on public.gallery_images
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- podcast_episodes — public read, editor write
-- ===========================================================================
alter table public.podcast_episodes enable row level security;
create policy podcast_episodes_select_all on public.podcast_episodes for select using (true);
create policy podcast_episodes_editor_write on public.podcast_episodes
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- schedule_entries — anon sees only is_visible = true
-- ===========================================================================
alter table public.schedule_entries enable row level security;
create policy schedule_entries_select_public on public.schedule_entries
  for select
  using (is_visible = true or public.current_role_at_least_editor());
create policy schedule_entries_editor_write on public.schedule_entries
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- leads — ZERO anon select. anon INSERT only. editor/admin full access.
-- ===========================================================================
alter table public.leads enable row level security;

create policy leads_insert_anon on public.leads
  for insert
  with check (true); -- Server Action validates with zod before this write

create policy leads_editor_all on public.leads
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());
-- No SELECT policy for anon: default-deny, so anon SELECT returns 0 rows.

-- ===========================================================================
-- newsletter_subscribers — ZERO anon select. anon INSERT only.
-- ===========================================================================
alter table public.newsletter_subscribers enable row level security;

create policy newsletter_subscribers_insert_anon on public.newsletter_subscribers
  for insert
  with check (true);

create policy newsletter_subscribers_editor_all on public.newsletter_subscribers
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- contact_messages — ZERO anon select. anon INSERT only.
-- ===========================================================================
alter table public.contact_messages enable row level security;

create policy contact_messages_insert_anon on public.contact_messages
  for insert
  with check (true);

create policy contact_messages_editor_all on public.contact_messages
  for all using (public.current_role_at_least_editor())
  with check (public.current_role_at_least_editor());

-- ===========================================================================
-- profiles — ZERO anon access. Users read their own row; admin reads/writes all.
-- ===========================================================================
alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles
  for select
  using (id = auth.uid() or public.current_role_is_admin());

create policy profiles_admin_write on public.profiles
  for all using (public.current_role_is_admin())
  with check (public.current_role_is_admin());
-- No anon policy at all: default-deny.

-- ===========================================================================
-- revisions — ZERO anon access. editor/admin read+write (create), admin restore.
-- ===========================================================================
alter table public.revisions enable row level security;

create policy revisions_editor_select on public.revisions
  for select using (public.current_role_at_least_editor());

create policy revisions_editor_insert on public.revisions
  for insert with check (public.current_role_at_least_editor());
-- Revisions are an append-only audit trail: no update/delete policy for
-- anyone (not even admin) — restoring means writing a NEW row to the
-- target entity, not mutating history.

-- ===========================================================================
-- audit_log — ZERO anon access. admin read; system inserts via editor+ role.
-- ===========================================================================
alter table public.audit_log enable row level security;

create policy audit_log_admin_select on public.audit_log
  for select using (public.current_role_is_admin());

create policy audit_log_editor_insert on public.audit_log
  for insert with check (public.current_role_at_least_editor());
-- Append-only, same reasoning as revisions.

-- ===========================================================================
-- redirects — admin only (editor has no access per §7)
-- ===========================================================================
alter table public.redirects enable row level security;

create policy redirects_select_public on public.redirects
  for select using (true); -- middleware needs to resolve redirects for anon requests

create policy redirects_admin_write on public.redirects
  for all using (public.current_role_is_admin())
  with check (public.current_role_is_admin());
