import "server-only";
import { cookies } from "next/headers";
import { query } from "@/lib/pg/client";
import { verifyPassword } from "./password";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  verifySessionToken,
} from "./session";

/**
 * Server-side auth for self-hosted mode — what Supabase Auth (GoTrue) did.
 *
 * The authorization model is unchanged: callers still go through
 * getDevSession() -> requireContentRole(), and the role still comes from
 * `profiles.role` on every request. This file only replaces the identity
 * half — proving *who* is asking. Per the migration decision, enforcement
 * lives in the server layer rather than in RLS, since a single pooled
 * connection has no per-request database role to attach policies to.
 */

export interface AuthUser {
  id: string;
  email: string;
}

interface UserRow {
  id: string;
  email: string;
  encrypted_password: string;
  is_active: boolean | null;
}

/**
 * Verifies credentials and, on success, sets the session cookie.
 * Returns null for every failure mode — wrong email, wrong password,
 * deactivated account — so the caller cannot leak which one it was.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const { rows } = await query<UserRow>(
    `select u.id, u.email::text as email, u.encrypted_password, p.is_active
       from auth.users u
       left join public.profiles p on p.id = u.id
      where u.email = $1`,
    [email.trim().toLowerCase()],
  );

  const user = rows[0];
  if (!user) {
    // Hash a dummy value anyway: returning early on an unknown email would
    // make "user exists" measurable from response timing alone.
    await verifyPassword(password, "scrypt$131072$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    return null;
  }

  if (!(await verifyPassword(password, user.encrypted_password))) return null;

  // A profile row is created by the on_auth_user_created trigger, so its
  // absence means a broken account, not a legacy one.
  if (user.is_active !== true) return null;

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, await createSessionToken(user.id), SESSION_COOKIE_OPTIONS);

  await query(`update auth.users set last_sign_in_at = now() where id = $1`, [user.id]);

  return { id: user.id, email: user.email };
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/** The signed-in user, or null. Verifies the cookie signature every call. */
export async function getAuthUser(): Promise<AuthUser | null> {
  let token: string | undefined;
  try {
    token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  } catch {
    // No request context (build-time prerender). Same meaning as no cookie:
    // an anonymous caller, which is what static generation should see.
    return null;
  }
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const { rows } = await query<{ id: string; email: string }>(
    `select id, email::text as email from auth.users where id = $1`,
    [payload.sub],
  );
  return rows[0] ?? null;
}
