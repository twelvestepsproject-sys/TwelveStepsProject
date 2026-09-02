-- Separates the search-result description from the footer tagline.
--
-- `tagline` was doing two jobs at once: it is printed under the site name in
-- the footer AND used as the meta description Google shows under the title.
-- Those want opposite things. The footer wants something short — the site's
-- is "ללמוד. לחוות. להשתנות." — while a description that ranks needs the
-- terms people actually search for, at around 155 characters. Writing one
-- string for both makes the footer heavy or the description useless.
--
-- The description is optional and falls back to `tagline`, so a site that
-- has not set one behaves exactly as before.

alter table public.site_settings
  add column if not exists seo_description text;

comment on column public.site_settings.seo_description is
  'Meta description for search results and link previews. Falls back to tagline when empty. Aim for ~155 characters.';
