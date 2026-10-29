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
    <div className="flex min-h-[60vh] items-center justify-center bg-[#0b0d0c] px-5 py-24">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-display text-5xl font-bold text-emerald-400/30">404</p>
        <h1 className="mt-6 font-display text-2xl font-bold text-white sm:text-3xl">
          הדף לא נמצא
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/55">
          ייתכן שהקישור ישן, או שהדף הועבר. אפשר להתחיל מרשימת הפרקים.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={emetPath("/chapters")}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-6 py-3 font-semibold text-emerald-300 transition-colors hover:border-emerald-400/70 hover:bg-emerald-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            לפרקים
            <span aria-hidden="true">←</span>
          </Link>
          <Link
            href={emetPath("/")}
            className="rounded-full border border-white/15 px-6 py-3 text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
