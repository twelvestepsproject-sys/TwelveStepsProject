import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/queries";
import { chapterNumberOf, isChapterCategory, chapterTitleOf } from "@/lib/emet/chapters";
import { emetPath } from "@/lib/emet/routes";

/**
 * `/chapters` — the index of all seventeen chapters.
 *
 * Ordered by chapter number read off the slug, not alphabetically by
 * Hebrew title and not by publication date: this is a numbered sequence
 * the author wrote in order, and either of the other two would scatter it.
 *
 * Rendered as a numbered editorial index rather than a card grid. The
 * chapters are a single argument in seventeen parts, and a grid of equal
 * tiles says "pick any one" — which is the wrong invitation for a work
 * that builds.
 */
export const metadata: Metadata = {
  title: "הפרקים",
  description:
    "שבעה עשר פרקים על מציאות, תפיסה ואמת — מסע דרך שאלות על העולם שאנחנו חושבים שאנחנו מכירים.",
  alternates: { canonical: "/chapters" },
};

// Chapters change when an editor publishes, not on every request.
export const revalidate = 3600;

export default async function ChaptersPage() {
  const categories = await db.listCategories();
  const chapters = categories
    .filter((c) => isChapterCategory(c.slug))
    .sort((a, b) => (chapterNumberOf(a.slug) ?? 0) - (chapterNumberOf(b.slug) ?? 0));

  // One query per chapter would be seventeen round-trips for a count.
  // Pulling the posts once and grouping is a single pass.
  const { items: allPosts } = await db.listPosts({ perPage: 1000 });
  const countByCategory = new Map<string, number>();
  for (const post of allPosts) {
    const id = post.category?.id;
    if (id) countByCategory.set(id, (countByCategory.get(id) ?? 0) + 1);
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
        <header className="mb-14 sm:mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            המסע
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-[#1a1a1a] sm:text-5xl">
            הפרקים
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5a5a5a] sm:text-lg">
            שבעה עשר פרקים, הבנויים זה על זה. אפשר לקרוא לפי הסדר, ואפשר
            להיכנס מכל נקודה שמסקרנת.
          </p>
        </header>

        <ol className="border-t border-black/10">
          {chapters.map((chapter) => {
            const number = chapterNumberOf(chapter.slug);
            const parts = countByCategory.get(chapter.id) ?? 0;
            // The category name carries "פרק ג' | " before the real title;
            // the number is already its own column here.
            const title = chapterTitleOf(chapter.name);

            return (
              <li key={chapter.id} className="border-b border-black/10">
                <Link
                  href={emetPath(`/chapters/${chapter.slug}`)}
                  className="group flex items-baseline gap-5 py-6 transition-colors hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:gap-8 sm:py-7"
                >
                  <span
                    aria-hidden="true"
                    className="w-10 shrink-0 text-end font-display text-xl tabular-nums text-emerald-700/60 transition-colors group-hover:text-emerald-700 sm:w-14 sm:text-2xl"
                  >
                    {number ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-semibold leading-snug text-[#1a1a1a] transition-colors group-hover:text-[#1a1a1a] sm:text-xl">
                      {title}
                    </span>
                    {parts > 1 ? (
                      <span className="mt-1.5 block text-sm text-[#8a8a8a]">
                        {parts} חלקים
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[#c0c0c0] transition-all group-hover:-translate-x-1 group-hover:text-emerald-700"
                  >
                    ←
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
