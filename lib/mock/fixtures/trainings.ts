import type { Training } from "@/lib/schemas";
import { lecturers } from "./lecturers";
import { MEDIA_IDS } from "./media";

const byId = Object.fromEntries(lecturers.map((l) => [l.id, l]));
const noaSagi = byId["20000000-0000-4000-8000-000000000001"];
const danielAviram = byId["20000000-0000-4000-8000-000000000002"];
const shiraNachmani = byId["20000000-0000-4000-8000-000000000003"];

/**
 * §5.5 / sample-content-review.md: ≥5 trainings. The three sample-review
 * trainings (tekhilat-derech, yesodot-hakesher, tochnit-rav-shnatit...)
 * are reproduced verbatim below. Two more are added with hour/session
 * counts that deliberately avoid 30 sessions / 120 hours (the competitor
 * figures we agreed not to draw from) and don't cluster near them either.
 */
export const trainings = [
  // ---- Locked sample fixtures, verbatim ----
  {
    id: "40000000-0000-4000-8000-000000000001",
    slug: "tekhilat-derech",
    title: "תחילת דרך — סדנת היכרות",
    excerpt: "סדנה קצרה למי שרוצה להתחיל ולראות אם התהליך מתאים.",
    body:
      "סדנת ההיכרות היא הזדמנות קצרה וממוקדת להתרשם מהגישה של מכללת אשד, בלי התחייבות לתהליך ארוך. " +
      "מיועדת למי ששוקל/ת ללמוד או להצטרך לתהליך אישי, ורוצה להרגיש את האווירה לפני שמחליטים.",
    cover_image_id: null,
    starts_on: "2026-09-01",
    ends_on: "2026-09-15",
    meeting_day: "ימי חמישי",
    meeting_time: "18:00–20:00",
    academic_hours: 8,
    sessions_count: 2,
    instructors: [],
    syllabus: [
      { title: "מפגש 1", body: "היכרות עם הגישה, ציפיות, ושאלות פתוחות." },
      { title: "מפגש 2", body: "תרגול קצר וסיכום, כולל הכוונה להמשך אפשרי." },
    ],
    price: null,
    registration_url: null,
    is_featured: false,
    status: "published",
    sort_order: 1,
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
    id: "40000000-0000-4000-8000-000000000002",
    slug: "yesodot-hakesher",
    title: "יסודות הקשר — הכשרה שנתית לליווי זוגי ומשפחתי",
    excerpt: "תוכנית שנתית להעמקת ההבנה של דפוסי קשר — האישיים, והמקצועיים.",
    body:
      "תוכנית זו מיועדת למי שרוצה להעמיק את העבודה עם זוגות ומשפחות מתוך הבנה של דפוסי היקשרות, תקשורת, ותהליכי שינוי משותפים. " +
      "הלמידה משלבת תיאוריה, תרגול בקבוצה קטנה, וליווי אישי.",
    cover_image_id: MEDIA_IDS.trainingYesodotHakesherCover,
    starts_on: "2026-10-06",
    ends_on: "2027-06-30",
    meeting_day: "ימי שלישי",
    meeting_time: "17:00–20:00",
    academic_hours: 96,
    sessions_count: 24,
    instructors: [noaSagi],
    syllabus: [
      { title: "רבעון 1", body: "יסודות תיאורטיים של דפוסי היקשרות ותקשורת זוגית." },
      { title: "רבעון 2", body: "תרגול בקבוצה קטנה וליווי מקרים." },
      { title: "רבעון 3", body: "שילוב, סיכום, והכנה להמשך עבודה עצמאית." },
    ],
    price: null,
    registration_url: null,
    is_featured: true,
    status: "published",
    sort_order: 2,
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
    id: "40000000-0000-4000-8000-000000000003",
    slug: "tochnit-rav-shnatit-lehachvanat-metaplim",
    title: "התוכנית הרב־שנתית להכשרת מלווים ומלוות בתהליכי שינוי אישי ומשפחתי",
    excerpt: "תוכנית העומק המרכזית של אשד — לימוד מתמשך, ליווי אישי, ותרגול קבוצתי לאורך שלוש שנים.",
    body:
      "התוכנית הרב־שנתית היא מסלול ההכשרה המרכזי של מכללת אשד. שלוש שנות לימוד המשלבות תיאוריה מעמיקה, " +
      "התנסות מודרכת, וליווי אישי צמוד לאורך כל הדרך — מהצעד הראשון ועד ליציאה לעבודה עצמאית.",
    cover_image_id: null,
    starts_on: "2026-10-20",
    ends_on: "2029-06-30",
    meeting_day: "ימי שני ורביעי",
    meeting_time: "16:00–20:00",
    academic_hours: 310,
    sessions_count: 90,
    instructors: [noaSagi, danielAviram, shiraNachmani],
    syllabus: [
      { title: "שנה א׳", body: "יסודות תיאורטיים ומיומנויות בסיס." },
      { title: "שנה ב׳", body: "התמחות והתנסות מודרכת בליווי אמיתי." },
      { title: "שנה ג׳", body: "עבודה עצמאית מלווה והכנה ליציאה לשטח." },
    ],
    price: null,
    registration_url: null,
    is_featured: true,
    status: "published",
    sort_order: 3,
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },

  // ---- Additional trainings to reach the ≥5 minimum ----
  {
    id: "40000000-0000-4000-8000-000000000004",
    slug: "tikshoret-vetahalich-mishpachti",
    title: "תקשורת ותהליך משפחתי — הכשרה דו־שנתית",
    excerpt: "הכשרה מעמיקה לעבודה עם משפחות בתהליכי שינוי ותקשורת פנים-משפחתית.",
    body:
      "תוכנית דו־שנתית המיועדת למי שכבר צברו ניסיון בסיסי בליווי, ורוצים להתמחות בעבודה משפחתית מורכבת. " +
      "משלבת סמינרים חודשיים, קבוצת אינטרוויזיה, וליווי מקרה אישי.",
    cover_image_id: null, // TODO: real cover pending image-sourcing pass
    starts_on: "2026-11-03",
    ends_on: "2028-06-30",
    meeting_day: "ימי רביעי",
    meeting_time: "17:30–20:30",
    academic_hours: 168,
    sessions_count: 42,
    instructors: [danielAviram],
    syllabus: [
      { title: "שנה א׳", body: "תיאוריה משפחתית מערכתית ותרגול בסיסי." },
      { title: "שנה ב׳", body: "ליווי מקרה, אינטרוויזיה, והתמחות." },
    ],
    price: null,
    registration_url: null,
    is_featured: false,
    status: "published",
    sort_order: 4,
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-09-05T08:00:00Z",
    updated_at: "2025-09-05T08:00:00Z",
  },
  {
    id: "40000000-0000-4000-8000-000000000005",
    slug: "sadna-kevutzatit-lehanchayat-tahalichim",
    title: "סדנה קבוצתית להנחיית תהליכים",
    excerpt: "סדנת המשך קצרה למי שרוצה להעמיק במיומנויות הנחיית קבוצה.",
    body:
      "סדנה בת מספר מפגשים, מיועדת למי שמחפש/ת להעמיק את מיומנויות ההנחיה הקבוצתית שלו/ה, " +
      "עם דגש על תרגול חי ומשוב מיידי בקבוצה קטנה.",
    cover_image_id: null, // TODO: real cover pending image-sourcing pass
    starts_on: "2026-12-01",
    ends_on: "2027-01-19",
    meeting_day: "ימי שני",
    meeting_time: "18:00–21:00",
    academic_hours: 21,
    sessions_count: 7,
    instructors: [shiraNachmani],
    syllabus: [
      { title: "מפגשים 1–3", body: "יסודות הנחיה ותרגול בזוגות." },
      { title: "מפגשים 4–7", body: "תרגול קבוצתי מלא ומשוב אישי." },
    ],
    price: null,
    registration_url: null,
    is_featured: false,
    status: "published",
    sort_order: 5,
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-09-08T08:00:00Z",
    updated_at: "2025-09-08T08:00:00Z",
  },
] satisfies Training[];
