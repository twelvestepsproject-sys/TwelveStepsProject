import type { BlockType, PageBlock } from "@/lib/schemas";

/**
 * Pages block editor (§8 / §5) registry: Hebrew labels for the "add block"
 * picker, and sensible default `data` for each of the 20 block types when
 * a new instance is inserted. Kept as one small table rather than 20
 * hand-written "new block" forms — the per-block EDIT form is a separate
 * concern (see block-form-fields.tsx), this file only answers "what does
 * a brand-new instance of this block type look like."
 */
export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  header: "כותרת עליונה (Header)",
  hero: "הירו (Hero)",
  intro_media: "מדיה פותחת",
  focus_areas: "תחומי התמקדות",
  pull_quote: "ציטוט בולט",
  leader_message: "מסר ממנהיג/ה",
  trainings_carousel: "קרוסלת הכשרות",
  about: "אודות",
  video_testimonials: "עדויות וידאו",
  newsletter_signup: "הרשמה לניוזלטר",
  testimonials_slider: "מגלגלת המלצות",
  lecturers_grid: "רשת מרצים",
  program_stages: "שלבי התוכנית",
  photo_gallery: "גלריית תמונות",
  podcast: "פודקאסט",
  community_cta: "קריאה לפעולה — קהילה",
  latest_articles: "מאמרים אחרונים",
  closing_cta: "קריאה לפעולה — סיום",
  footer: "כותרת תחתונה (Footer)",
  global_overlays: "שכבות גלובליות",
};

type BlockDataOf<T extends BlockType> = Extract<PageBlock, { block_type: T }>["data"];

function defaultDataFor<T extends BlockType>(type: T): BlockDataOf<T> {
  const defaults: Record<BlockType, unknown> = {
    header: { logo_id: null, nav: [], secondary_cta: null, social_links: [] },
    hero: {
      eyebrow: null,
      heading: "כותרת חדשה",
      intro: "טקסט פתיחה קצר.",
      phone_cta: null,
      primary_cta_label: null,
      background_media_id: null,
    },
    intro_media: { heading: "כותרת", video_url: null, thumbnail_media_id: null },
    focus_areas: {
      heading: null,
      cards: [
        { icon: null, title: "כותרת", body: "תיאור קצר." },
        { icon: null, title: "כותרת", body: "תיאור קצר." },
        { icon: null, title: "כותרת", body: "תיאור קצר." },
      ],
    },
    pull_quote: { quote: "ציטוט לדוגמה." },
    leader_message: {
      portrait_media_id: null,
      video_url: null,
      heading: "כותרת",
      body: "טקסט המסר.",
      link: null,
    },
    trainings_carousel: { heading: "הכשרות קרובות", intro: null, featured_only: true, all_trainings_link: null },
    about: { icon: null, heading: "אודות", subheading: null, body: "טקסט אודות.", cta: null },
    video_testimonials: { heading: null, videos: [] },
    newsletter_signup: {
      heading: "הצטרפו לניוזלטר",
      body: null,
      consent_text: "בהרשמה אני מאשר/ת קבלת דיוור בהתאם למדיניות הפרטיות.",
      privacy_link: { label: "מדיניות פרטיות", href: "/privacy", open_in_new_tab: false },
    },
    testimonials_slider: { heading: null },
    lecturers_grid: { heading: null, all_lecturers_link: null },
    program_stages: { heading: null },
    photo_gallery: { gallery_id: "", heading: null },
    podcast: {
      heading: null,
      platform_cta: { label: "האזנה", href: "", open_in_new_tab: true },
    },
    community_cta: {
      heading: "הצטרפו לקהילה",
      body: "טקסט קצר.",
      cta: { label: "לפרטים", href: "", open_in_new_tab: false },
    },
    latest_articles: { heading: "מאמרים אחרונים", intro: null, all_articles_link: null },
    closing_cta: {
      icon: null,
      heading: "כותרת סיום",
      body: "טקסט קצר.",
      cta: { label: "לפעולה", href: "", open_in_new_tab: false },
    },
    footer: {
      logo_id: null,
      quick_nav_menu_id: null,
      trainings_list: true,
      newsletter_consent_text: "בהרשמה אני מאשר/ת קבלת דיוור.",
      legal_links: [],
      credits: null,
    },
    global_overlays: {
      registration_modal_enabled: true,
      upcoming_cohorts_panel_enabled: true,
      cookie_consent_enabled: true,
      chat_widget_slot: null,
      accessibility_toolbar_enabled: true,
    },
  };
  return defaults[type] as BlockDataOf<T>;
}

export function createNewBlock(type: BlockType, pageId: string, sortOrder: number): PageBlock {
  return {
    id: crypto.randomUUID(),
    page_id: pageId,
    block_type: type,
    sort_order: sortOrder,
    is_visible: true,
    data: defaultDataFor(type),
  } as PageBlock;
}

export const ALL_BLOCK_TYPES = Object.keys(BLOCK_TYPE_LABELS) as BlockType[];

/** Block types with a hand-written per-field form (task brief: build the
 * highest-value forms first, generic JSON fallback for the rest — see
 * block-form-fields.tsx for the rationale). */
export const BLOCK_TYPES_WITH_CUSTOM_FORM: BlockType[] = [
  "hero",
  "leader_message",
  "trainings_carousel",
  "about",
  "focus_areas",
  "pull_quote",
];
