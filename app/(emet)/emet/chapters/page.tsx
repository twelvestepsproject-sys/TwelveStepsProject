import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { emetPath } from "@/lib/emet/routes";
import { loadMediaByFilename } from "@/lib/emet/media";
import { Reveal } from "@/components/emet/reveal";
import { chapterNumberOf, isChapterCategory, chapterTitleOf } from "@/lib/emet/chapters";

/**
 * `/chapters` — the index of all seventeen chapters.
 *
 * A card grid with each chapter's cover, which is what the original site
 * showed and what makes a seventeen-item list scannable: the images are
 * the thing a returning reader recognises, not the position in a list.
 *
 * Ordered by chapter number read off the slug — not alphabetically by
 * Hebrew title and not by publication date, either of which would
 * scatter a sequence the author wrote in order.
 */
export const metadata: Metadata = {
  title: "כל הפרקים",
  description:
    "שבעה עשר פרקים על מציאות, תפיסה ואמת — מסע דרך שאלות על העולם שאנחנו חושבים שאנחנו מכירים.",
  alternates: { canonical: "/emet/chapters" },
};

export const revalidate = 3600;

export default async function ChaptersPage() {
  const categories = await db.listCategories();
  const chapters = categories
    .filter((c) => isChapterCategory(c.slug))
    .sort((a, b) => (chapterNumberOf(a.slug) ?? 0) - (chapterNumberOf(b.slug) ?? 0));

  // One query for every cover rather than one per card.
  const media = await loadMediaByFilename(
    chapters.map((c) => `${c.slug}-cover.webp`),
  );

  // Part counts, from a single pass over the posts.
  const { items: allPosts } = await db.listPosts({ perPage: 1000 });
  const partsByCategory = new Map<string, number>();
  for (const post of allPosts) {
    const id = post.category?.id;
    if (id) partsByCategory.set(id, (partsByCategory.get(id) ?? 0) + 1);
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <nav aria-label="מיקום" className="mb-8 text-sm text-[#9a9a9a]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={emetPath("/")} className="transition-colors hover:text-[#3a3a3a]">
                ראשי
              </Link>
            </li>
            <li aria-hidden="true">•</li>
            <li className="text-[#6b6b6b]">כל הפרקים</li>
          </ol>
        </nav>

        <header className="mb-12">
          <h1 className="font-display text-3xl font-light text-[#2b2b2b] sm:text-4xl">
            כל הפרקים
          </h1>
        </header>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter, index) => {
            const number = chapterNumberOf(chapter.slug);
            const cover = media.get(`${chapter.slug}-cover.webp`);
            // The category name carries "פרק ג' | " and the number has its
            // own badge, so the card shows the title alone.
            const title = chapterTitleOf(chapter.name);
            const parts = partsByCategory.get(chapter.id) ?? 0;

            return (
              <li key={chapter.id}>
                {/* Staggered by column rather than by position in the
                    list: 17 cards at 60ms each would make the last one
                    arrive a second after the first, long after the eye. */}
                <Reveal delay={(index % 3) * 70}>
                <Link
                  href={emetPath(`/chapters/${chapter.slug}`)}
                  className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-[#1a1a1a]">
                    {cover ? (
                      <Image
                        src={mediaUrlFor(cover)}
                        alt={cover.alt_he}
                        fill
                        sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw"
                        // The first row is above the fold on most screens.
                        priority={index < 3}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}

                    {/* Darkens the lower band only, where the number sits. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
                    />

                    {number ? (
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 font-display text-xs tabular-nums text-white backdrop-blur-sm">
                        פרק {number}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3.5">
                    <h2 className="font-display text-[0.95rem] font-semibold leading-snug text-[#2b2b2b] transition-colors group-hover:text-emerald-800 sm:text-base">
                      {title}
                    </h2>
                    {parts > 1 ? (
                      <p className="mt-1.5 text-xs text-[#9a9a9a]">{parts} חלקים</p>
                    ) : null}
                  </div>
                </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
