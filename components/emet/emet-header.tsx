import Link from "next/link";
import { EmetMobileNav } from "./emet-mobile-nav";
import { emetPath } from "@/lib/emet/routes";

/**
 * Site header for EMETMATRIX.
 *
 * The Hebrew shape of the navigation is static: chapters, sources,
 * search. A database round-trip for three links nobody will reorder is a
 * cost without a benefit.
 *
 * The LANGUAGES are not static, and that is deliberate. The client asked
 * to be able to add a language himself, so the layout discovers them from
 * the categories table and passes them in — creating a category in the
 * admin puts a language in this menu with no deploy. An empty list
 * renders no language entries at all rather than a stub.
 *
 * The desktop list and the mobile drawer render the same array, so the
 * two cannot drift apart. Both are plain anchors, which is what keeps the
 * whole site navigable with JavaScript disabled — the search engine
 * requirement in the brief, and the accessible default besides.
 */
const HEBREW_NAV = [
  { href: emetPath("/chapters"), label: "הפרקים" },
  { href: emetPath("/sources"), label: "מקורות" },
];

const SEARCH_NAV = { href: emetPath("/search"), label: "חיפוש" };

export interface HeaderLanguage {
  href: string;
  label: string;
}

export function EmetHeader({
  siteName,
  tagline,
  languages = [],
}: {
  siteName: string;
  tagline: string;
  /** Translated sections, discovered from the categories table. */
  languages?: HeaderLanguage[];
}) {
  // Search stays last, after however many languages exist, so the menu
  // does not reorder itself as the client adds one.
  const NAV = [...HEBREW_NAV, ...languages, SEARCH_NAV];

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
      {/* A skip link is the one piece of keyboard navigation that has to come
          first in the DOM, so it lives here rather than in the layout. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-3 focus:z-50 focus:rounded focus:bg-[#1a1a1a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        דילוג לתוכן
      </a>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href={emetPath("/")} className="group flex flex-col leading-tight">
          <span className="font-display text-lg font-bold tracking-wide text-[#1a1a1a] sm:text-xl">
            {siteName}
          </span>
          {tagline ? (
            <span className="text-[0.7rem] text-[#6b6b6b] transition-colors group-hover:text-[#3a3a3a] sm:text-xs">
              {tagline}
            </span>
          ) : null}
        </Link>

        <nav aria-label="ניווט ראשי" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-[#5a5a5a] transition-colors hover:text-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1a1a1a]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <EmetMobileNav items={NAV} />
      </div>
    </header>
  );
}
