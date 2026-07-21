-- Motion/design-direction pass (2026-07): site_settings.font_display /
-- font_body were `not null default 'Heebo'`/`'Assistant'`, which meant
-- every row had an explicit, literal font choice with no way to represent
-- "no admin override yet, use the site's shipped default." §3.5 already
-- applies "unset falls back to @theme default" to the `theme` jsonb
-- column (colors/radius) via ordinary cascade — this extends the same
-- principle to these two fields by making them nullable. NULL now means
-- "inherit the shipped default" (Fredoka / Assistant, see lib/fonts.ts);
-- a non-null value is a real, explicit admin choice and always renders
-- literally (see FONT_FAMILY_CSS in lib/fonts.ts, fontFamilyVars in
-- lib/admin/theme-style.ts).
alter table site_settings
  alter column font_display drop not null,
  alter column font_display drop default,
  alter column font_body drop not null,
  alter column font_body drop default;

-- Existing seeded row(s): the literal 'Heebo'/'Assistant' values were
-- standing in for "default," not a real admin choice — reset to NULL so
-- the site actually renders the new shipped default (Fredoka) instead of
-- silently overriding it back to Heebo on every request.
update site_settings
set font_display = null, font_body = null
where font_display = 'Heebo' and font_body = 'Assistant';
