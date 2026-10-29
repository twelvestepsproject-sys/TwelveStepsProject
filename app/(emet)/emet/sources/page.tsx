import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/queries";
import { emetPath } from "@/lib/emet/routes";
import { Reveal } from "@/components/emet/reveal";
import { byReadingOrder } from "@/lib/emet/chapters";

/**
 * `/sources` — the reference archive.
 *
 * Twenty-eight entries, most titled "מקורות פרק <numeral>", so they are
 * listed in the order the chapters run rather than alphabetically by a
 * Hebrew title or by a publication date the feed gave many of them
 * identically. The legacy id preserves that order, same as the
 * subchapters.
 *
 * A plain index rather than cards: these are reference material someone
 * arrives at from a chapter, not a gallery to browse.
 */
export const metadata: Metadata = {
  title: "מקורות",
  description:
    "המקורות שעליהם נשענים פרקי האתר — רשימת ההפניות המלאה, לפי סדר הפרקים.",
  alternates: { canonical: "/emet/sources" },
};

export const revalidate = 3600;

export default async function SourcesPage() {
  const { items } = await db.listPosts({ categorySlug: "sources", perPage: 200 });
  const sources = [...items].sort(byReadingOrder);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <nav aria-label="מיקום" className="mb-8 text-sm text-[#9a9a9a]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={emetPath("/")} className="transition-colors hover:text-[#3a3a3a]">
                דף הבית
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-[#6b6b6b]">מקורות</li>
          </ol>
        </nav>

        <header className="mb-10">
          <h1 className="font-display text-3xl font-light text-[#2b2b2b] sm:text-4xl">
            מקורות
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-[#6b6b6b]">
            ההפניות והמקורות שעליהם נשענים הפרקים, לפי סדר הפרקים.
          </p>
        </header>

        {sources.length === 0 ? (
          <p className="text-[#6b6b6b]">אין מקורות להצגה כרגע.</p>
        ) : (
          <Reveal>
          <ol className="border-t border-black/10">
            {sources.map((source) => (
              <li key={source.id} className="border-b border-black/10">
                <Link
                  href={emetPath(`/sources/${source.slug}`)}
                  className="group flex items-baseline gap-4 py-4 transition-colors hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  <span className="min-w-0 flex-1 text-[#2b2b2b] transition-colors group-hover:text-emerald-800">
                    {source.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[#c9c9c9] transition-all group-hover:-translate-x-1 group-hover:text-emerald-700"
                  >
                    ←
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          </Reveal>
        )}
      </div>
    </div>
  );
}
