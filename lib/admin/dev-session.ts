import "server-only";
import { cookies } from "next/headers";
import { roleSchema, type Role } from "@/lib/schemas";

/**
 * §16 Phase 4 note: "Auth stubbed with a dev role switcher." Real Supabase
 * Auth replaces this entirely in Phase 5 — nothing here survives the swap.
 *
 * FIX (this task): the previous version stored `currentRole` in a plain
 * module-level variable. That does NOT reliably persist per-request in
 * Next.js — Server Components and Server Actions can run in different
 * invocations/workers, and in production each request can even hit a fresh
 * module instance, so the role would silently reset. This version is
 * cookie-backed: a plain, clearly-dev-only, unsigned cookie holding the
 * current role. No real security is implied or needed — this is explicitly
 * temporary scaffolding (§16), not a security boundary. It IS real enough to:
 *  - survive navigation and a full page reload,
 *  - be read identically from Server Components (`getDevSession`) and from
 *    Server Actions (`setDevRole` / `requireRole` below),
 *  - be read from `middleware.ts` (Edge-compatible: no node APIs here).
 *
 * DESIGN DECISION (documented per task brief): no `/admin/login` credential
 * form — there is no real credential to check yet, so a fake password box
 * would be theater. Instead, `/admin/login` is a minimal ROLE PICKER: three
 * buttons ("כניסה כמנהל/כעורך/כצופה"). Visiting `/admin/**` without the
 * dev-session cookie redirects here (via middleware). This matches the
 * spirit of §7's role model without pretending to be real Supabase Auth.
 */

const COOKIE_NAME = "dev_session_role";
const COOKIE_NAME_NAME = "dev_session_name";

export interface DevSession {
  full_name: string;
  role: Role;
}

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  admin: "מנהל/ת פיתוח (דמה)",
  editor: "עורך/ת תוכן (דמה)",
  viewer: "צופה (דמה)",
};

/** Server Components: read the current dev session from the cookie. Returns
 * `null` if no session cookie is set yet (caller decides whether that means
 * "redirect to /admin/login" — middleware already does this for `/admin/**`,
 * but this stays nullable so it's honest about the unauthenticated case). */
export async function getDevSession(): Promise<DevSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) return null;
  const role = parsed.data;
  const full_name = store.get(COOKIE_NAME_NAME)?.value || ROLE_DISPLAY_NAMES[role];
  return { full_name, role };
}

/** Server Actions only (cookies() is write-capable there, not in Server
 * Components/Route Handlers rendering a response). Used by the role-switcher
 * control and the login/role-picker page. */
export async function setDevRole(role: Role, fullName?: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Explicitly NOT `secure`-only-in-prod-locked; this is dev-only
    // scaffolding removed entirely in Phase 5, not a hardened cookie.
    maxAge: 60 * 60 * 24 * 30,
  });
  store.set(COOKIE_NAME_NAME, fullName || ROLE_DISPLAY_NAMES[role], {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearDevSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(COOKIE_NAME_NAME);
}

export const DEV_ROLES: Role[] = ["admin", "editor", "viewer"];
export const DEV_SESSION_COOKIE_NAME = COOKIE_NAME;
