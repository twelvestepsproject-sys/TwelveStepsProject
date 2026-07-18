import type { Lead } from "@/lib/schemas";

/**
 * §6 `leads` — captured data, not CMS content. Unlike `categories.ts` /
 * `testimonials.ts` these rows aren't "placeholder copy the admin later
 * replaces" — a real deployment starts with an EMPTY table (§5.5's earlier
 * pass deliberately seeded `mockDb.leads` as `[]`, only ever populated by
 * the registration-modal Server Action). Per this task's brief ("If
 * there's no fixture data, add a small realistic seed set... so the screen
 * isn't empty when demoed"), this file adds 8 clearly-fictional rows. No
 * `is_placeholder` field exists on this schema (§6 doesn't give `leads`
 * one — it's captured data, not authored content) so these rows are not
 * flagged that way; they're just ordinary seed rows, fictional per this
 * project's discipline (invented names/emails/phones, no real people).
 */
export const leads = [
  {
    id: "90000000-0000-4000-8000-000000000001",
    first_name: "מיכל",
    last_name: "אבני",
    email: "michal.avni@example.com",
    phone: "050-1234567",
    source_page: "/",
    utm: { utm_source: "google", utm_medium: "cpc", utm_campaign: "hachshara-2026" },
    consent_at: "2026-06-01T09:12:00Z",
    status: "new",
    notes: null,
    created_at: "2026-06-01T09:12:00Z",
    updated_at: "2026-06-01T09:12:00Z",
  },
  {
    id: "90000000-0000-4000-8000-000000000002",
    first_name: "יוסי",
    last_name: "כהן",
    email: "yossi.cohen@example.com",
    phone: "052-2345678",
    source_page: "/tochnit-halimudim",
    utm: { utm_source: "facebook", utm_medium: "social", utm_campaign: "spring" },
    consent_at: "2026-06-03T14:30:00Z",
    status: "contacted",
    notes: "דיברנו בטלפון, מתעניינת/ מתעניין במחזור הבא. לחזור אליה בעוד שבוע.",
    created_at: "2026-06-03T14:30:00Z",
    updated_at: "2026-06-05T10:00:00Z",
  },
  {
    id: "90000000-0000-4000-8000-000000000003",
    first_name: "רותם",
    last_name: "לוי",
    email: "rotem.levi@example.com",
    phone: "054-3456789",
    source_page: "/hachshara/yesodot-hakesher",
    utm: null,
    consent_at: "2026-06-05T18:45:00Z",
    status: "converted",
    notes: "נרשמ/ה למחזור סתיו 2026.",
    created_at: "2026-06-05T18:45:00Z",
    updated_at: "2026-06-10T08:20:00Z",
  },
  {
    id: "90000000-0000-4000-8000-000000000004",
    first_name: "דנה",
    last_name: "שמעוני",
    email: "dana.shimoni@example.com",
    phone: "053-4567890",
    source_page: "/",
    utm: { utm_source: "instagram", utm_medium: "social", utm_campaign: "stories" },
    consent_at: "2026-06-07T11:05:00Z",
    status: "new",
    notes: null,
    created_at: "2026-06-07T11:05:00Z",
    updated_at: "2026-06-07T11:05:00Z",
  },
  {
    id: "90000000-0000-4000-8000-000000000005",
    first_name: "אורי",
    last_name: "פרידמן",
    email: "uri.friedman@example.com",
    phone: "050-5678901",
    source_page: "/about",
    utm: null,
    consent_at: "2026-06-09T16:00:00Z",
    status: "archived",
    notes: "לא רלוונטי כרגע — ביקש/ה לחזור בעוד שנה.",
    created_at: "2026-06-09T16:00:00Z",
    updated_at: "2026-06-12T09:00:00Z",
  },
  {
    id: "90000000-0000-4000-8000-000000000006",
    first_name: "שירה",
    last_name: "מזרחי",
    email: "shira.mizrahi@example.com",
    phone: "058-6789012",
    source_page: "/tochnit-halimudim/shana-alef",
    utm: { utm_source: "newsletter", utm_medium: "email", utm_campaign: "june-digest" },
    consent_at: "2026-06-11T08:15:00Z",
    status: "new",
    notes: null,
    created_at: "2026-06-11T08:15:00Z",
    updated_at: "2026-06-11T08:15:00Z",
  },
  {
    id: "90000000-0000-4000-8000-000000000007",
    first_name: "עומר",
    last_name: "גולן",
    email: "omer.golan@example.com",
    phone: "052-7890123",
    source_page: "/",
    utm: null,
    consent_at: "2026-06-13T12:40:00Z",
    status: "contacted",
    notes: "השאיר/ה הודעה קולית, לתאם שיחה חוזרת.",
    created_at: "2026-06-13T12:40:00Z",
    updated_at: "2026-06-14T09:30:00Z",
  },
  {
    id: "90000000-0000-4000-8000-000000000008",
    first_name: "טל",
    last_name: "ברק",
    email: "tal.barak@example.com",
    phone: "054-8901234",
    source_page: "/gallery",
    utm: { utm_source: "google", utm_medium: "organic", utm_campaign: "" },
    consent_at: "2026-06-15T15:20:00Z",
    status: "new",
    notes: null,
    created_at: "2026-06-15T15:20:00Z",
    updated_at: "2026-06-15T15:20:00Z",
  },
] satisfies Lead[];
