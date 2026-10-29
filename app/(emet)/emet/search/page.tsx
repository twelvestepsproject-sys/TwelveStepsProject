import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/queries";
import { emetPath } from "@/lib/emet/routes";
import { chapterNumberOf, chapterTitleOf, postKindOf } from "@/lib/emet/chapters";

/**
 * `/search` — site-wide search.
 *
 * Uses `listPosts({ q })` rather than `db.search()`. That helper also
 * queries `trainings`, a table belonging to the other site on this
 * codebase and empty here, and it returns a slug with no category — so
 * there would be no way to tell a chapter from a source and route the
 * result correctly.
 *
 * Results are grouped by kind, which the slug prefix already encodes, so
 * a reader can see at a glance whether a hit is a chapter, a part of one,
 * a reference, or English material.
 *
 * `noindex`: a results page is a view of content indexed elsewhere, and
 * letting crawlers wander the query space creates endless thin pages.
 */
export const metadata: Metadata = {
  title: "חיפוש",
  robots: { index: false, follow: true },
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

const GROUPS = [
  { kind: "chapter", label: "פרקים" },
  { kind: "article", label: "חלקי פרקים" },
  { kind: "source", label: "מקורות" },
  { kind: "english", label: "English" },
] as const;

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  // listPosts matches title, excerpt and slug with ilike, which handles a
  // partial Hebrew word — full-text search needs whole tokens, and Hebrew
  // has no stemmer configured here.
  type Result = Awaited<ReturnType<typeof db.listPosts>>["items"][number];

  // No query means no lookup at all. Typed explicitly because an empty
  // literal would infer never[] and break the grouping below.
  const items: Result[] = query
    ? (await db.listPosts({ q: query, perPage: 100 })).items
    : [];

  // A chapter's own post lives at its category's URL, so the route needs
  // the category slug rather than the post slug.
  const byKind = new Map<string, Result[]>();
  for (const post of items) {
    const kind = postKindOf(post.slug);
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind)!.push(post);
  }

  function routeFor(post: Result): string {
    const kind = postKindOf(post.slug);
    const category = post.category?.slug;
    if (kind === "chapter") return emetPath(`/chapters/${category ?? post.slug}`);
    if (kind === "article") {
      return category
        ? emetPath(`/chapters/${category}/${post.slug}`)
        : emetPath(`/chapters/${post.slug}`);
    }
    if (kind === "source") return emetPath(`/sources/${post.slug}`);
    return emetPath(`/en/articles/${post.slug}`);
  }

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
            <li className="text-[#6b6b6b]">חיפוש</li>
          </ol>
        </nav>

        <h1 className="font-display text-3xl font-light text-[#2b2b2b] sm:text-4xl">
          חיפוש
        </h1>

        {/* A plain GET form, so search works without JavaScript. */}
        <form action={emetPath("/search")} method="get" role="search" className="mt-8">
          <label htmlFor="q" className="sr-only">
            מה לחפש באתר
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="חיפוש בפרקים, במקורות ובחומר באנגלית"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-black/15 px-4 py-3 text-[#1a1a1a] placeholder:text-[#9a9a9a] focus-visible:border-emerald-700/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-emerald-800 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              חפש
            </button>
          </div>
        </form>

        {query === "" ? (
          <p className="mt-10 text-[#6b6b6b]">
            הקלידו מילה או צירוף כדי לחפש בכל תוכן האתר.
          </p>
        ) : items.length === 0 ? (
          <div className="mt-10">
            <p className="text-[#2b2b2b]">
              לא נמצאו תוצאות עבור <span className="font-semibold">{query}</span>.
            </p>
            <p className="mt-3 text-sm text-[#6b6b6b]">
              אפשר לנסות מילה אחרת, או{" "}
              <Link
                href={emetPath("/chapters")}
                className="text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
              >
                לעיין ברשימת הפרקים
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <p className="mt-10 text-sm text-[#6b6b6b]">
              {items.length} תוצאות עבור <span className="font-semibold text-[#2b2b2b]">{query}</span>
            </p>

            {GROUPS.map(({ kind, label }) => {
              const group = byKind.get(kind) ?? [];
              if (group.length === 0) return null;

              return (
                <section key={kind} className="mt-10">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-700/80">
                    {label}
                  </h2>
                  <ul className="mt-3 border-t border-black/10">
                    {group.map((post) => {
                      const number =
                        kind === "chapter" && post.category?.slug
                          ? chapterNumberOf(post.category.slug)
                          : null;
                      const title =
                        kind === "chapter" && post.category?.name
                          ? chapterTitleOf(post.category.name)
                          : post.title;

                      return (
                        <li key={post.id} className="border-b border-black/10">
                          <Link
                            href={routeFor(post)}
                            className="group block py-4 transition-colors hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                          >
                            <span className="flex items-baseline gap-3">
                              {number ? (
                                <span
                                  aria-hidden="true"
                                  className="shrink-0 text-sm tabular-nums text-emerald-700/60"
                                >
                                  {number}
                                </span>
                              ) : null}
                              <span className="min-w-0 flex-1 text-[#2b2b2b] transition-colors group-hover:text-emerald-800">
                                {title}
                              </span>
                            </span>
                            {post.excerpt ? (
                              <span className="mt-1.5 block text-sm leading-relaxed text-[#6b6b6b] line-clamp-2">
                                {post.excerpt}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
