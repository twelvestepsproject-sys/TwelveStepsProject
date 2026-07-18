import type { Redirect } from "@/lib/schemas";

/**
 * §6 `redirects` — "admin-editable, applied in middleware." This table is
 * genuinely empty at this stage of a real project: nothing has moved or
 * been renamed yet, so there's nothing to redirect FROM. Two example rows
 * ship here purely so the CRUD screen isn't demoed against a blank table —
 * both are clearly-fictional "we renamed a page" scenarios, not real
 * redirects this project needs. `redirects` is a §6 "Admin/system" table,
 * not a content collection, so unlike `categories.ts`/`testimonials.ts` it
 * has no `is_placeholder` field (see redirectSchema — §6 only requires
 * `is_placeholder` on "every content table," and §7/§8 treat redirects as
 * admin/system data, same bucket as `profiles`/`revisions`/`audit_log`).
 */
export const redirects = [
  {
    id: "70000000-0000-4000-8000-000000000001",
    from_path: "/hachshara",
    to_path: "/tochnit-halimudim",
    status_code: 301,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
  {
    id: "70000000-0000-4000-8000-000000000002",
    from_path: "/blog-old",
    to_path: "/blog",
    status_code: 301,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
] satisfies Redirect[];
