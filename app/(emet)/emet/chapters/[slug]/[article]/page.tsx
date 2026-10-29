import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { ArticleBody } from "@/components/emet/article-body";
import { ReadingProgress } from "@/components/emet/reading-progress";
import { buildLegacyRouteMap } from "@/lib/emet/rewrite-links";
import { emetPath } from "@/lib/emet/routes";
import {
  byReadingOrder,
  chapterNumberOf,
  chapterTitleOf,
  isChapterCategory,
} from "@/lib/emet/chapters";

/**
 * `/chapters/[slug]/[article]` — one subchapter inside a chapter.
 *
 * The URL carries the chapter as well as the article so the reader's
 * position in the work is legible from the address bar, and so the
 * breadcrumb and the previous/next links have a chapter to move within
 * without a second lookup.
 *
 * A subchapter belonging to a different chapter than the URL claims is a
 * 404 rather than a redirect: two addresses for one article would split
 * its ranking, and the canonical link cannot fix a path the crawler was
 * handed directly.
 */
interface PageProps {
  params: Promise<{ slug: string; article: string }>;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await db.listCategories();
  const chapters = categories.filter((c) => isChapterCategory(c.slug));

  const params: { slug: string; article: string }[] = [];
  for (const chapter of chapters) {
    const { items } = await db.listPosts({ categorySlug: chapter.slug, perPage: 200 });
    for (const post of items) {
      // The chapter's own post lives at the chapter URL, not under it.
      if (post.slug.startsWith("chapter-")) continue;
      params.push({ slug: chapter.slug, article: post.slug });
    }
  }
  return params;
}

async function loadArticle(chapterSlug: string, articleSlug: string) {
  const category = await db.getCategory(chapterSlug);
  if (!category || !isChapterCategory(category.slug)) return null;

  const post = await db.getPost(articleSlug);
  if (!post) return null;
  // Guard against a subchapter being reachable under the wrong chapter.
  if (post.category?.slug !== category.slug) return null;

  const { items } = await db.listPosts({ categorySlug: chapterSlug, perPage: 200 });
  const siblings = [...items].sort(byReadingOrder).filter((p) => !p.slug.startsWith("chapter-"));
  const index = siblings.findIndex((p) => p.slug === articleSlug);

  return {
    category,
    post,
    siblings,
    previous: index > 0 ? siblings[index - 1] : null,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
    position: index + 1,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, article } = await params;
  const data = await loadArticle(decodeURIComponent(slug), decodeURIComponent(article));
  if (!data) return {};

  return {
    title: data.post.title,
    description: data.post.excerpt?.slice(0, 155) || undefined,
    alternates: { canonical: `/chapters/${data.category.slug}/${data.post.slug}` },
    openGraph: {
      type: "article",
      title: data.post.title,
      description: data.post.excerpt?.slice(0, 155) || undefined,
    },
  };
}

export default async function SubchapterPage({ params }: PageProps) {
  const { slug: rawSlug, article: rawArticle } = await params;
  const data = await loadArticle(decodeURIComponent(rawSlug), decodeURIComponent(rawArticle));
  if (!data) notFound();

  const { category, post, siblings, previous, next, position } = data;
  const number = chapterNumberOf(category.slug);
  const chapterTitle = chapterTitleOf(category.name);
  const { items: everyPost } = await db.listPosts({ perPage: 1000 });
  const routes = buildLegacyRouteMap(everyPost);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: base },
      { "@type": "ListItem", position: 2, name: "הפרקים", item: `${base}/chapters` },
      {
        "@type": "ListItem",
        position: 3,
        name: chapterTitle,
        item: `${base}/chapters/${category.slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: post.title,
        item: `${base}/chapters/${category.slug}/${post.slug}`,
      },
    ],
  };

  return (
    <div className="bg-[#0b0d0c]">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <nav aria-label="מיקום" className="mb-8 text-sm text-white/40">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href={emetPath("/")} className="transition-colors hover:text-white/70">דף הבית</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href={emetPath("/chapters")} className="transition-colors hover:text-white/70">הפרקים</Link></li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={emetPath(`/chapters/${category.slug}`)}
                className="transition-colors hover:text-white/70"
              >
                {number ? `פרק ${number}` : chapterTitle}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="lg:flex lg:items-start lg:gap-12">
          {/* The chapter's other parts, kept in view on desktop so a reader
              can see where this section sits without going back. Below the
              article on narrow screens, where a sidebar would push the
              text off the first screen. */}
          <aside
            aria-labelledby="chapter-contents"
            className="order-2 mt-16 shrink-0 lg:sticky lg:top-24 lg:order-2 lg:mt-0 lg:w-64"
          >
            <nav className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <p
                id="chapter-contents"
                className="text-xs font-semibold uppercase tracking-widest text-white/40"
              >
                {number ? `פרק ${number}` : "הפרק"}
              </p>
              <Link
                href={emetPath(`/chapters/${category.slug}`)}
                className="mt-2 block font-display text-sm font-semibold leading-snug text-white/85 transition-colors hover:text-white"
              >
                {chapterTitle}
              </Link>
              <ol className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-3">
                {siblings.map((sibling, i) => {
                  const current = sibling.slug === post.slug;
                  return (
                    <li key={sibling.id}>
                      <Link
                        href={emetPath(`/chapters/${category.slug}/${sibling.slug}`)}
                        aria-current={current ? "page" : undefined}
                        className={`flex gap-2.5 rounded-md px-2 py-2 text-sm transition-colors ${
                          current
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "text-white/55 hover:bg-white/5 hover:text-white/85"
                        }`}
                      >
                        <span aria-hidden="true" className="tabular-nums opacity-50">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 leading-snug">{sibling.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          <article className="order-1 min-w-0 flex-1">
            <header className="mb-10 border-b border-white/10 pb-8">
              <p className="text-xs tracking-[0.2em] text-emerald-400/60">
                {number ? `פרק ${number}` : chapterTitle} · חלק {position}
              </p>
              <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-white sm:text-4xl">
                {post.title}
              </h1>
            </header>

            {/* The sidebar is this chapter's contents, with the current
                part marked, so the stale copy in the body goes. */}
            <ArticleBody html={post.body ?? ""} routes={routes} stripIndex />

            <nav
              aria-label="ניווט בין חלקי הפרק"
              className="mx-auto mt-14 flex max-w-[70ch] flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:justify-between"
            >
              {previous ? (
                <Link
                  href={emetPath(`/chapters/${category.slug}/${previous.slug}`)}
                  className="group flex-1 rounded-lg border border-white/10 p-4 transition-colors hover:border-emerald-400/40 hover:bg-white/[0.03]"
                >
                  <span className="block text-xs text-white/40">הקודם</span>
                  <span className="mt-1 block text-sm text-white/80 group-hover:text-white">
                    {previous.title}
                  </span>
                </Link>
              ) : (
                <Link
                  href={emetPath(`/chapters/${category.slug}`)}
                  className="group flex-1 rounded-lg border border-white/10 p-4 transition-colors hover:border-emerald-400/40 hover:bg-white/[0.03]"
                >
                  <span className="block text-xs text-white/40">חזרה</span>
                  <span className="mt-1 block text-sm text-white/80 group-hover:text-white">
                    לתחילת הפרק
                  </span>
                </Link>
              )}
              {next ? (
                <Link
                  href={emetPath(`/chapters/${category.slug}/${next.slug}`)}
                  className="group flex-1 rounded-lg border border-white/10 p-4 text-start transition-colors hover:border-emerald-400/40 hover:bg-white/[0.03] sm:text-end"
                >
                  <span className="block text-xs text-white/40">הבא</span>
                  <span className="mt-1 block text-sm text-white/80 group-hover:text-white">
                    {next.title}
                  </span>
                </Link>
              ) : (
                <span className="flex-1" />
              )}
            </nav>
          </article>
        </div>
      </div>
    </div>
  );
}
