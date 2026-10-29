import Link from "next/link";
import { EmetMobileNav } from "./emet-mobile-nav";
import { emetPath } from "@/lib/emet/routes";

/**
 * Site header for EMETMATRIX.
 *
 * Navigation is static rather than read from the `menus` table: this site
 * has one fixed top-level shape — chapters, sources, English, search — and
 * a database round-trip on every page for four links that nobody will
 * reorder is a cost without a benefit. Section pages are the place to add
 * depth.
 *
 * The desktop list and the mobile drawer render the same `NAV` array, so
 * the two cannot drift apart. Both are plain anchors, which is what keeps
 * the whole site navigable with JavaScript disabled — the search engine
 * requirement in the brief, and the accessible default besides.
 */
const NAV = [
  { href: emetPath("/chapters"), label: "הפרקים" },
  { href: emetPath("/sources"), label: "מקורות" },
  { href: emetPath("/en"), label: "English" },
  { href: emetPath("/search"), label: "חיפוש" },
];

export function EmetHeader({ siteName, tagline }: { siteName: string; tagline: string }) {
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
