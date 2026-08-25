import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

/**
 * §7: "Middleware guards /admin/**."
 *
 * PHASE 5 UPDATE: this file is NOT under /app or /components, so it is
 * explicitly allowed to change (§16). It now branches on DATA_SOURCE:
 *  - DATA_SOURCE=mock: UNCHANGED — checks the dev-session cookie exactly as
 *    in Phase 4 (see lib/admin/dev-session.ts's mock-mode branch). Keeps
 *    the mock path working exactly as before (verification requirement:
 *    "confirm DATA_SOURCE=mock still works").
 *  - DATA_SOURCE=postgres: verifies the HMAC signature on the session
 *    cookie set by lib/auth/server.ts. Signature-only, no database round
 *    trip — middleware runs on every /admin request, and the role check
 *    that does hit the database happens once per action in
 *    requireContentRole(). An unsigned or expired cookie is rejected here.
 *  - DATA_SOURCE=supabase: checks a REAL Supabase Auth session via
 *    @supabase/ssr's middleware client, which also transparently refreshes
 *    the session cookie (standard @supabase/ssr middleware recipe) so a
 *    near-expiry access token gets renewed on navigation.
 *
 * `/admin/login` itself must stay reachable without a session in both
 * modes, or nobody could ever log in.
 *
 * DEFERRED (unchanged from Phase 4, still applies): the `redirects` table
 * is not yet consulted here for public-site requests — see git history for
 * the original reasoning (Edge-runtime-safety of the mock store). Now that
 * a real Postgres-backed redirects table exists, this remains a flagged
 * follow-up rather than an in-scope Phase 5 change (Phase 5's scope is the
 * DB/auth swap, not new middleware features).
 */
// Inlined rather than imported from lib/admin/dev-session.ts: that module
// now reaches node:crypto and the pg driver through lib/auth/server.ts,
// neither of which can be bundled for the Edge runtime this file targets.
const DEV_SESSION_COOKIE_NAME = "dev_session_role";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Forwarded so app/(admin)/admin/layout.tsx (which every route under
  // /admin, including /admin/login, is nested under and therefore cannot
  // opt out of) can tell it's rendering the login route and skip its own
  // session redirect — see that file's comment for why this exists: a
  // layout.tsx placed inside login/ was tried first and does NOT work,
  // because Next.js layouts nest rather than override.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (process.env.DATA_SOURCE === "postgres") {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = token ? await verifySessionToken(token) : null;

    if (!payload) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (process.env.DATA_SOURCE === "supabase") {
    const { supabase, getResponse } = createSupabaseMiddlewareClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const response = getResponse();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const hasSession = request.cookies.has(DEV_SESSION_COOKIE_NAME);
  if (!hasSession) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/admin/:path*"],
};
