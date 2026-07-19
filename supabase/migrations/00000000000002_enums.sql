-- Phase 5 — enums shared across tables.

create type public.draft_published_status as enum ('draft', 'published');

create type public.user_role as enum ('admin', 'editor', 'viewer');

create type public.menu_location as enum ('header', 'footer_quick', 'mobile');

create type public.lead_status as enum ('new', 'contacted', 'converted', 'archived');

create type public.subscriber_status as enum ('subscribed', 'unsubscribed');

-- redirects.status_code is a plain smallint with a CHECK, not an enum —
-- lib/schemas/admin.ts's redirectSchema types it as a numeric literal
-- union (301|302|307|308), so a smallint keeps the DataSource layer free
-- of enum-as-string/number coercion friction (see saveRedirect in
-- lib/queries/supabase/index.ts).

-- lib/schemas/blocks.ts blockTypeSchema — the de-duplicated 20-type enum.
-- leader_message and podcast are single types, repeatable via rows.
create type public.block_type as enum (
  'header',
  'hero',
  'intro_media',
  'focus_areas',
  'pull_quote',
  'leader_message',
  'trainings_carousel',
  'about',
  'video_testimonials',
  'newsletter_signup',
  'testimonials_slider',
  'lecturers_grid',
  'program_stages',
  'photo_gallery',
  'podcast',
  'community_cta',
  'latest_articles',
  'closing_cta',
  'footer',
  'global_overlays'
);
