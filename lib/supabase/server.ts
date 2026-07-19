import "server-only";
import { createServerClient, createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * lib/supabase/server.ts (Phase 5, §12). The ONLY way `lib/queries/supabase`
 * and the auth/session layer talk to Postgres/Auth as the calling user —
 * reads/writes go through this client, so every request is subject to RLS
 * (§7). Never a service-role bypass for normal reads/writes (see
 * lib/supabase/admin.ts for the narrow, explicitly-flagged exception).
 *
 * Uses `@supabase/ssr`'s `createServerClient`, reading/writing cookies via
 * Next's `cookies()` — the standard App Router pattern. Must be created
 * fresh per request (cookies() is request-scoped), never module-level
 * cached.
 *
 * FRICTION FLAGGED (discovered running `pnpm build` with DATA_SOURCE=supabase,
 * not silently patched): several public pages call `generateStaticParams`
 * at BUILD TIME (e.g. app/(site)/blog/[slug]/page.tsx calling
 * `db.listPosts()`), which has no HTTP request and therefore no
 * `cookies()` — Next.js throws "used cookies() inside generateStaticParams"
 * if this file always calls `cookies()` unconditionally. The `DataSource`
 * interface itself has no way to distinguish "build-time static param
 * enumeration" from "a real request" — every method just gets called.
 * Rather than changing the interface (not authorized without flagging
 * first, per the task brief) or threading a "build context" flag through
 * every `/app` page's `generateStaticParams` (which WOULD be an `/app`
 * change — forbidden), the fix lives entirely here: detect whether
 * `cookies()` is actually usable, and fall back to a plain anon-only
 * client (no cookie adapter) when it isn't. This is behaviorally correct,
 * not just a workaround: `generateStaticParams` always wants PUBLISHED
 * content only (it's pre-rendering public pages), which is exactly what
 * anon-level RLS already restricts every unauthenticated caller to — so a
 * cookie-less anon client at build time returns the identical rows an
 * anon site visitor would see.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  try {
    const cookieStore = await cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options);
              }
            } catch {
              // setAll is called from a Server Component in some paths
              // (e.g. middleware refreshing a session) where cookies() is
              // read-only. Safe to ignore: middleware.ts already refreshes
              // the session cookie on every request that needs it.
            }
          },
        },
      },
    );
  } catch {
    // No request context (build-time generateStaticParams/generateMetadata,
    // or similar). Anon-only client, no session — see file header comment
    // for why this is the behaviorally-correct fallback, not just a patch.
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
}
