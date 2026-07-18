import type { Lecturer } from "@/lib/schemas";
import { MEDIA_IDS } from "./media";

/**
 * §5.5 / sample-content-review.md: ≥8 lecturers. The three sample-review
 * lecturers (נועה שגיא, דניאל אבירם, שירה נחמני) are kept exactly as
 * specified — is_visible/is_featured/consent_on_file values unchanged.
 * 5 more added, mid-length bios, DiceBear avatars downloaded and
 * committed to /lib/mock/fixtures/images/ (see docs/licenses.md).
 *
 * Character-count extremes (measured, not eyeballed):
 *  - נועה שגיא.role: 16 chars (target 12–18 short ✓)
 *  - דניאל אבירם.role: 84 chars (target 70–90 long ✓)
 */
export const lecturers = [
  // ---- Locked sample fixtures, verbatim ----
  {
    id: "20000000-0000-4000-8000-000000000001",
    name: "נועה שגיא",
    role: "מרצה בכירה, זוגי",
    bio: "נועה מלווה קבוצות ויחידים בתחום הזוגיות והמשפחה שנים רבות, מתוך אמונה שכל קשר — גם כשהוא נשבר — נושא בתוכו דרך אפשרית לתיקון.",
    photo_id: MEDIA_IDS.avatarNoaSagi,
    sort_order: 1,
    is_featured: true,
    is_visible: true,
    page_slug: "noa-sagi",
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-05T08:00:00Z",
    updated_at: "2025-10-05T08:00:00Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    name: "דניאל אבירם",
    role: "מדריך תוכניות ליווי לאנשי מקצוע בתחומי הטראומה, ההתמכרויות, והעבודה המשפחתית המורכבת",
    bio: "דניאל מגיע מרקע של עבודה קהילתית ומאמין בשילוב בין תיאוריה מוצקה לבין נוכחות אנושית פשוטה בחדר.",
    photo_id: MEDIA_IDS.avatarDanielAviram,
    sort_order: 2,
    is_featured: false,
    is_visible: true,
    page_slug: "daniel-aviram",
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-05T08:00:00Z",
    updated_at: "2025-10-05T08:00:00Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    name: "שירה נחמני",
    role: "מרצה, תוכנית רב־שנתית",
    bio: "שירה מתמחה בליווי קבוצתי ארוך טווח ובעבודה עם תהליכי שינוי מורכבים.",
    photo_id: MEDIA_IDS.avatarShiraNachmani,
    sort_order: 3,
    is_featured: false,
    is_visible: false,
    page_slug: null,
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-05T08:00:00Z",
    updated_at: "2025-10-05T08:00:00Z",
  },

  // ---- Additional lecturers to reach the ≥8 minimum ----
  {
    id: "20000000-0000-4000-8000-000000000004",
    name: "יעל ברקאי",
    role: "מרצה, התפתחות אישית",
    bio: "יעל מלמדת ומלווה קבוצות בתחום ההתפתחות האישית, עם דגש על עבודה גופנית-רגשית משולבת.",
    photo_id: MEDIA_IDS.avatarYaelBarkai,
    sort_order: 4,
    is_featured: true,
    is_visible: true,
    page_slug: "yael-barkai",
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-10T08:00:00Z",
    updated_at: "2025-10-10T08:00:00Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    name: "איתמר כהן-לוי",
    role: "מדריך, עבודה קבוצתית",
    bio: "איתמר מתמחה בהנחיית קבוצות תהליכיות ובבניית מרחב בטוח לשיתוף בתוך קבוצה.",
    photo_id: MEDIA_IDS.avatarItamarCohenLevy,
    sort_order: 5,
    is_featured: false,
    is_visible: true,
    page_slug: "itamar-cohen-levy",
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-10T08:00:00Z",
    updated_at: "2025-10-10T08:00:00Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    name: "מעיין פרץ",
    role: "מרצה, ליווי הורים",
    bio: "מעיין מתמחה בליווי הורים בתקופות מעבר ושינוי במשפחה, מתוך ראייה מערכתית רחבה.",
    photo_id: MEDIA_IDS.avatarMaayanPeretz,
    sort_order: 6,
    is_featured: false,
    is_visible: true,
    page_slug: "maayan-peretz",
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-12T08:00:00Z",
    updated_at: "2025-10-12T08:00:00Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000007",
    name: "תומר אשכנזי",
    role: "מדריך, מיומנויות תקשורת",
    bio: "תומר מלמד כלים מעשיים לתקשורת זוגית ומשפחתית, משלב תרגול חווייתי בכל מפגש.",
    photo_id: MEDIA_IDS.avatarTomerAshkenazi,
    sort_order: 7,
    is_featured: false,
    is_visible: true,
    page_slug: "tomer-ashkenazi",
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-14T08:00:00Z",
    updated_at: "2025-10-14T08:00:00Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000008",
    name: "רותם גיל",
    role: "מרצה, התמכרויות והחלמה",
    bio: "רותם מלווה תהליכי החלמה מהתמכרות מתוך גישה מכילה, לא שיפוטית, ומבוססת על ניסיון עשיר בשטח.",
    photo_id: MEDIA_IDS.avatarRotemGil,
    sort_order: 8,
    is_featured: false,
    is_visible: true,
    page_slug: "rotem-gil",
    consent_on_file: false,
    is_placeholder: true,
    created_at: "2025-10-16T08:00:00Z",
    updated_at: "2025-10-16T08:00:00Z",
  },
] satisfies Lecturer[];
