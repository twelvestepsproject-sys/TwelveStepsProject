import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { formatReadingTime } from "@/lib/format";

/**
 * `/blog/category/[slug]` — Category archive (§4 `/[blog]/category/[slug]`).
 * Reads `db.listPosts({ categorySlug })` — the mock filters inside the data
 * source (§5.5 rule 3), this page never filters a fetched array itself.
 * `generateStaticParams` pre-renders one page per category (§10).
 *
 * Percent-encoded Hebrew slug decode applied unconditionally, same proven
 * pattern as every other dynamic segment this pass.
 */
interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PER_PAGE = 9;

export async function generateStaticParams() {
  const categories = await db.listCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const [category, settings] = await Promise.all([db.getCategory(slug), db.getSiteSettings()]);
  if (!category) return {};
  return {
    // BUG FIX: title had the org name hardcoded.
    title: `${category.name} | בלוג | ${settings.site_name}`,
    description: category.description ?? `מאמרים בקטגוריית ${category.name}.`,
  };
}

export default async function BlogCategoryPage({ params, searchParams }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const category = await db.getCategory(slug);
  if (!category) notFound();

  const { items: posts, total, perPage } = await db.listPosts({
    categorySlug: slug,
    page,
    perPage: PER_PAGE,
  });
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-10 text-center">
        <p className="text-sm font-semibold text-ink-muted">
          <Link href="/blog" className="hover:text-primary hover:underline">
            בלוג
          </Link>
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">{category.name}</h1>
        {category.description ? <p className="mt-2 text-ink-muted">{category.description}</p> : null}
      </header>

      {posts.length === 0 ? (
        <p className="text-center text-ink-muted">אין כרגע מאמרים בקטגוריה זו.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
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
              href={`/blog/category/${category.slug}${p === 1 ? "" : `?page=${p}`}`}
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
