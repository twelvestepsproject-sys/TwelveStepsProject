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
  logo_id: uuidSchema.nullable(),
  logo_dark_id: uuidSchema.nullable(),
  favicon_id: uuidSchema.nullable(),
  og_default_image_id: uuidSchema.nullable(),
  theme: themeOverridesSchema,
  font_display: fontFamilyOptionSchema,
  font_body: fontFamilyOptionSchema,
  radius_scale: radiusScaleSchema,

  // Contact
  contact_phone: z.string().nullable(),
  contact_email: z.email().nullable(),
  contact_address: z.string().nullable(),

  // Links
  social_links: z.record(z.string(), z.string()),
  community_url: z.string().nullable(),
  donation_url: z.string().nullable(),

  // Misc
  gtm_id: z.string().nullable(),
  footer_credits: z.string().nullable(),

  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
