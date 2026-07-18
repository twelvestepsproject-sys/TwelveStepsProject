import type { Testimonial } from "@/lib/schemas";
import { MEDIA_IDS } from "./media";

/**
 * §5.5 / sample-content-review.md: ≥6 testimonials. The "מ." fixture is
 * kept exactly as specified — it demonstrates the fixed consent/visibility
 * interaction described in §8 (de-placeholdering with consent unchecked
 * forces is_visible=false; see the annotation on that record). All
 * additional authors are initials-only, per the established
 * consent-first pattern, all fictional.
 */
export const testimonials = [
  // ---- Locked sample fixture, verbatim ----
  {
    id: "30000000-0000-4000-8000-000000000001",
    author_name: "מ.",
    quote:
      "הגעתי בלי לדעת בדיוק מה אני מחפש. מה שקיבלתי היה מקום שיכולתי להיות בו בדיוק כמו שאני, ומשם להתחיל לזוז.",
    photo_id: MEDIA_IDS.avatarTestimonialM,
    sort_order: 1,
    is_visible: true,
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-20T08:00:00Z",
    updated_at: "2025-10-20T08:00:00Z",
  },

  // ---- Additional testimonials to reach the ≥6 minimum ----
  {
    id: "30000000-0000-4000-8000-000000000002",
    author_name: "ר.",
    quote:
      "לא חשבתי שאפשר לדבר על מה שקרה במשפחה שלנו בלי שמישהו ירגיש מואשם. כאן זה קרה.",
    photo_id: MEDIA_IDS.avatarTestimonialR,
    sort_order: 2,
    is_visible: true,
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-22T08:00:00Z",
    updated_at: "2025-10-22T08:00:00Z",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    author_name: "ד.",
    quote: "לקח לי זמן להבין שאפשר לבקש עזרה בלי שזה יהיה סימן לכישלון.",
    photo_id: MEDIA_IDS.avatarTestimonialD,
    sort_order: 3,
    is_visible: true,
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-24T08:00:00Z",
    updated_at: "2025-10-24T08:00:00Z",
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    author_name: "ש.",
    quote:
      "התוכנית נתנה לי כלים, אבל בעיקר היא נתנה לי מקום להיות מוחזק בזמן שלמדתי אותם.",
    photo_id: MEDIA_IDS.avatarTestimonialS,
    sort_order: 4,
    is_visible: true,
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-26T08:00:00Z",
    updated_at: "2025-10-26T08:00:00Z",
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    author_name: "י.",
    quote: "לא ציפיתי שדווקא הקבוצה תהיה החלק הכי משמעותי בתהליך שלי.",
    photo_id: MEDIA_IDS.avatarTestimonialY,
    sort_order: 5,
    is_visible: true,
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-28T08:00:00Z",
    updated_at: "2025-10-28T08:00:00Z",
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    author_name: "א.",
    quote: "עברתי לפה אחרי שני מקומות אחרים שלא הרגישו נכון. פה זה הרגיש נכון מהיום הראשון.",
    photo_id: MEDIA_IDS.avatarTestimonialA,
    sort_order: 6,
    is_visible: true,
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-30T08:00:00Z",
    updated_at: "2025-10-30T08:00:00Z",
  },
  {
    id: "30000000-0000-4000-8000-000000000007",
    author_name: "ת.",
    quote: "לא כל שיחה הייתה קלה. אבל כל שיחה קידמה אותי צעד קדימה.",
    photo_id: MEDIA_IDS.avatarTestimonialT,
    sort_order: 7,
    is_visible: true,
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-11-01T08:00:00Z",
    updated_at: "2025-11-01T08:00:00Z",
  },
] satisfies Testimonial[];
