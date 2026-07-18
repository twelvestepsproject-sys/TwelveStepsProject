import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GlobalOverlays } from "@/components/layout/global-overlays";
import { db } from "@/lib/queries";

/**
 * Public site route group layout (§12: `/app/(site)` — public, RTL
 * layout). The root `app/layout.tsx` already sets `<html lang="he"
 * dir="rtl">` and the font variables. Site-wide chrome now attaches here:
 * `SiteHeader` (§5 #1), `SiteFooter` (§5 #19), and `GlobalOverlays` (§5
 * #22 — registration modal / cookie banner / accessibility toolbar) — all
 * three were judged LAYOUT-LEVEL rather than `page_blocks` rows; see each
 * component's own header comment for the full reasoning (same core
 * argument for all three: identical chrome on every page isn't
 * page-specific content, and forcing it into the block registry would
 * mean either duplicating rows per page or special-casing sort_order).
 *
 * §9 also requires `Organization` + `WebSite` (with `SearchAction`)
 * JSON-LD GLOBALLY, i.e. on every public page, not just the homepage —
 * added here rather than duplicated per-page. Reads `db.getSiteSettings()`
 * for the org name (never hardcoded, per the "no hardcoded brand" rule).
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await db.getSiteSettings();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.site_name,
    url: base,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_name,
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <SiteHeader />
      {children}
      <SiteFooter />
      <GlobalOverlays />
    </>
  );
}
