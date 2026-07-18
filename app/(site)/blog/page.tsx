import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/queries";
import { formatReadingTime } from "@/lib/format";

/**
 * `/blog` — Articles index, paginated (§4 `/[blog]`). Reads
 * `db.listPosts({ page })` — pagination/published-only filtering happen
 * inside the mock data source (§5.5 rules 3/4), returned as the
 * `Paginated<PostSummary>` envelope. Category filter UI links out to
 * `/blog/category/[slug]` (reads `db.listCategories()` for the filter
 * chips, same "no joins in the component" posture — each post's own
 * `category` is already nested on `PostSummary`).
 *
 * `?page=` is read from the URL search params rather than a client-side
 * state, keeping this a plain Server Component with no "use client"
 * needed, and letting each page number be a real, linkable, cacheable URL
 * (consistent with §10's static-by-default posture).
 */
export const metadata: Metadata = {
  title: "בלוג | מכללת אשד",
  description: "מאמרים, כלים, ומחשבות מהעולם של מכללת אשד.",
};

const PER_PAGE = 9;

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ items: posts, total, perPage }, categories] = await Promise.all([
    db.listPosts({ page, perPage: PER_PAGE }),
    db.listCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">בלוג</h1>
        <p className="mt-2 text-ink-muted">מאמרים, כלים, ומחשבות מהעולם של מכללת אשד.</p>
      </header>

      {categories.length > 0 ? (
        <nav aria-label="סינון לפי קטגוריה" className="mb-10 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/blog/category/${cat.slug}`}
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {posts.length === 0 ? (
        <p className="text-center text-ink-muted">אין כרגע מאמרים להצגה.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              {post.category ? (
                <span className="w-fit rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-ink-muted">
                  {post.category.name}
                </span>
              ) : null}
              <h2 className="font-display text-lg font-bold text-ink">{post.title}</h2>
              <p className="text-sm text-ink-muted">{post.excerpt}</p>
              <p className="text-xs text-ink-muted">{formatReadingTime(post.reading_time)}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-auto font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
              >
                לקריאה נוספת
              </Link>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="דפדוף" className="mt-12 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/blog${p === 1 ? "" : `?page=${p}`}`}
              aria-current={p === page ? "page" : undefined}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                p === page
                  ? "bg-primary text-primary-fg"
                  : "border border-border text-ink hover:border-primary hover:text-primary"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </main>
  );
}
