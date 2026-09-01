import type { MetadataRoute } from "next";

/**
 * `/robots.txt` (§4, §9) — Next.js's built-in `robots.ts` convention.
 * Disallows `/admin` (middleware-guarded anyway, but keep crawlers out
 * regardless) and `/privacy` (explicitly `noindex` per that page's own
 * metadata — no real legal content exists yet). Points at the dynamic
 * sitemap.
 */
function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /privacy was blocked while the page was a hardcoded "not published
      // yet" placeholder — no reason to index that. It is an ordinary
      // editable page now, and a real privacy policy should be findable:
      // people look for it, and its absence reads as a trust problem.
      disallow: ["/admin"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
