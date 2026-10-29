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
 * `/chapters/[slug]` — one chapter, with its subchapters.
 *
 * The slug here is the chapter's *category* slug (`chapter-12`), not a
 * post slug. A chapter is a category holding one main post plus any
 * subchapters, and the URL names the chapter rather than whichever post
 * happens to carry its opening text.
 *
 * The main post's body is rendered in full. The brief is explicit that a
 * chapter page must not degrade into a list of links to its subchapters,
 * and the main post is the chapter — the subchapters continue it.
 */
interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await db.listCategories();
  return categories.filter((c) => isChapterCategory(c.slug)).map((c) => ({ slug: c.slug }));
}

/** Everything both the page and its metadata need, fetched once. */
async function loadChapter(slug: string) {
  const category = await db.getCategory(slug);
  if (!category || !isChapterCategory(category.slug)) return null;

  const { items } = await db.listPosts({ categorySlug: slug, perPage: 200 });
  const ordered = [...items].sort(byReadingOrder);
  // The main post is the one titled "פרק …"; the rest are subchapters.
  const summary = ordered.find((p) => p.title.trim().startsWith("פרק")) ?? null;
  const subchapters = ordered.filter((p) => p.slug !== summary?.slug);

  // listPosts returns summaries, which carry no body. The chapter's own
  // text is the point of this page, so the main post is fetched in full.
  const main = summary ? await db.getPost(summary.slug) : null;

  return { category, main, subchapters };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadChapter(decodeURIComponent(slug));
  if (!data) return {};

  const number = chapterNumberOf(data.category.slug);
  const title = chapterTitleOf(data.category.name);

  return {
    title: number ? `פרק ${number} — ${title}` : title,
    description: data.main?.excerpt?.slice(0, 155) || undefined,
    alternates: { canonical: `/chapters/${data.category.slug}` },
    openGraph: {
      type: "article",
      title,
      description: data.main?.excerpt?.slice(0, 155) || undefined,
    },
  };
}

export default async function ChapterPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const data = await loadChapter(slug);
  if (!data) notFound();

  const { category, main, subchapters } = data;
  const number = chapterNumberOf(category.slug);
  const title = chapterTitleOf(category.name);

  // Previous/next across the sequence, so a reader can move through the
  // work without returning to the index each time.
  const all = (await db.listCategories())
    .filter((c) => isChapterCategory(c.slug))
    .sort((a, b) => (chapterNumberOf(a.slug) ?? 0) - (chapterNumberOf(b.slug) ?? 0));
  const index = all.findIndex((c) => c.slug === category.slug);
  const previous = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;

  // Built from every post so the body's /?p= cross-references resolve
  // to real routes rather than dead WordPress query URLs.
  const { items: everyPost } = await db.listPosts({ perPage: 1000 });
  const routes = buildLegacyRouteMap(everyPost);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: base },
      { "@type": "ListItem", position: 2, name: "הפרקים", item: `${base}/chapters` },
      { "@type": "ListItem", position: 3, name: title, item: `${base}/chapters/${category.slug}` },
    ],
  };
  const articleJsonLd = main
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        inLanguage: "he",
        datePublished: main.published_at ?? undefined,
        mainEntityOfPage: `${base}/chapters/${category.slug}`,
      }
    : null;

  return (
    <div className="bg-[#0b0d0c]">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {articleJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      ) : null}

      <article className="mx-auto max-w-4xl px-5 py-12 sm:py-20">
        <nav aria-label="מיקום" className="mb-8 text-sm text-white/40">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href={emetPath("/")} className="transition-colors hover:text-white/70">דף הבית</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href={emetPath("/chapters")} className="transition-colors hover:text-white/70">הפרקים</Link></li>
          </ol>
        </nav>

        <header className="mb-12 border-b border-white/10 pb-10">
          {number ? (
            <p className="font-display text-sm tracking-[0.25em] text-emerald-400/70">
              פרק {number}
            </p>
          ) : null}
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
            {title}
          </h1>
        </header>

        {main ? (
          /* The chapter renders its own subchapter navigation below, so
             the copy WordPress wrote into the body is dropped here. */
          <ArticleBody html={main.body ?? ""} routes={routes} stripIndex />
        ) : (
          /* No main post: say so rather than rendering an empty page
             that looks broken. The subchapters below are the content. */
          <p className="mx-auto max-w-[70ch] text-white/50">
            לפרק זה אין טקסט פתיחה נפרד. התוכן מופיע בחלקים שלהלן.
          </p>
        )}

        {subchapters.length > 0 ? (
          <section aria-labelledby="subchapters" className="mx-auto mt-16 max-w-[70ch]">
            <h2
              id="subchapters"
              className="font-display text-xl font-bold text-white sm:text-2xl"
            >
              המשך הפרק
            </h2>
            <ol className="mt-6 border-t border-white/10">
              {subchapters.map((post, i) => (
                <li key={post.id} className="border-b border-white/10">
                  <Link
                    href={emetPath(`/chapters/${category.slug}/${post.slug}`)}
                    className="group flex items-baseline gap-4 py-4 transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/60"
                  >
                    <span
                      aria-hidden="true"
                      className="w-6 shrink-0 text-end text-sm tabular-nums text-emerald-400/40 group-hover:text-emerald-400/80"
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-white/80 transition-colors group-hover:text-white">
                      {post.title}
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-white/20 transition-all group-hover:-translate-x-1 group-hover:text-emerald-400/70"
                    >
                      ←
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <nav
          aria-label="ניווט בין פרקים"
          className="mx-auto mt-16 flex max-w-[70ch] flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:justify-between"
        >
          {previous ? (
            <Link
              href={emetPath(`/chapters/${previous.slug}`)}
              className="group flex-1 rounded-lg border border-white/10 p-4 transition-colors hover:border-emerald-400/40 hover:bg-white/[0.03]"
            >
              <span className="block text-xs text-white/40">הפרק הקודם</span>
              <span className="mt-1 block text-sm text-white/80 group-hover:text-white">
                {chapterTitleOf(previous.name)}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              href={emetPath(`/chapters/${next.slug}`)}
              className="group flex-1 rounded-lg border border-white/10 p-4 text-start transition-colors hover:border-emerald-400/40 hover:bg-white/[0.03] sm:text-end"
            >
              <span className="block text-xs text-white/40">הפרק הבא</span>
              <span className="mt-1 block text-sm text-white/80 group-hover:text-white">
                {chapterTitleOf(next.name)}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>
      </article>
    </div>
  );
}
