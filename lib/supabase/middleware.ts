import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * lib/supabase/middleware.ts (Phase 5) — Edge-safe Supabase client for
 * middleware.ts. Mirrors the standard `@supabase/ssr` middleware recipe:
 * reads/writes cookies against BOTH the incoming request and the outgoing
 * response so the session cookie gets refreshed on every request that
 * touches `/admin/**`.
 *
 * middleware.ts is NOT under /app or /components, so it is allowed to
 * change in Phase 5 (§16) — this file backs that change.
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  return { supabase, getResponse: () => response };
}
