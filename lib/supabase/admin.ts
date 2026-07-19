import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * lib/supabase/admin.ts (Phase 5, §12) — the ONLY place the service-role
 * key is used. This client BYPASSES RLS entirely, so it must never be used
 * for anything a normal authenticated request could do through
 * `lib/supabase/server.ts`.
 *
 * Legitimate uses in this codebase (each call site must carry its own
 * comment explaining why RLS must be bypassed there):
 *  - Creating a Supabase Auth user server-side (§7 "no public sign-up —
 *    admins are created by an existing admin, server-side" — the
 *    Admin API's `auth.admin.createUser` requires the service role; there
 *    is no anon/authenticated-role equivalent, by Supabase's own design).
 *
 * Never imported by `lib/queries/supabase/*` for ordinary reads/writes —
 * those exclusively use the request-scoped client from `server.ts`, which
 * is subject to RLS like any other caller.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "createSupabaseAdminClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set. This client is server-only and must never be reachable from a client-facing path.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
