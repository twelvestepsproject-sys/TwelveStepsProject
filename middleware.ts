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
 * REDIRECTS (was deferred since Phase 4, now implemented): the
 * `redirects` table holds 192 rows mapping the old WordPress URLs
 * (`/?p=18`) to this site's paths, and nothing consulted them — every old
 * link, and the search ranking attached to it, landed on the homepage
 * instead of the article it named. They are applied here now.
 *
 * The original deferral reason still holds and shapes the design: this
 * file runs on the Edge runtime, which cannot bundle the `pg` driver. So
 * the table is read by a Node-runtime route, /api/redirect-lookup, and
 * fetched from here.
 *
 * Cost control matters because this runs on every request:
 *   - Only requests that can possibly match do the work. All 192 rows are
 *     `/?p=NN`, so a request with no `p` query parameter returns
 *     immediately, which is nearly all of them.
 *   - The map is cached in module scope for the life of the isolate, so a
 *     warm instance applies a redirect with no fetch at all.
 *   - A failed or slow lookup serves the request normally rather than
 *     blocking it. A redirect is an improvement on a request that already
 *     works; it must never be the reason a page does not load.
 */
// Inlined rather than imported from lib/admin/dev-session.ts: that module
// now reaches node:crypto and the pg driver through lib/auth/server.ts,
// neither of which can be bundled for the Edge runtime this file targets.
const DEV_SESSION_COOKIE_NAME = "dev_session_role";

interface RedirectRule {
  from: string;
  to: string;
  status: number;
}

/**
 * The redirect map, cached for the life of this isolate.
 *
 * A promise rather than the resolved value, so that concurrent requests
 * arriving before the first fetch settles all await the same one instead
 * of each starting their own.
 */
let redirectMapPromise: Promise<Map<string, RedirectRule>> | null = null;
let redirectMapFetchedAt = 0;
const REDIRECT_TTL_MS = 5 * 60 * 1000;

function loadRedirectMap(origin: string): Promise<Map<string, RedirectRule>> {
  const fresh = Date.now() - redirectMapFetchedAt < REDIRECT_TTL_MS;
  if (redirectMapPromise && fresh) return redirectMapPromise;

  redirectMapFetchedAt = Date.now();
  redirectMapPromise = fetch(`${origin}/api/redirect-lookup`, {
    headers: { accept: "application/json" },
  })
    .then((res) => (res.ok ? res.json() : { redirects: [] }))
    .then((data: { redirects?: RedirectRule[] }) => {
      const map = new Map<string, RedirectRule>();
      for (const rule of data.redirects ?? []) {
        if (rule?.from && rule?.to) map.set(rule.from, rule);
      }
      return map;
    })
    .catch(() => {
      // Do not cache a failure for the full window: clearing the stamp
      // lets the next request try again rather than serving an empty map
      // for five minutes because one fetch happened to fail.
      redirectMapFetchedAt = 0;
      return new Map<string, RedirectRule>();
    });

  return redirectMapPromise;
}

/**
 * Applies a legacy WordPress redirect, if one matches.
 *
 * Returns null when nothing matches, which is the overwhelmingly common
 * case and costs one query-parameter check.
 */
async function legacyRedirect(request: NextRequest): Promise<NextResponse | null> {
  const url = request.nextUrl;

  // Every row in the table is `/?p=NN`. Anything without that parameter
  // cannot match, so it leaves without touching the map.
  const p = url.searchParams.get("p");
  if (!p || !/^\d+$/.test(p)) return null;

  const map = await loadRedirectMap(url.origin);
  if (map.size === 0) return null;

  // The stored paths are domain-root ("/?p=18"), which is how they looked
  // in WordPress and how they arrive in production, where nginx serves
  // this site at the root. Behind the /emet base path — how it runs until
  // the domain moves — the same request arrives as "/emet?p=18", so the
  // prefix is stripped before matching rather than stored twice.
  const basePath = process.env.EMET_BASE_PATH ?? "/emet";
  const prefix = basePath.replace(/\/$/, "");
  const withinSite =
    prefix && url.pathname.startsWith(prefix)
      ? url.pathname.slice(prefix.length) || "/"
      : url.pathname;

  const rule = map.get(`${withinSite}?p=${p}`) ?? map.get(`/?p=${p}`);
  if (!rule) return null;

  // The stored target is also domain-root, so the base path goes back on
  // for as long as the site is served under one. Without this the
  // redirect lands on /chapters/... with no prefix, which 404s until the
  // domain move.
  //
  // Built by assigning `pathname` rather than by interpolating into the
  // URL constructor: a string beginning with a slash is ambiguous to
  // anything that also handles filesystem paths, and this produced a
  // mangled absolute path the first time it was written.
  const target = new URL(url.origin);
  target.pathname = `${prefix}${rule.to}`;
  // `p` is consumed by the redirect; carrying it to the target would
  // leave a query parameter that means nothing there, and would match
  // this rule again on the way in.
  for (const [key, value] of url.searchParams) {
    if (key !== "p") target.searchParams.append(key, value);
  }

  const status = [301, 302, 307, 308].includes(rule.status) ? rule.status : 301;
  return NextResponse.redirect(target, status);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    // Checked before anything else on a public request: an old URL should
    // reach its article rather than render a page first.
    const redirect = await legacyRedirect(request);
    if (redirect) return redirect;

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
  // Widened from "/admin/:path*" so the legacy redirects above can run on
  // public requests too — the old WordPress URLs are `/?p=NN`, which hits
  // the homepage as a real route, so a not-found handler would never see
  // them and middleware is the only place that gets the request first.
  //
  // Everything with no reason to be inspected is excluded, so static
  // assets and the lookup route itself do not pay for this. Excluding
  // /api/redirect-lookup also matters for correctness: middleware fetches
  // it, and letting that fetch re-enter middleware would recurse.
  matcher: [
    "/((?!_next/static|_next/image|api/redirect-lookup|favicon.ico|robots.txt|sitemap.xml|fonts/|images/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|mp4|pdf)$).*)",
  ],
};
