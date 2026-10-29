/**
 * The base path every EMETMATRIX URL hangs off.
 *
 * Three sites share this application, and a Next route group — `(emet)`,
 * `(site)` — does not appear in the URL. So two `page.tsx` files in two
 * groups both resolve to `/` and the build refuses: "two parallel pages
 * that resolve to the same path". `/search` would collide next, and
 * `(site)/[slug]` would swallow anything else added at the root.
 *
 * A prefix settles it. In production the site answers on its own domain,
 * where nginx routes by hostname and the prefix is unwanted, so it is an
 * environment variable rather than a constant: set EMET_BASE_PATH="" once
 * emetmatrix.com points here and every link follows.
 *
 * Use `emetPath()` for internal links instead of writing the prefix into
 * each href — fourteen hardcoded copies would all need finding on the day
 * the domain goes live.
 */
export const EMET_BASE_PATH = process.env.EMET_BASE_PATH ?? "/emet";

/** Builds an internal URL. `emetPath("/chapters")` -> "/emet/chapters". */
export function emetPath(path = "/"): string {
  const base = EMET_BASE_PATH.replace(/\/$/, "");
  if (path === "/" || path === "") return base || "/";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
