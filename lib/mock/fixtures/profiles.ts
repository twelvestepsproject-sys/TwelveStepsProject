import type { Profile } from "@/lib/schemas";

/**
 * §6 `profiles` — mirrors `auth.users`, which doesn't exist until Phase 5
 * (§16). Seeded with a small starter set so the Users screen isn't empty:
 * the developer running this project, plus two fictional colleagues at
 * different roles, so "set role" has more than one row to exercise against.
 * Admin/system table — no `is_placeholder` (see redirects.ts's header for
 * the same reasoning: §6 only requires that flag on content tables).
 */
export const profiles = [
  {
    id: "80000000-0000-4000-8000-000000000001",
    role: "admin",
    full_name: "אהרון רייס",
    email: "aharon.reiss@gmail.com",
    avatar_id: null,
    is_active: true,
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-01T08:00:00Z",
  },
  {
    id: "80000000-0000-4000-8000-000000000002",
    role: "editor",
    full_name: "נועה שגיא",
    email: "noa.shagia@example.com",
    avatar_id: null,
    is_active: true,
    created_at: "2025-10-02T08:00:00Z",
    updated_at: "2025-10-02T08:00:00Z",
  },
  {
    id: "80000000-0000-4000-8000-000000000003",
    role: "viewer",
    full_name: "עידו ברקאי",
    email: "ido.barkai@example.com",
    avatar_id: null,
    is_active: true,
    created_at: "2025-10-03T08:00:00Z",
    updated_at: "2025-10-03T08:00:00Z",
  },
] satisfies Profile[];
