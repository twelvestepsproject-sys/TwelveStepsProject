-- Adds `body_text_weight` to site_settings.
--
-- The client asked for the site's regular text to look less faint. Colour
-- was already adjustable (theme token `color-ink-muted`), but weight was
-- not — every muted paragraph inherited the browser default. Rather than
-- hardcode a heavier weight, this exposes the choice so the client can
-- tune it without another round-trip.
--
-- 'normal' is the shipped look, so existing sites are unchanged until
-- someone deliberately picks otherwise.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'body_text_weight') then
    create type public.body_text_weight as enum ('normal', 'medium', 'semibold');
  end if;
end $$;

alter table public.site_settings
  add column if not exists body_text_weight public.body_text_weight not null default 'normal';
