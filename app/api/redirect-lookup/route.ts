import { NextResponse } from "next/server";
import { db } from "@/lib/queries";

/**
 * The redirect table, as JSON, for the middleware to apply.
 *
 * Why a route and not a direct read in middleware
 * -----------------------------------------------
 * Middleware runs on the Edge runtime, which cannot bundle the `pg`
 * driver or `node:crypto` — that is exactly why consulting this table was
 * deferred when it was first written (see middleware.ts). The table lives
 * in Postgres, so something on the Node runtime has to read it. This
 * route is that something, and middleware fetches it.
 *
 * Why the whole table and not a lookup by path
 * --------------------------------------------
 * 192 rows is a few kilobytes. One query per incoming request would put a
 * database round trip in front of every page view, and a lookup endpoint
 * would also let a caller probe the table one path at a time. Handing
 * over the whole map once, and caching it, costs less than either.
 *
 * `force-cache` with a revalidate window rather than `no-store`: a
 * redirect map changes when an editor adds a row, not per request. An
 * editor who adds one sees it apply within the window, and in the
 * meantime no request pays for a query.
 *
 * Not secret
 * ----------
 * Every row here is a public URL mapping — `redirects_select_public` on
 * the table already allows an anonymous read, and each entry is
 * observable anyway by following the redirect. Nothing private passes
 * through here, so the route needs no auth.
 */
export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  try {
    const rows = await db.listRedirects();

    // Only what the middleware needs to act. Ids and timestamps would
    // just be bytes over the wire on a request that is already on the
    // critical path of a page view.
    const map = rows.map((r) => ({
      from: r.from_path,
      to: r.to_path,
      status: r.status_code,
    }));

    return NextResponse.json(
      { redirects: map },
      {
        headers: {
          // Lets the platform cache serve this to the middleware without
          // re-rendering, on the same window as `revalidate` above.
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    // A redirect lookup must never take the site down. An empty map means
    // "no redirect applies", which leaves the request to be served
    // normally — the behaviour before this feature existed.
    return NextResponse.json({ redirects: [] }, { status: 200 });
  }
}
