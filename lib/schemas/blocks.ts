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
// `lecturer_ids` picks WHICH lecturers this instance shows, in the order
// chosen. Added so the same block can appear on several pages (the
// year-by-year psychotherapy pages) each showing a different set — before
// it, every instance rendered the same site-wide list, because the block
// carried no selection at all.
//
// Empty array = "not configured", which keeps the pre-existing behavior
// (featured lecturers, else all visible ones). That default is what makes
// this backward-compatible: every lecturers_grid block already in the
// database parses and renders exactly as before without a data migration.
export const lecturersGridBlockDataSchema = z.object({
  heading: z.string().nullable(),
  all_lecturers_link: linkSchema.nullable(),
  lecturer_ids: z.array(uuidSchema).default([]),
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

// 21. Training details panel
// The same "at a glance" panel `/hachsharot/[slug]` renders from its
// `trainings` row, but as a block whose values live in `page_blocks.data`
// — so it can sit on an ordinary content page that has no training behind
// it (the year-by-year psychotherapy pages). Every field is optional per
// the client request; the renderer omits any row left empty, so an
// editor filling in only two fields gets a clean two-row panel rather
// than blank labels.
//
// `price` is a plain string here, NOT the agorot integer used by
// `trainings.price`: that column is a real currency amount feeding
// `formatPrice()` and JSON-LD, whereas this is free text an editor types
// into a panel ("3,500 ₪", "1,200 ₪ לסמסטר", "לפי הרשמה"). Reusing the
// integer would force a unit conversion and forbid the qualifiers editors
// actually write — see the unit-mismatch bug that shipped on the
// trainings form for why that pairing is worth avoiding here.
export const trainingDetailsBlockDataSchema = z.object({
  heading: z.string().nullable(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  meeting_day: z.string().nullable(),
  meeting_time: z.string().nullable(),
  sessions_count: z.string().nullable(),
  academic_hours: z.string().nullable(),
  price: z.string().nullable(),
  semesters_count: z.string().nullable(),
  registration_link: linkSchema.nullable(),
});

// 22. Requirements list
// Heading + optional intro + a freely-growable list of prerequisites.
// `items` is a flat array of strings rather than {title, body} objects:
// the request was "רשימת דרישות שניתן להוסיף ולמחוק באופן חופשי" — a
// plain list — and a flat shape keeps the admin UI a single text input per
// row (add/remove/reorder) instead of a nested sub-form. An editor who
// wants emphasis can still write it inline in the one line.
//
// No `.min()`: a block with an empty list is a valid intermediate state
// while an editor is filling it in, and the renderer omits the list (or
// the whole block) rather than erroring.
export const requirementsBlockDataSchema = z.object({
  heading: z.string(),
  intro: z.string().nullable(),
  items: z.array(z.string()).default([]),
});

// 23. FAQ accordion
// Unlike `requirements` (a flat string[]), each item needs two fields, so
// this is an array of objects. No `.min()`/`.max()`: "מספר בלתי מוגבל של
// שאלות ותשובות", and an empty list is a valid state while an editor fills
// it in — the renderer drops rows whose question is blank.
export const faqBlockDataSchema = z.object({
  heading: z.string(),
  intro: z.string().nullable(),
  items: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .default([]),
});

// 24. Reading list (core books / sources)
// Per item: title (the only required field), optional cover image,
// optional short description, optional link. Only the title is required
// because a source can legitimately be listed by name alone — the client
// marked cover and link explicitly optional, and a description the editor
// hasn't written yet shouldn't block saving the rest of the list.
export const readingListBlockDataSchema = z.object({
  heading: z.string(),
  intro: z.string().nullable(),
  items: z
    .array(
      z.object({
        title: z.string(),
        cover_media_id: uuidSchema.nullable(),
        description: z.string().nullable(),
        link: linkSchema.nullable(),
      }),
    )
    .default([]),
});

// 30. Link cards
// A row of navigational cards: title, text, optional image, optional
// button. Built for "pick a year" style navigation (שנה א׳/ב׳/ג׳ from the
// trainings page) but deliberately generic — nothing here knows about
// years, so the same block serves any "choose one of these" section.
//
// Only `title` is required per card: a card with just a title and a link is
// a perfectly good navigation tile, and an editor filling one in
// gradually shouldn't be blocked from saving.
export const linkCardsBlockDataSchema = z.object({
  heading: z.string().nullable(),
  intro: z.string().nullable(),
  cards: z
    .array(
      z.object({
        title: z.string(),
        body: z.string().nullable(),
        image_media_id: uuidSchema.nullable(),
        link: linkSchema.nullable(),
      }),
    )
    .default([]),
});

// 31. Certificates
// Heading + intro + a row of certificate images. `items` rather than a
// single image because the real pages show the certificate alongside the
// issuing body's cover — and an unbounded list also covers a program
// carrying several accreditations.
//
// Each item is just a media reference plus an optional caption: the
// certificate IS the content, so there is no title/body per item. Alt
// text comes from the `media` row (mandatory there per §3), not duplicated
// here.
export const certificatesBlockDataSchema = z.object({
  heading: z.string(),
  intro: z.string().nullable(),
  items: z
    .array(
      z.object({
        media_id: uuidSchema.nullable(),
        caption: z.string().nullable(),
      }),
    )
    .default([]),
});

// 32. Syllabus download
// A single download button pointing at either an uploaded PDF
// (`file_media_id`, the normal case now that the media library accepts
// PDFs) or an external URL (`file_url` — Drive/Dropbox, kept for files
// hosted elsewhere).
//
// Both are optional and the uploaded file wins when both are set; the
// renderer hides the block when neither is, so an unfinished block never
// publishes a dead button. `file_url` predates PDF upload support, so
// existing blocks keep working untouched.
export const syllabusDownloadBlockDataSchema = z.object({
  heading: z.string().nullable(),
  body: z.string().nullable(),
  file_media_id: uuidSchema.nullable().default(null),
  file_url: z.string(),
  button_label: z.string().nullable(),
  open_in_new_tab: z.boolean().default(true),
});

// 33. Semesters
// Three nested levels: semester → session → parts. Every list is unbounded
// and every label is free text.
//
// `label` on a session is free text rather than an auto-incrementing number
// so a schedule can hold "מפגש 4א׳" or "יום עיון מרוכז" alongside plain
// numbered meetings — real schedules are not a clean 1..n sequence.
//
// Only the semester `title` and the part `title` are required; a session
// with no date, or a part with no body, is a legitimate half-filled state
// and the renderer simply omits what is missing.
export const semestersBlockDataSchema = z.object({
  heading: z.string().nullable(),
  semesters: z
    .array(
      z.object({
        title: z.string(),
        subtitle: z.string().nullable(),
        sessions: z
          .array(
            z.object({
              label: z.string(),
              date: z.string().nullable(),
              parts: z
                .array(
                  z.object({
                    title: z.string(),
                    body: z.string().nullable(),
                  }),
                )
                .default([]),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

/**
 * 25-29. Training page sections.
 *
 * These five carry the layout that used to be hardcoded in
 * app/(site)/hachsharot/[slug]/page.tsx. Their VALUES still live on the
 * `trainings` row and are still edited in /admin/trainings — the renderer
 * receives the training as a prop and reads them from there. `data` holds
 * only presentation choices (a heading override, a toggle), so there is
 * exactly one place to edit a training's title, price or syllabus, and no
 * copy of that content can drift out of sync.
 *
 * Making them blocks buys ordering, visibility and repeatability: an
 * editor can move the syllabus above the details table, hide the
 * instructors on one training, or drop an FAQ between them.
 */

// 25. Cover + title + excerpt + the details table
export const trainingIntroBlockDataSchema = z.object({
  show_cover: z.boolean().default(true),
  show_details: z.boolean().default(true),
});

// 26. The training's long-form body text
export const trainingBodyBlockDataSchema = z.object({
  heading: z.string().nullable(),
});

// 27. The syllabus list
export const trainingSyllabusBlockDataSchema = z.object({
  heading: z.string().nullable(),
});

// 28. The instructors list
export const trainingInstructorsBlockDataSchema = z.object({
  heading: z.string().nullable(),
});

// 29. Registration call-to-action band
export const trainingRegistrationCtaBlockDataSchema = z.object({
  heading: z.string().nullable(),
  cta_label: z.string().nullable(),
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
  "training_details",
  "requirements",
  "faq",
  "reading_list",
  "training_intro",
  "training_body",
  "training_syllabus",
  "training_instructors",
  "training_registration_cta",
  "link_cards",
  "certificates",
  "syllabus_download",
  "semesters",
]);
export type BlockType = z.infer<typeof blockTypeSchema>;

/**
 * A block belongs to EITHER a page or a training, never both — mirroring
 * the `page_blocks_single_owner` CHECK added in migration 20. Both are
 * optional here rather than a zod union: the ownership invariant is
 * enforced by the database, and modelling it as a union would force every
 * consumer to narrow on a distinction none of them care about (renderers
 * receive `data`; the editor already knows which parent it is editing).
 */
const pageBlockBaseFields = {
  id: uuidSchema,
  page_id: uuidSchema.nullable().optional(),
  training_id: uuidSchema.nullable().optional(),
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
  z.object({ ...pageBlockBaseFields, block_type: z.literal("training_details"), data: trainingDetailsBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("requirements"), data: requirementsBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("faq"), data: faqBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("reading_list"), data: readingListBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("training_intro"), data: trainingIntroBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("training_body"), data: trainingBodyBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("training_syllabus"), data: trainingSyllabusBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("training_instructors"), data: trainingInstructorsBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("training_registration_cta"), data: trainingRegistrationCtaBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("link_cards"), data: linkCardsBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("certificates"), data: certificatesBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("syllabus_download"), data: syllabusDownloadBlockDataSchema }),
  z.object({ ...pageBlockBaseFields, block_type: z.literal("semesters"), data: semestersBlockDataSchema }),
]);
export type PageBlock = z.infer<typeof pageBlockSchema>;
