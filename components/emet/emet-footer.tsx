import Link from "next/link";
import { emetPath } from "@/lib/emet/routes";

/**
 * Site footer for EMETMATRIX.
 *
 * Repeats the main sections as plain links rather than ending the page on
 * nothing: a reader who has just finished a chapter is at the bottom of a
 * long article, and the nearest navigation should not be a scroll away.
 * It is also the crawl path for anything the header does not name.
 */
export function EmetFooter({ siteName }: { siteName: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/10 bg-white text-[#6b6b6b]">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-display text-base font-bold text-[#1a1a1a]">{siteName}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed">
              מסע בשאלות על מציאות, תפיסה ואמת.
            </p>
          </div>

          <nav aria-label="ניווט תחתון">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9a9a9a]">
              ניווט
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li><Link href={emetPath("/chapters")} className="transition-colors hover:text-[#1a1a1a]">הפרקים</Link></li>
              <li><Link href={emetPath("/sources")} className="transition-colors hover:text-[#1a1a1a]">מקורות</Link></li>
              <li><Link href={emetPath("/search")} className="transition-colors hover:text-[#1a1a1a]">חיפוש</Link></li>
            </ul>
          </nav>

          <nav aria-label="Languages">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9a9a9a]">
              שפות
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li><Link href={emetPath("/")} className="transition-colors hover:text-[#1a1a1a]">עברית</Link></li>
              <li>
                <Link href={emetPath("/en")} lang="en" dir="ltr" className="inline-block transition-colors hover:text-[#1a1a1a]">
                  English
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-black/10 pt-6 text-xs text-[#9a9a9a]">
          © {year} {siteName}
        </p>
      </div>
    </footer>
  );
}
