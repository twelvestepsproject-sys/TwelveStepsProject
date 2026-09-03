-- Forces a password change after an admin hands out a temporary one.
--
-- There is no mail server, so a new account's first password is generated
-- by an admin and passed on by hand — over WhatsApp, or read out. That is
-- fine as a way in and bad as a permanent password: someone else chose it,
-- and it travelled through a channel nobody controls.
--
-- The flag is set when an admin creates a user or resets a password, and
-- cleared the moment the user sets their own. While it is true, every admin
-- screen redirects to the change-password page.
--
-- Defaults to false so existing accounts are unaffected: they chose their
-- own passwords already and must not be locked out by this.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'True while the account still has an admin-issued temporary password. Blocks the admin UI until the user sets their own.';
