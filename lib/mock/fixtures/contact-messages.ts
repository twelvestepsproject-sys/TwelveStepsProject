import type { ContactMessage } from "@/lib/schemas";

/**
 * §6 `contact_messages` — captured data seed set, same reasoning as
 * leads.ts: empty by default in a real deployment, small fictional seed
 * here purely so the admin screen isn't empty when demoed.
 */
export const contactMessages = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    name: "ליאור אשכנזי",
    email: "lior.ashkenazi@example.com",
    phone: "050-1112233",
    message:
      "שלום, אשמח לקבל מידע נוסף על ההכשרה בשנה השנייה — האם יש אפשרות להצטרף באמצע השנה?",
    source_page: "/contact",
    created_at: "2026-06-02T10:00:00Z",
    updated_at: "2026-06-02T10:00:00Z",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    name: "הדר וייס",
    email: "hadar.weiss@example.com",
    phone: null,
    message: "היי, אני מתעניינת בהצטרפות לרשימת התפוצה של הפודקאסט. איפה אפשר להירשם?",
    source_page: "/contact",
    created_at: "2026-06-04T13:20:00Z",
    updated_at: "2026-06-04T13:20:00Z",
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    name: "רן קדם",
    email: "ran.kedem@example.com",
    phone: "052-2223344",
    message:
      "שלום, אני מטפל במקצועי ומעוניין לשמוע פרטים על אפשרויות הרצאה אצלכם או שיתוף פעולה.",
    source_page: "/about",
    created_at: "2026-06-06T09:45:00Z",
    updated_at: "2026-06-06T09:45:00Z",
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    name: "מאיה טל",
    email: "maya.tal@example.com",
    phone: "054-3334455",
    message: "נתקלתי בבעיה בטופס ההרשמה באתר — הכפתור לא הגיב. אשמח לעזרה.",
    source_page: "/tochnit-halimudim",
    created_at: "2026-06-08T17:10:00Z",
    updated_at: "2026-06-08T17:10:00Z",
  },
  {
    id: "a0000000-0000-4000-8000-000000000005",
    name: "איתמר שני",
    email: "itamar.shani@example.com",
    phone: null,
    message: "שלום, מה שעות הפעילות של המזכירות? רציתי לתאם שיחת ייעוץ טלפונית.",
    source_page: "/contact",
    created_at: "2026-06-10T11:30:00Z",
    updated_at: "2026-06-10T11:30:00Z",
  },
  {
    id: "a0000000-0000-4000-8000-000000000006",
    name: "נטע פרץ",
    email: "neta.peretz@example.com",
    phone: "058-4445566",
    message:
      "אשמח לקבל את פרטי ההכשרה במסמך PDF כדי לשתף עם בן/בת הזוג שלי, אם יש כזה דבר.",
    source_page: "/tochnit-halimudim/shana-bet",
    created_at: "2026-06-14T08:00:00Z",
    updated_at: "2026-06-14T08:00:00Z",
  },
] satisfies ContactMessage[];
