import type { Role } from "@/lib/schemas";

/**
 * Single source of truth for the admin sidebar. `minRole` gates visibility
 * per §7's role model (UI-layer approximation of RLS role behavior — the
 * REAL enforcement is server-side in each Server Action via
 * lib/admin/role-check.ts; this list only decides what's rendered).
 * `viewer` sees everything marked "content" or lower as read-only; the
 * create/edit/delete controls inside each screen additionally check role
 * themselves before rendering mutation UI.
 */
export interface AdminNavItem {
  href: string;
  label: string;
  minRole: Role[];
  /** Screens explicitly deferred to a later pass (task brief §"Scope") —
   * shown grayed-out with a "בקרוב" note rather than omitted, so the full
   * §8 screen list stays visible/discoverable. */
  deferred?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "לוח בקרה", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/pages", label: "עמודים", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/trainings", label: "הכשרות", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/posts", label: "מאמרים", minRole: ["admin", "editor", "viewer"] },
  // Directly under מאמרים: categories only exist to group articles, and
  // this is where an editor looks for them.
  { href: "/admin/categories", label: "קטגוריות", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/lecturers", label: "מרצים", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/testimonials", label: "המלצות", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/program-stages", label: "שלבי התוכנית", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/galleries", label: "גלריות", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/podcast", label: "פודקאסט", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/schedule", label: "לוח זמנים", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/media", label: "מדיה", minRole: ["admin", "editor", "viewer"] },
  { href: "/admin/menus", label: "תפריטים", minRole: ["admin"] },
  { href: "/admin/branding", label: "מיתוג", minRole: ["admin"] },
  { href: "/admin/settings", label: "הגדרות אתר", minRole: ["admin"], deferred: true },
  { href: "/admin/leads", label: "לידים והודעות", minRole: ["admin", "editor"] },
  { href: "/admin/redirects", label: "הפניות", minRole: ["admin"] },
  { href: "/admin/users", label: "משתמשים", minRole: ["admin"] },
];
