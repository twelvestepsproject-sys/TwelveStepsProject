import { z } from "zod";
import { uuidSchema } from "./common";

/**
 * §5 / §6 page_blocks.block_type — the de-duplicated 20-type enum.
 * A block type is a shape (its zod schema), not an occurrence:
 * `leader_message` and `podcast` are each ONE type here, repeatable via
 * rows (sort_order), never split into per-instance types.
 *
 * Each `*BlockData` schema below validates `page_blocks.data jsonb` for
 * its `block_type` (§6: "Validate `data` against a per-block_type zod
 * schema on write"). The discriminated union at the bottom mirrors this
 * in the TS domain type.
 */

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
  open_in_new_tab: z.boolean().default(false),
});

// 1. Header
export const headerBlockDataSchema = z.object({
  logo_id: uuidSchema.nullable(),
  nav: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
      children: z.array(linkSchema).default([]),
    }),
  ),
  secondary_cta: linkSchema.nullable(),
  social_links: z.array(linkSchema).default([]),
});

// 2. Hero
export const heroBlockDataSchema = z.object({
  eyebrow: z.string().nullable(),
  heading: z.string(),
  intro: z.string(),
  phone_cta: z.string().nullable(),
  primary_cta_label: z.string().nullable(),
  background_media_id: uuidSchema.nullable(),
});

// 3. Intro media
// `video_url` is nullable (approved schema change, design-direction task):
// this fictional org has no real YouTube video yet, so the block must be
// able to model a genuine "no video yet" placeholder state rather than
// coercing that into an empty-string sentinel. `null` here is a real,
// typed, intentional state — not a temporary gap in validation.
// `thumbnail_media_id` follows the same nullable/resolved-via-db.getMedia()
// pattern already used by `video_testimonials` (#9) below, so the
// click-to-play poster resolves through the existing media pipeline
// instead of hotlinking a YouTube thumbnail host at runtime.
export const introMediaBlockDataSchema = z.object({
  heading: z.string(),
  video_url: z.string().nullable(),
  thumbnail_media_id: uuidSchema.nullable(),
});

// 4. Focus areas
export const focusAreasBlockDataSchema = z.object({
  heading: z.string().nullable(),
  cards: z
    .array(
      z.object({
        icon: z.string().nullable(),
        title: z.string(),
        body: z.string(),
      }),
    )
    .min(3)
    .max(4),
});

// 5. Pull quote
export const pullQuoteBlockDataSchema = z.object({
  quote: z.string(),
});

// 6. Leader message (repeatable — one row per leader, per §5 #6)
export const leaderMessageBlockDataSchema = z.object({
  portrait_media_id: uuidSchema.nullable(),
  video_url: z.string().nullable(),
  heading: z.string(),
  body: z.string(),
  link: linkSchema.nullable(),
});

// 7. Trainings carousel
export const trainingsCarouselBlockDataSchema = z.object({
  heading: z.string(),
  intro: z.string().nullable(),
  featured_only: z.boolean().default(true),
  all_trainings_link: linkSchema.nullable(),
});

// 8. About
export const aboutBlockDataSchema = z.object({
  icon: z.string().nullable(),
  heading: z.string(),
  subheading: z.string().nullable(),
  body: z.string(),
  cta: linkSchema.nullable(),
});

// 9. Video testimonials / intro videos
export const videoTestimonialsBlockDataSchema = z.object({
  heading: z.string().nullable(),
  videos: z.array(
    z.object({
      title: z.string(),
      video_url: z.string(),
      thumbnail_media_id: uuidSchema.nullable(),
    }),
  ),
});

// 10. Newsletter signup
export const newsletterSignupBlockDataSchema = z.object({
  heading: z.string(),
  body: z.string().nullable(),
  consent_text: z.string(),
  privacy_link: linkSchema,
});

// 11. Testimonials slider
export const testimonialsSliderBlockDataSchema = z.object({
  heading: z.string().nullable(),
});

// 12. Lecturers grid
export const lecturersGridBlockDataSchema = z.object({
  heading: z.string().nullable(),
  all_lecturers_link: linkSchema.nullable(),
});

// 13. Program stages stepper/accordion
export const programStagesBlockDataSchema = z.object({
  heading: z.string().nullable(),
});

// 14. Photo gallery
export const photoGalleryBlockDataSchema = z.object({
  gallery_id: uuidSchema,
  heading: z.string().nullable(),
});

// 15. Podcast (presence via row + is_visible, not a code branch — §5 #15)
export const podcastBlockDataSchema = z.object({
  heading: z.string().nullable(),
  platform_cta: linkSchema,
});

// 16. Community CTA
export const communityCtaBlockDataSchema = z.object({
  heading: z.string(),
  body: z.string(),
  cta: linkSchema,
});

// 17. Latest articles
export const latestArticlesBlockDataSchema = z.object({
  heading: z.string(),
  intro: z.string().nullable(),
  all_articles_link: linkSchema.nullable(),
});

// 18. Closing CTA band
export const closingCtaBlockDataSchema = z.object({
  icon: z.string().nullable(),
  heading: z.string(),
  body: z.string(),
  cta: linkSchema,
});

// 19. Footer
export const footerBlockDataSchema = z.object({
  logo_id: uuidSchema.nullable(),
  quick_nav_menu_id: uuidSchema.nullable(),
  trainings_list: z.boolean().default(true),
  newsletter_consent_text: z.string(),
  legal_links: z.array(linkSchema).default([]),
  credits: z.string().nullable(),
});

// 20. Global overlays
export const globalOverlaysBlockDataSchema = z.object({
  registration_modal_enabled: z.boolean().default(true),
  upcoming_cohorts_panel_enabled: z.boolean().default(true),
  cookie_consent_enabled: z.boolean().default(true),
  chat_widget_slot: z.string().nullable(),
  accessibility_toolbar_enabled: z.boolean().default(true),
});

export const blockTypeSchema = z.enum([
  "header",
  "hero",
  "intro_media",
  "focus_areas",
  "pull_quote",
  "leader_message",
  "trainings_carousel",
  "about",
  "video_testimonials",
  "newsletter_signup",
  "testimonials_slider",
  "lecturers_grid",
  "program_stages",
  "photo_gallery",
  "podcast",
  "community_cta",
  "latest_articles",
  "closing_cta",
  "footer",
  "global_overlays",
]);
export type BlockType = z.infer<typeof blockTypeSchema>;

const pageBlockBaseFields = {
  id: uuidSchema,
  page_id: uuidSchema,
  sort_order: z.number().int(),
  is_visible: z.boolean(),
};

/** Discriminated union mirroring the TS domain type — one entry per
 * `block_type`, each carrying its own `data` shape. */
export const pageBlockSchema = z.discriminatedUnion("block_type", [
  z.object({ ...pageBlockBaseFields, block_type: z.literal("header"), data: headerBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("hero"), data: heroBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("intro_media"), data: introMediaBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("focus_areas"), data: focusAreasBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("pull_quote"), data: pullQuoteBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("leader_message"), data: leaderMessageBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("trainings_carousel"), data: trainingsCarouselBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("about"), data: aboutBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("video_testimonials"), data: videoTestimonialsBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("newsletter_signup"), data: newsletterSignupBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("testimonials_slider"), data: testimonialsSliderBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("lecturers_grid"), data: lecturersGridBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("program_stages"), data: programStagesBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("photo_gallery"), data: photoGalleryBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("podcast"), data: podcastBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("community_cta"), data: communityCtaBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("latest_articles"), data: latestArticlesBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("closing_cta"), data: closingCtaBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("footer"), data: footerBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("global_overlays"), data: globalOverlaysBlockDataSchema }),
]);
export type PageBlock = z.infer<typeof pageBlockSchema>;
