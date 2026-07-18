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
      disallow: ["/admin", "/privacy"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
