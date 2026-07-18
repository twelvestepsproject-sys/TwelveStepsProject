import "server-only";
import { getDevSession } from "@/lib/admin/dev-session";
import type { Role } from "@/lib/schemas";

/**
 * §7 role model, enforced server-side ("never trust the client"). Every
 * mutating Server Action in `/admin` must call one of these BEFORE touching
 * `db`. Hiding a button in the UI is not enough — a `viewer` posting
 * straight to the Server Action must still be rejected here.
 *
 * Role model (§7 / §8):
 *  - viewer: read-only everywhere.
 *  - editor: CRUD on content tables (trainings, posts, lecturers,
 *    testimonials, program stages, galleries, podcast, schedule, media,
 *    pages) — no users, no settings/branding.
 *  - admin: everything, including settings/branding/users (not built this
 *    pass, but the check exists so those screens can reuse it later).
 */

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

const CONTENT_ROLES: Role[] = ["admin", "editor"];
const SETTINGS_ROLES: Role[] = ["admin"];

async function currentRole(): Promise<Role | null> {
  const session = await getDevSession();
  return session?.role ?? null;
}

/** For content-mutation Server Actions (trainings, posts, lecturers, …). */
export async function requireContentRole(): Promise<Role> {
  const role = await currentRole();
  if (!role) {
    throw new AdminAuthError("יש להתחבר כדי לבצע פעולה זו.");
  }
  if (!CONTENT_ROLES.includes(role)) {
    throw new AdminAuthError("צפייה בלבד — אין הרשאה לערוך תוכן. יש להתחבר כעורך/ת או כמנהל/ת.");
  }
  return role;
}

/** For settings/branding/users Server Actions (admin only). Not used by any
 * screen built in this pass, but established here so those screens don't
 * reinvent the role model when they're built. */
export async function requireAdminRole(): Promise<Role> {
  const role = await currentRole();
  if (!role) {
    throw new AdminAuthError("יש להתחבר כדי לבצע פעולה זו.");
  }
  if (!SETTINGS_ROLES.includes(role)) {
    throw new AdminAuthError("פעולה זו זמינה למנהל/ת מערכת בלבד.");
  }
  return role;
}
