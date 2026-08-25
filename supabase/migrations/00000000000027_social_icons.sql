-- Adds `social_icons` to site_settings: platform -> media id.
--
-- The footer rendered each social link as the first letter of its platform
-- name ("F" for facebook), which the client asked to replace with real
-- icons. Built-in SVGs cover the common networks, but the client also
-- wants to upload her own — so this maps a platform key to an uploaded
-- media row, overriding the built-in.
--
-- Separate column rather than restructuring `social_links` into objects:
-- that column is already populated and read by the footer, and widening
-- its shape would need a data migration for no benefit.

alter table public.site_settings
  add column if not exists social_icons jsonb not null default '{}'::jsonb;
