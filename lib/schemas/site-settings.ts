import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

/**
 * §3.5: site_settings.theme jsonb holds overrides for the brand-tier
 * tokens only (primary, accent, surfaces, ink, radii). Semantic colors
 * (success/error/warning) stay fixed and are never in this shape. Every
 * key is optional — unset keys fall back to the @theme defaults in
 * app/globals.css via ordinary CSS cascade, no merge logic needed.
 */
export const themeOverridesSchema = z.object({
  "color-primary": z.string().optional(),
  "color-primary-hover": z.string().optional(),
  "color-primary-fg": z.string().optional(),
  "color-accent": z.string().optional(),
  "color-accent-hover": z.string().optional(),
  "color-accent-fg": z.string().optional(),
  "color-bg": z.string().optional(),
  "color-surface": z.string().optional(),
  "color-surface-alt": z.string().optional(),
  "color-border": z.string().optional(),
  "color-ink": z.string().optional(),
  "color-ink-muted": z.string().optional(),
  "radius-sm": z.string().optional(),
  "radius-md": z.string().optional(),
  "radius-lg": z.string().optional(),
  "radius-full": z.string().optional(),
});
export type ThemeOverrides = z.infer<typeof themeOverridesSchema>;

export const fontFamilyOptionSchema = z.enum([
  "Heebo",
  "Assistant",
  "Rubik",
  "Noto Sans Hebrew",
]);
export type FontFamilyOption = z.infer<typeof fontFamilyOptionSchema>;

export const radiusScaleSchema = z.enum(["sharp", "soft", "round"]);
export type RadiusScale = z.infer<typeof radiusScaleSchema>;

/** How heavy the site's regular body text renders. Colour was already
 * adjustable via the `color-ink-muted` theme token; weight was not, so
 * "the text looks faint" had no fix short of a code change. */
export const bodyTextWeightSchema = z.enum(["normal", "medium", "semibold"]);
export type BodyTextWeight = z.infer<typeof bodyTextWeightSchema>;

/**
 * §6 site_settings — singleton. §3.5 acceptance criterion: the root
 * layout's token injection depends on `getSiteSettings()` returning the
 * FULL branding payload, not just contact details — branding + contact +
 * links + misc all live on this one row.
 */
export const siteSettingsSchema = z.object({
  id: uuidSchema,

  // Branding
  site_name: z.string(),
  tagline: z.string(),
  // Meta description for search results and link previews. Separate from
  // `tagline`, which is printed in the footer and wants to stay short —
  // see migration 34. Falls back to tagline when empty.
  seo_description: z.string().nullish(),
  logo_id: uuidSchema.nullable(),
  logo_dark_id: uuidSchema.nullable(),
  favicon_id: uuidSchema.nullable(),
  og_default_image_id: uuidSchema.nullable(),
  theme: themeOverridesSchema,
  // null = no admin override yet, fall back to the shipped @theme default
  // (Fredoka / Assistant) — same "unset falls back to default" principle
  // §3.5 already applies to `theme` jsonb, extended here since these two
  // fields are required top-level enums with no other way to express
  // "nothing chosen." An explicit non-null value is a real admin choice
  // and must render literally (see FONT_FAMILY_CSS in lib/fonts.ts).
  font_display: fontFamilyOptionSchema.nullable(),
  font_body: fontFamilyOptionSchema.nullable(),
  radius_scale: radiusScaleSchema,
  body_text_weight: bodyTextWeightSchema.default("normal"),

  // Contact
  contact_phone: z.string().nullable(),
  contact_email: z.email().nullable(),
  contact_address: z.string().nullable(),

  // Links
  /** platform -> URL. Kept for backward compatibility; `social_icons`
   * optionally attaches an uploaded image to the same platform key. */
  social_links: z.record(z.string(), z.string()),
  /** platform -> media id. A platform with no entry falls back to a
   * built-in icon, and then to its first letter, so the footer always
   * renders something. */
  social_icons: z.record(z.string(), z.string()).default({}),
  community_url: z.string().nullable(),
  donation_url: z.string().nullable(),

  // Misc
  gtm_id: z.string().nullable(),
  footer_credits: z.string().nullable(),
  // Optional URL the credit line links to. Kept separate from the text so
  // the credit itself stays plain text — that field is a normal admin input
  // and must not accept markup.
  footer_credits_url: z.string().nullish(),

  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
