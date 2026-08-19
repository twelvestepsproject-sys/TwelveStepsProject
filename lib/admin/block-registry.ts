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
  training_details: "פרטי הכשרה",
  requirements: "דרישות ההכשרה",
  faq: "שאלות נפוצות",
  reading_list: "ספרי ליבה / מקורות",
  // Training-page sections. Prefixed so they group together in the picker
  // and read as "part of the training" rather than generic content blocks.
  training_intro: "הכשרה — כותרת ופרטים",
  training_body: "הכשרה — תוכן מלא",
  training_syllabus: "הכשרה — סילבוס",
  training_instructors: "הכשרה — מרצים",
  training_registration_cta: "הכשרה — כפתור הרשמה",
  link_cards: "כרטיסיות קישור",
  certificates: "תעודות",
  syllabus_download: "סילבוס להורדה",
  semesters: "סמסטרים ומפגשים",
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
      subheading: null,
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
    // Empty selection = show featured/all (legacy behavior) until the
    // editor picks specific lecturers.
    lecturers_grid: { heading: null, all_lecturers_link: null, lecturer_ids: [] },
    program_stages: { heading: null, stage_label: null, step_label: null },
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
    // All-null: every field is optional and the renderer omits empty rows,
    // so a freshly-added block shows nothing until the editor fills it in
    // — better than seeding placeholder dates that could reach a published
    // page unedited.
    training_details: {
      heading: "פרטי ההכשרה",
      starts_on: null,
      ends_on: null,
      meeting_day: null,
      meeting_time: null,
      sessions_count: null,
      academic_hours: null,
      price: null,
      semesters_count: null,
      location: null,
      duration: null,
      cohort_number: null,
      registration_link: null,
    },
    // Starts with three empty rows so the add/remove UI is immediately
    // legible; empty rows are filtered out at render time, so saving
    // before filling them in publishes nothing stray.
    requirements: {
      heading: "דרישות ההכשרה",
      intro: null,
      items: ["", "", ""],
    },
    // Three empty pairs so the add/remove UI reads clearly on insert;
    // rows with a blank question are dropped at render time.
    faq: {
      heading: "שאלות נפוצות",
      intro: null,
      items: [
        { question: "", answer: "" },
        { question: "", answer: "" },
        { question: "", answer: "" },
      ],
    },
    reading_list: {
      heading: "ספרי ליבה",
      intro: null,
      items: [
        { title: "", cover_media_id: null, description: null, link: null },
        { title: "", cover_media_id: null, description: null, link: null },
        { title: "", cover_media_id: null, description: null, link: null },
      ],
    },
    // Training sections: `data` holds presentation choices only. Headings
    // default to null so the renderer falls back to the wording the page
    // used before it was block-based.
    training_intro: { show_cover: true, show_details: true },
    training_body: { heading: null },
    training_syllabus: { heading: null },
    training_instructors: { heading: null },
    training_registration_cta: { heading: null, cta_label: null },
    // Three empty cards: the block exists for the "choose a year" case, and
    // three is that shape. Titles are left blank rather than pre-filled with
    // "שנה א׳" — the block is generic, and blank rows are dropped at render
    // time so an unfinished block never reaches a published page.
    link_cards: {
      heading: null,
      intro: null,
      cards: [
        { title: "", body: null, image_media_id: null, link: null },
        { title: "", body: null, image_media_id: null, link: null },
        { title: "", body: null, image_media_id: null, link: null },
      ],
    },
    // Two slots: the reference design pairs the certificate with the
    // issuing body's cover. More can be added, empty ones are dropped.
    certificates: {
      heading: "התעודות שתקבלו",
      intro: null,
      items: [
        { media_id: null, caption: null },
        { media_id: null, caption: null },
      ],
    },
    // `file_url` starts empty and the renderer hides the block until it is
    // filled, so adding the block never publishes a dead button.
    syllabus_download: {
      heading: null,
      body: null,
      file_media_id: null,
      file_url: "",
      button_label: "סילבוס להורדה",
      open_in_new_tab: true,
    },
    // One semester with one session and two parts: enough structure for the
    // three-level shape to be obvious in the form, without pre-filling
    // content. Empty rows are dropped at render time.
    semesters: {
      heading: null,
      semesters: [
        {
          title: "",
          subtitle: null,
          sessions: [
            {
              label: "מפגש 1",
              date: null,
              parts: [
                { title: "שיעור א׳", body: null },
                { title: "שיעור ב׳", body: null },
              ],
            },
          ],
        },
      ],
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
  "training_details",
  "lecturers_grid",
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
  "program_stages",
];
