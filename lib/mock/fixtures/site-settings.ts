import type { SiteSettings } from "@/lib/schemas";

/**
 * §6 site_settings — singleton. site_name / tagline are the client-
 * approved placeholders. Theme is left EMPTY (`{}`) deliberately — §3.5
 * says unset keys fall back to the @theme defaults in app/globals.css via
 * ordinary CSS cascade, so shipping the defaults means NOT overriding them
 * here. Contact info is a clearly-fake shape (03-XXX-XXXX pattern, not a
 * real working number) per the task brief. GTM ID blank per spec (no
 * client analytics account exists yet). Social/community/donation links
 * are placeholder URLs — CMS-managed, never hardcoded once Phase 3 wires
 * up components.
 */
export const siteSettings = {
  id: "90000000-0000-4000-8000-000000000001",

  site_name: "מכללת אשד",
  tagline: "לזוז, בקצב שלך.",
  logo_id: null,
  logo_dark_id: null,
  favicon_id: null,
  og_default_image_id: null,
  theme: {},
  // Motion/design-direction pass (2026-07): `font_display`/`font_body` are
  // nullable (see lib/schemas/site-settings.ts) — null means "no admin
  // override yet," so the site renders the shipped @theme defaults
  // (Fredoka / Assistant, lib/fonts.ts). An admin who explicitly picks
  // "Heebo" from the Branding-screen dropdown still gets real Heebo
  // (FONT_FAMILY_CSS.Heebo -> var(--font-heebo)) — that's a deliberate
  // choice, not the default state these fixture rows represent.
  font_display: null,
  font_body: null,
  radius_scale: "soft",

  contact_phone: "03-000-0000",
  contact_email: "info@example-eshed-placeholder.co.il",
  contact_address: "רחוב הדוגמה 1, תל אביב-יפו (כתובת דמה)",

  social_links: {
    facebook: "https://facebook.com/example-eshed-placeholder",
    instagram: "https://instagram.com/example-eshed-placeholder",
  },
  community_url: "https://chat.whatsapp.com/example-eshed-placeholder",
  donation_url: null,

  gtm_id: null,
  footer_credits: "כל הזכויות שמורות © מכללת אשד (שם ותוכן דמה).",

  created_at: "2025-09-01T08:00:00Z",
  updated_at: "2025-09-01T08:00:00Z",
} satisfies SiteSettings;
