import type { Page, PageBlock } from "@/lib/schemas";
import { MEDIA_IDS } from "./media";

/** Fixture gallery id — matches lib/mock/fixtures/galleries.ts's one
 * gallery instance, referenced by the homepage `photo_gallery` block below. */
const GALLERY_ID = "90000000-0000-4000-8000-000000000010";

/**
 * §6 pages + page_blocks. Only the homepage is fixtured here (Phase 3
 * builds out the rest of §4's sitemap) — its purpose in Phase 1/2 is to
 * prove the block-type shapes actually hold real data, in particular the
 * §5 block 6 `leader_message` requirement: "instantiated once per
 * principal the client has... two leaders means two page_blocks rows of
 * this type, not two block types." Two fictional leaders/principals of
 * the college are modeled here as two `leader_message` block instances,
 * ordered by sort_order like any other block.
 *
 * Not every one of the 20 §5 block types needs a homepage row to prove
 * the discriminated union works (that's covered by lib/schemas/blocks.ts
 * typechecking against the union) — this fixture demonstrates the
 * REPEATABLE / DATA-DRIVEN-PRESENCE rules specifically: leader_message
 * repeating via rows, and podcast's presence being a matter of the row
 * existing + is_visible, not a code branch (see lib/mock/fixtures/podcast.ts
 * for the underlying podcast_episodes row this block type would render).
 */

const homepageBlocks: PageBlock[] = [
  {
    id: "b0000000-0000-4000-8000-000000000001",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 1,
    is_visible: true,
    block_type: "hero",
    data: {
      eyebrow: "מכללת אשד",
      heading: "לזוז, בקצב שלך.",
      intro:
        "מקום ללמידה, לליווי, ולתהליך אישי — בקצב שמתאים לך, לא בקצב שמישהו אחר קבע בשבילך.",
      phone_cta: "03-000-0000",
      primary_cta_label: "לתיאום שיחת היכרות",
      background_media_id: MEDIA_IDS.heroBackground,
    },
  },
  {
    id: "b0000000-0000-4000-8000-00000000000b",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 2,
    is_visible: true,
    block_type: "intro_media",
    // DEV/TEST DATA ONLY — NOT REAL SITE CONTENT.
    // This video_url points to a real, independent YouTube creator's video,
    // used solely to exercise the click-to-play mechanism end-to-end (does
    // the poster render, does the click swap to a mounted iframe, does the
    // youtube-nocookie.com embed load). It is NOT owned by or licensed to
    // the fictional מכללת אשד, and must NEVER be presented as the org's own
    // content. No real video exists for this fictional org — see
    // docs/content-needed.md. Remove or replace before any real content
    // review / before Phase 4 CMS demo to a non-technical stakeholder, so
    // it's never mistaken for real site copy.
    data: {
      heading: "מכללת אשד בכמה מילים",
      video_url: "https://www.youtube.com/watch?v=Vk3poOqB9cY", // TEST DATA ONLY — see comment above
      thumbnail_media_id: MEDIA_IDS.introMediaPoster,
    },
  },
  {
    id: "b0000000-0000-4000-8000-00000000000c",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 2.1,
    is_visible: true,
    block_type: "focus_areas",
    data: {
      heading: "במה אנחנו מתמקדים",
      subheading: null,
      cards: [
        {
          icon: "🧭",
          title: "ליווי אישי לאורך התהליך",
          body: "כל תלמיד/ה מלווים אישית, לא רק מוערכים במבחן בסוף.",
        },
        {
          icon: "🤝",
          title: "עבודה קבוצתית משמעותית",
          body: "למידה מתוך התנסות אמיתית בקבוצה, לא רק מתוך תיאוריה.",
        },
        {
          icon: "🎓",
          title: "הכשרה מקצועית מוסמכת",
          body: "תוכנית לימודים מובנית שמכינה לעבודה מעשית בשטח.",
        },
      ],
    },
  },
  {
    id: "b0000000-0000-4000-8000-00000000000d",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 2.2,
    is_visible: true,
    block_type: "pull_quote",
    data: {
      quote: "שינוי אמיתי לא קורה לבד. הוא קורה כשמישהו הולך איתך את הדרך.",
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000002",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 3,
    is_visible: true,
    block_type: "leader_message",
    data: {
      portrait_media_id: null,
      video_url: null,
      heading: "מילה מהמנהלה האקדמית",
      body:
        "מכללת אשד קמה מתוך אמונה שתהליך שינוי אמיתי דורש גם מקצועיות וגם אנושיות, ושהשילוב ביניהם הוא לא פשרה — הוא התנאי להצלחה.",
      link: { label: "עוד עלינו", href: "/odot", open_in_new_tab: false },
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000003",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 3,
    is_visible: true,
    block_type: "leader_message",
    data: {
      portrait_media_id: null,
      video_url: null,
      heading: "מילה מראש התוכנית הרב־שנתית",
      body:
        "אנחנו מאמינים שהכשרה טובה נבנית לאט, מתוך ליווי אישי אמיתי — לא מתוך קיצורי דרך. זו הדרך שבה אנחנו עובדים כבר שנים.",
      link: { label: "לתוכנית הרב-שנתית", href: "/hachsharot/tochnit-rav-shnatit-lehachvanat-metaplim", open_in_new_tab: false },
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000004",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 5,
    is_visible: true,
    block_type: "trainings_carousel",
    data: {
      heading: "ההכשרות שלנו",
      intro: "מגוון מסלולים — מסדנת היכרות קצרה ועד תוכנית העומק הרב-שנתית.",
      featured_only: true,
      layout: "carousel" as const,
      all_trainings_link: { label: "לכל ההכשרות", href: "/hachsharot", open_in_new_tab: false },
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000005",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 6,
    is_visible: true,
    block_type: "program_stages",
    data: { heading: "התהליך שלנו", stage_label: null, step_label: null },
  },
  {
    id: "b0000000-0000-4000-8000-000000000006",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 7,
    is_visible: true,
    block_type: "testimonials_slider",
    data: { heading: "מה אומרים עלינו" },
  },
  {
    id: "b0000000-0000-4000-8000-000000000007",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 8,
    is_visible: true,
    block_type: "lecturers_grid",
    data: {
      heading: "המרצים שלנו",
      all_lecturers_link: { label: "לכל המרצים", href: "/odot#martsim", open_in_new_tab: false },
      // Empty = featured/all lecturers (the homepage grid's existing
      // behavior); a specific selection is a per-page editorial choice.
      lecturer_ids: [],
    },
  },
  {
    id: "b0000000-0000-4000-8000-00000000000e",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 7.1,
    is_visible: true,
    block_type: "about",
    data: {
      icon: "🌱",
      heading: "על מכללת אשד",
      subheading: "מקום שמאמין בתהליך, לא רק בתעודה",
      body:
        "מכללת אשד מכשירה אנשי ונשות מקצוע לעבודה טיפולית מתוך שילוב של ידע מקצועי מוצק וליווי אישי אמיתי. אנחנו מאמינים שהכשרה טובה נבנית בהדרגה, מתוך תרגול, משוב, וקהילה תומכת — לא מתוך קיצורי דרך.",
      cta: { label: "לכל התוכניות", href: "/tochnit-halimudim", open_in_new_tab: false },
    },
  },
  {
    id: "b0000000-0000-4000-8000-00000000000f",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 7.2,
    is_visible: true,
    block_type: "video_testimonials",
    // No real video testimonials exist for this fictional org yet — an
    // empty `videos` array is the honest state (see docs/content-needed.md),
    // rather than an invented video presented as a real graduate's story.
    data: {
      heading: "מהבוגרים והבוגרות שלנו",
      videos: [],
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000010",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 7.3,
    is_visible: true,
    block_type: "photo_gallery",
    data: {
      gallery_id: GALLERY_ID,
      heading: "רגעים מהתהליך",
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000008",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 9,
    is_visible: true,
    block_type: "latest_articles",
    data: {
      heading: "מהבלוג שלנו",
      intro: "מחשבות, כלים, וסיפורים מהעולם של מכללת אשד.",
      all_articles_link: { label: "לכל המאמרים", href: "/blog", open_in_new_tab: false },
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000009",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 10,
    is_visible: true,
    block_type: "podcast",
    data: {
      heading: "הפודקאסט שלנו",
      platform_cta: { label: "האזנה בספוטיפיי", href: "https://open.spotify.com/show/placeholder-eshed-podcast", open_in_new_tab: true },
    },
  },
  {
    id: "b0000000-0000-4000-8000-00000000000a",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 11,
    is_visible: true,
    block_type: "newsletter_signup",
    data: {
      heading: "הישארו מעודכנים",
      body: "עדכונים על תוכניות חדשות, מאמרים, ואירועי קהילה — ישר לתיבה.",
      consent_text: "בהרשמה אני מאשר/ת קבלת דיוור בהתאם למדיניות הפרטיות.",
      privacy_link: { label: "מדיניות פרטיות", href: "/privacy", open_in_new_tab: false },
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000011",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 12,
    is_visible: true,
    block_type: "community_cta",
    data: {
      heading: "מוזמנים להצטרף לקהילה שלנו",
      body: "קבוצת הווטסאפ שלנו היא מקום לשיתוף, שאלות, ועדכונים בין הבוגרים והתלמידים הנוכחיים.",
      cta: {
        label: "הצטרפות לקבוצת הווטסאפ",
        href: "https://chat.whatsapp.com/example-eshed-placeholder",
        open_in_new_tab: true,
      },
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000012",
    page_id: "b0000000-0000-4000-8000-000000000000",
    sort_order: 13,
    is_visible: true,
    block_type: "closing_cta",
    data: {
      icon: "☎️",
      heading: "מוכנים לעשות את הצעד הראשון?",
      body: "קבעו שיחת היכרות קצרה וללא התחייבות, ונראה יחד איזו תוכנית מתאימה לכם.",
      cta: { label: "לתיאום שיחת היכרות", href: "#registration-modal", open_in_new_tab: false },
    },
  },
];

/**
 * `/odot` (About) — Phase 3 page-types task. JUDGMENT CALL: no dedicated
 * "about page" content model exists in §6, and `getPage`'s signature is
 * already a generic slug lookup — so `/odot` is built the same way as the
 * homepage, a `page_blocks` composition under a new `odot` page row, reusing
 * the existing `about` and `lecturers_grid` block types rather than adding
 * new schema. `lecturers_grid`'s block renders the full `#martsim` anchor
 * section the sitemap calls for (`/[about]` + "#lecturers anchor" — see
 * app/(site)/odot/page.tsx for where the `id="martsim"` anchor itself lives,
 * since the anchor target is a DOM landmark around the block, not part of
 * the block's own data shape).
 */
const odotBlocks: PageBlock[] = [
  {
    id: "b0000000-0000-4000-8000-000000000101",
    page_id: "b0000000-0000-4000-8000-000000000100",
    sort_order: 1,
    is_visible: true,
    block_type: "about",
    data: {
      icon: "🌱",
      heading: "אודות מכללת אשד",
      subheading: "מקום שמאמין בתהליך, לא רק בתעודה",
      body:
        "מכללת אשד הוקמה מתוך רצון להכשיר אנשי ונשות מקצוע לעבודה טיפולית, מתוך שילוב של ידע מקצועי מוצק וליווי אישי אמיתי. " +
        "אנחנו מאמינים שהכשרה טובה נבנית בהדרגה, מתוך תרגול, משוב, וקהילה תומכת — לא מתוך קיצורי דרך.\n\n" +
        "התוכניות שלנו משלבות תיאוריה, התנסות מודרכת, וליווי אישי צמוד, כדי שכל מי שלומד/ת אצלנו ייצא/תצא מוכן/ה לעבודה מעשית בשטח, לא רק עם תעודה.",
      cta: { label: "לתוכניות הלימוד", href: "/tochnit-halimudim", open_in_new_tab: false },
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000102",
    page_id: "b0000000-0000-4000-8000-000000000100",
    sort_order: 2,
    is_visible: true,
    block_type: "lecturers_grid",
    data: {
      heading: "המרצים והמדריכים שלנו",
      all_lecturers_link: null,
      lecturer_ids: [],
    },
  },
];

/**
 * `/tochnit-halimudim` (Studies hub) — Phase 3 page-types task. JUDGMENT
 * CALL, documented in full in the final report: no fixture data or schema
 * exists for a "studies hub" hierarchy distinct from `trainings` (§6 has no
 * `program`/`studies` table, only `trainings` and `program_stages`). Rather
 * than inventing a new parallel content model un-flagged, this hub page is
 * built as a `page_blocks` composition — `about` (hub intro copy) +
 * `program_stages` (the org's own stage/step structure, already fixtured)
 * + `trainings_carousel` (linking into the real `trainings` collection,
 * since the multi-year program IS one of the fixtured `trainings` rows:
 * `tochnit-rav-shnatit-lehachvanat-metaplim`). The year sub-pages
 * (`/tochnit-halimudim/[year-slug]`) are a genuine content gap — flagged in
 * docs/content-needed.md rather than fabricated; a small ADDITIVE
 * `studyYears` fixture (see app/(site)/tochnit-halimudim/[year-slug]/page.tsx)
 * covers just enough shape (slug, label, short description) to prove the
 * route/static-params/percent-encoded-slug mechanics work honestly, without
 * pretending it's a fully modeled entity.
 */
const studiesHubBlocks: PageBlock[] = [
  {
    id: "b0000000-0000-4000-8000-000000000201",
    page_id: "b0000000-0000-4000-8000-000000000200",
    sort_order: 1,
    is_visible: true,
    block_type: "about",
    data: {
      icon: "📚",
      heading: "תוכנית הלימודים",
      subheading: "מסלול רב־שנתי, בנוי בהדרגה",
      body:
        "תוכנית הלימודים של מכללת אשד נפרשת על פני מספר שנות לימוד, ומשלבת תיאוריה, תרגול קבוצתי, וליווי אישי לאורך כל הדרך. " +
        "כל שנה בונה על קודמתה, מהיסודות התיאורטיים ועד היציאה לעבודה עצמאית בשטח.",
      cta: { label: "לכל ההכשרות", href: "/hachsharot", open_in_new_tab: false },
    },
  },
  {
    id: "b0000000-0000-4000-8000-000000000202",
    page_id: "b0000000-0000-4000-8000-000000000200",
    sort_order: 2,
    is_visible: true,
    block_type: "program_stages",
    data: { heading: "שלבי התהליך לאורך התוכנית", stage_label: null, step_label: null },
  },
  {
    id: "b0000000-0000-4000-8000-000000000203",
    page_id: "b0000000-0000-4000-8000-000000000200",
    sort_order: 3,
    is_visible: true,
    block_type: "trainings_carousel",
    data: {
      heading: "התוכניות שלנו",
      intro: "המסלול הרב-שנתי, וההכשרות הנלוות אליו.",
      featured_only: true,
      layout: "carousel" as const,
      all_trainings_link: { label: "לכל ההכשרות", href: "/hachsharot", open_in_new_tab: false },
    },
  },
];

export const pages = [
  {
    id: "b0000000-0000-4000-8000-000000000000",
    slug: "home",
    title: "עמוד הבית",
    status: "published",
    published_at: "2025-09-01T08:00:00Z",
    template: "home",
    blocks: homepageBlocks,
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "b0000000-0000-4000-8000-000000000100",
    slug: "odot",
    title: "אודות",
    status: "published",
    published_at: "2025-09-01T08:00:00Z",
    template: "about",
    blocks: odotBlocks,
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "b0000000-0000-4000-8000-000000000200",
    slug: "tochnit-halimudim",
    title: "תוכנית הלימודים",
    status: "published",
    published_at: "2025-09-01T08:00:00Z",
    template: "studies-hub",
    blocks: studiesHubBlocks,
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
] satisfies Page[];
