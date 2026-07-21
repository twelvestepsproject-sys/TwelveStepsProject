import type { z } from "zod";
import type { latestArticlesBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 17 — Latest articles. Reads `db.listPosts({ perPage: 3 })` —
 * published-only filtering (status + published_at, independently) already
 * happened inside the mock data source. Empty case: render nothing.
 */
type LatestArticlesData = z.infer<typeof latestArticlesBlockDataSchema>;

export async function LatestArticles({ data }: { data: LatestArticlesData }) {
  const { items: posts } = await db.listPosts({ perPage: 3 });

  if (posts.length === 0) return null;

  return (
    <section className="bg-surface px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
          {data.intro ? <p className="text-ink-muted">{data.intro}</p> : null}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
            >
              {post.category ? (
                <span className="w-fit rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-ink-muted transition-all duration-200 hover:shadow-sm">
                  {post.category.name}
                </span>
              ) : null}
              <h3 className="font-display text-lg font-bold text-ink">{post.title}</h3>
              <p className="text-sm text-ink-muted">{post.excerpt}</p>
              <a
                href={`/blog/${post.slug}`}
                className="mt-auto font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                לקריאה נוספת
              </a>
            </article>
          ))}
        </div>
        {data.all_articles_link ? (
          <div className="mt-8 text-center">
            <a
              href={data.all_articles_link.href}
              className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
            >
              {data.all_articles_link.label}
            </a>
          </div>
        ) : null}
      </RevealOnScroll>
    </section>
  );
}

export function LatestArticlesSkeleton() {
  return (
    <section className="bg-surface px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mx-auto mb-8 h-8 w-56" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    </section>
  );
}
