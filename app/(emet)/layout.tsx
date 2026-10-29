import type { ReactNode } from "react";
import type { Metadata } from "next";
import { EmetHeader } from "@/components/emet/emet-header";
import { EmetFooter } from "@/components/emet/emet-footer";
import { db } from "@/lib/queries";
import "./emet-prose.css";

/**
 * Route group for the EMETMATRIX site.
 *
 * Deliberately a sibling of `(site)` rather than a branch inside it. That
 * group's layout attaches הנני's header, footer, registration modal,
 * cookie banner and analytics tag to everything under it — chrome that
 * belongs to a different organisation. A separate group means this site
 * shares the codebase and the database schema while sharing none of that
 * furniture, and nothing added here can reach הנני's pages.
 *
 * The root layout still supplies `<html lang="he" dir="rtl">` and the
 * fonts, which is correct: Hebrew is this site's primary language too.
 * English articles flip to LTR on their own pages rather than here.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.getSiteSettings();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

  return {
    metadataBase: new URL(base),
    title: {
      default: settings.site_name,
      // Chapter and article pages set their own title; this frames it.
      template: `%s | ${settings.site_name}`,
    },
    description: settings.seo_description?.trim() || settings.tagline,
    openGraph: {
      type: "website",
      siteName: settings.site_name,
      locale: "he_IL",
      url: base,
    },
  };
}

export default async function EmetLayout({ children }: { children: ReactNode }) {
  const settings = await db.getSiteSettings();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

  // Site-wide structured data. Kept at the layout rather than repeated on
  // each page, and pointed at this site's own search route.
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_name,
    url: base,
    inLanguage: "he",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <EmetHeader siteName={settings.site_name} tagline={settings.tagline} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <EmetFooter siteName={settings.site_name} />
    </>
  );
}
