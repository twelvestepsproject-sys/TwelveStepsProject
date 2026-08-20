-- Adds `interest` to leads: which track the person is asking about.
--
-- The registration form is reachable from every page, so a lead arriving
-- from the homepage carried no indication of which programme they meant —
-- the team had to ask again on the follow-up call.
--
-- Free text rather than an enum or a FK to `trainings`: the form offers the
-- current tracks, but the value must survive a training being renamed,
-- unpublished or deleted. A lead is a historical record of what someone
-- said they wanted, so freezing the label they saw is the correct
-- semantics — an FK would rewrite history when the catalogue changes.
--
-- Nullable: every existing lead predates the field, and the form allows
-- "not sure yet".

alter table public.leads add column if not exists interest text;
