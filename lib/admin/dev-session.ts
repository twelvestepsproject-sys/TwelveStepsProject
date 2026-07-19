import "server-only";
import { cookies } from "next/headers";
import { roleSchema, type Role } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * lib/admin/dev-session.ts (Phase 5 update, §16).
 *
 * §16 Phase 5 instruction: "`getDevSession()`'s CALLERS (across all of
 * Phase 4's Server Actions and pages) should not need to change their
 * calling code if you preserve a compatible return shape/function name."
 * That's what this file does: every export below keeps its exact name and
 * shape. ~30 files under /app import `getDevSession` directly (see
 * app/(admin)/admin/layout.tsx and every admin screen's page.tsx) — none of
 * them changed, per the empty-diff proof.
 *
 * INTERNALS now branch on DATA_SOURCE:
 *  - DATA_SOURCE=mock: UNCHANGED cookie-based dev role stub (verbatim
 *    behavior from Phase 4) — this keeps `app/(admin)/admin/_actions/
 *    role-switch.ts` and `components/admin/role-switcher.tsx` (the visible
 *    "flip role and see the UI respond" control §16 Phase 4 required)
 *    fully working when running on mocks. Neither of those two files is
 *    the pre-flagged /admin/login exception, so they must keep working
 *    unmodified — this branch is how.
 *  - DATA_SOURCE=supabase: reads the REAL Supabase Auth session via
 *    @supabase/ssr's server client, resolves the caller's role from
 *    `profiles` (RLS-safe: a user can always read their own profiles row,
 *    see the `profiles_select_self` policy), and returns the same
 *    `{ full_name, role }` shape. `setDevRole`/`clearDevSession` become
 *    real sign-in-state no-ops in this mode (see comments on each) because
 *    there is no "flip your own role" concept with real auth — role
 *    changes happen through the Users screen (an admin editing another
 *    user's `profiles.role`), not a self-service switcher. The switcher
 *    component still renders in the DOM when logged in via Supabase (it's
 *    a /components file, out of scope to touch), but submitting it is now
 *    inert rather than dangerous — see `setDevRole` below.
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

function isSupabaseMode(): boolean {
  return process.env.DATA_SOURCE === "supabase";
}

/** DATA_SOURCE=mock path — byte-identical to the Phase 4 implementation. */
async function getMockDevSession(): Promise<DevSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) return null;
  const role = parsed.data;
  const full_name = store.get(COOKIE_NAME_NAME)?.value || ROLE_DISPLAY_NAMES[role];
  return { full_name, role };
}

/** DATA_SOURCE=supabase path — real session + role lookup from `profiles`. */
async function getSupabaseDevSession(): Promise<DevSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  const parsedRole = roleSchema.safeParse(profile.role);
  if (!parsedRole.success) return null;

  return {
    full_name: profile.full_name || user.email || "",
    role: parsedRole.data,
  };
}

/** Server Components: read the current session. Returns `null` if there is
 * no session (caller decides whether that means "redirect to /admin/login"
 * — middleware already does this for `/admin/**`). */
export async function getDevSession(): Promise<DevSession | null> {
  return isSupabaseMode() ? getSupabaseDevSession() : getMockDevSession();
}

/**
 * Server Actions only. In mock mode: unchanged cookie-set behavior (backs
 * the dev login/role-switcher). In supabase mode: intentionally a NO-OP —
 * there is no "set my own role to X" operation with real auth (role is
 * `profiles.role`, editable only by an admin via the Users screen). The
 * dev-only Server Actions that call this (`login/actions.ts`'s `devLogin`,
 * `_actions/role-switch.ts`'s `switchDevRole`) still exist as files (not
 * touched, since they're not the pre-flagged /admin/login exception... but
 * see note below) — calling them in supabase mode simply does nothing
 * rather than corrupting state.
 *
 * NOTE on login/actions.ts specifically: `app/(admin)/admin/login/page.tsx`
 * and `app/(admin)/admin/login/actions.ts` ARE the pre-flagged exception
 * (§16: "a real login page needed... This IS under /app, but... this
 * specific, pre-flagged exception is fine and expected") and HAVE been
 * replaced with a real email+password form calling Supabase Auth directly
 * — they no longer call `setDevRole` at all in the new version. This no-op
 * path only matters for `_actions/role-switch.ts`, which is NOT the
 * pre-flagged exception and therefore was left untouched; its no-op landing
 * here is what keeps it harmless rather than something to silently patch.
 */
export async function setDevRole(role: Role, fullName?: string): Promise<void> {
  if (isSupabaseMode()) {
    return; // no-op — see doc comment above
  }
  const store = await cookies();
  store.set(COOKIE_NAME, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  store.set(COOKIE_NAME_NAME, fullName || ROLE_DISPLAY_NAMES[role], {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Mock mode: clears the dev cookies. Supabase mode: signs the real session
 * out. Not currently called from any /app file (no logout button existed
 * pre-Phase-5), kept for parity/future use. */
export async function clearDevSession(): Promise<void> {
  if (isSupabaseMode()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(COOKIE_NAME_NAME);
}

export const DEV_ROLES: Role[] = ["admin", "editor", "viewer"];
export const DEV_SESSION_COOKIE_NAME = COOKIE_NAME;
