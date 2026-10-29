import Link from "next/link";
import { emetPath } from "@/lib/emet/routes";

/**
 * 404 for anything under the EMETMATRIX prefix.
 *
 * A migration of twenty years of content will be linked to from places
 * nobody controls — old bookmarks, forum posts, search results pointing
 * at articles whose ids did not survive. Those visitors land here, so the
 * page offers the chapter index rather than a dead end.
 *
 * `(site)` keeps its own not-found for הנני; this one only covers routes
 * inside this group.
 */
export default function EmetNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-white px-5 py-24">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-display text-5xl font-bold text-emerald-700/30">404</p>
        <h1 className="mt-6 font-display text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
          הדף לא נמצא
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#6b6b6b]">
          ייתכן שהקישור ישן, או שהדף הועבר. אפשר להתחיל מרשימת הפרקים.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={emetPath("/chapters")}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-700/10 px-6 py-3 font-semibold text-emerald-800 transition-colors hover:border-emerald-700/60 hover:bg-emerald-700/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            לפרקים
            <span aria-hidden="true">←</span>
          </Link>
          <Link
            href={emetPath("/")}
            className="rounded-full border border-black/15 px-6 py-3 text-[#4a4a4a] transition-colors hover:border-black/30 hover:text-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
          >
            לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
