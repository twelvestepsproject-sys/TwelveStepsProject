import Link from "next/link";
import { EmetMobileNav } from "./emet-mobile-nav";

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
  { href: "/chapters", label: "הפרקים" },
  { href: "/sources", label: "מקורות" },
  { href: "/en", label: "English" },
  { href: "/search", label: "חיפוש" },
];

export function EmetHeader({ siteName, tagline }: { siteName: string; tagline: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0d0c]/90 backdrop-blur">
      {/* A skip link is the one piece of keyboard navigation that has to come
          first in the DOM, so it lives here rather than in the layout. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0b0d0c]"
      >
        דילוג לתוכן
      </a>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="group flex flex-col leading-tight">
          <span className="font-display text-lg font-bold tracking-wide text-white sm:text-xl">
            {siteName}
          </span>
          {tagline ? (
            <span className="text-[0.7rem] text-white/55 transition-colors group-hover:text-white/75 sm:text-xs">
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
                  className="text-sm text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
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
