-- Fills in the footer credit line and its link.
--
-- Migration 31 added the column; this sets the value, so the credit does not
-- have to be typed into Branding by hand on every environment.
--
-- Deliberately conservative about the text: it only appends the build credit
-- when the existing line does not already mention it, and leaves whatever
-- copyright text is there otherwise. An editor who has rewritten that line
-- keeps their wording.
--
-- The URL is only set when empty, so a later change from the admin screen
-- survives a redeploy rather than being reset by this file.

update public.site_settings
set footer_credits = case
      when footer_credits is null or btrim(footer_credits) = ''
        then 'נבנה על ידי אהרן רייס'
      when footer_credits like '%אהרן רייס%'
        then footer_credits
      else footer_credits || ' · נבנה על ידי אהרן רייס'
    end
where footer_credits is null
   or footer_credits not like '%אהרן רייס%';

update public.site_settings
set footer_credits_url = 'https://wa.me/972539288821'
where footer_credits_url is null
   or btrim(footer_credits_url) = '';
