-- The Google Ads conversion label for the registration form.
--
-- `gtm_id` already holds the tag id (AW-…); this holds the second half of a
-- conversion's `send_to`, the part after the slash. Google issues one label
-- per conversion action, and an agency may reissue it — separating the site
-- from the campaign — so it belongs next to the tag id in settings rather
-- than compiled into the build.
--
-- Nullable on purpose: with the tag id set and this empty, the site still
-- reports visits and audiences, and simply does not count form submissions.
-- That is the correct state before an agency has issued a label.

alter table public.site_settings
  add column if not exists ads_conversion_label text;

comment on column public.site_settings.ads_conversion_label is
  'Google Ads conversion label for the registration form, e.g. hKZZCIbkgaUDEOSd7OED. Combined with gtm_id as "<gtm_id>/<label>".';
