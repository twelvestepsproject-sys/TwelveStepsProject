-- An optional link for the footer credit line.
--
-- `footer_credits` is plain text rendered as a <p>, which is right — it is
-- edited in a normal input and must never accept markup. But a build credit
-- is only useful if it can be clicked: the whole point is that someone who
-- likes the site can reach whoever made it.
--
-- So the link is a separate column rather than HTML inside the text. The
-- footer wraps the credit in an <a> when this is set and leaves it as a
-- plain <p> when it is not, so nothing changes for a site that does not
-- want one.
--
-- Any URL works — a portfolio site, a wa.me link, a mailto.

alter table public.site_settings
  add column if not exists footer_credits_url text;

comment on column public.site_settings.footer_credits_url is
  'Optional URL the footer credit line links to. Plain text credit stays in footer_credits.';
