import type { Category } from "@/lib/schemas";

/**
 * §5.5 / sample-content-review.md: at least תהליך אישי, זוגיות ומשפחה,
 * קהילה, קול הבוגרים — plus 2 more to comfortably exceed the ≥3 minimum.
 * All fictional, all is_placeholder: true.
 */
export const categories = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    slug: "tahalich-ishi",
    name: "תהליך אישי",
    description: "מאמרים על תהליכי התפתחות אישית, הכרות עצמית, והתמודדות עם רגעים של שינוי.",
    is_placeholder: true,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    slug: "zugiyut-umishpacha",
    name: "זוגיות ומשפחה",
    description: "על קשרים קרובים — בין בני זוג, בין הורים לילדים, ובתוך המשפחה הרחבה.",
    is_placeholder: true,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    slug: "kehila",
    name: "קהילה",
    description: "סיפורים ורעיונות מתוך הקהילה של מכללת אשד — מפגשים, אירועים, ותמיכה הדדית.",
    is_placeholder: true,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
  {
    id: "c0000000-0000-4000-8000-000000000004",
    slug: "kol-habogrim",
    name: "קול הבוגרים",
    description: "מי שסיימו תהליך או תוכנית משתפים במילים שלהם מה השתנה עבורם.",
    is_placeholder: true,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
  {
    id: "c0000000-0000-4000-8000-000000000005",
    slug: "gvulot-uvriut-nafshit",
    name: "גבולות ובריאות נפשית",
    description: "כלים ומחשבות על שמירה על גבולות אישיים ועל בריאות נפשית לאורך זמן.",
    is_placeholder: true,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
  {
    id: "c0000000-0000-4000-8000-000000000006",
    slug: "hachshara-miktsoit",
    name: "הכשרה מקצועית",
    description: "תוכן למטפלים ולאנשי מקצוע בתחילת דרכם או בהעמקת ההתמחות שלהם.",
    is_placeholder: true,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
] satisfies Category[];
