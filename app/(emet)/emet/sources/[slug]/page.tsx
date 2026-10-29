import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { ArticleBody } from "@/components/emet/article-body";
import { emetPath } from "@/lib/emet/routes";
import {
  chapterRoutesFromCategories,
  titleRoutesFromPosts,
} from "@/lib/emet/rewrite-absolute";
import { buildLegacyRouteMap } from "@/lib/emet/rewrite-links";
import { byReadingOrder } from "@/lib/emet/chapters";

/**
 * `/sources/[slug]` — one reference entry.
 *
 * These are reached from a chapter far more often than from the index, so
 * the page keeps previous/next within the archive rather than sending a
 * reader back to the list to continue.
 */
interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const { items } = await db.listPosts({ categorySlug: "sources", perPage: 200 });
  return items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.getPost(decodeURIComponent(slug));
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt?.slice(0, 155) || undefined,
    alternates: { canonical: `/emet/sources/${post.slug}` },
  };
}

export default async function SourcePage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const post = await db.getPost(slug);
  // Guard the category too: a chapter slug typed under /sources would
  // otherwise render here as well, giving one article two addresses.
  if (!post || post.category?.slug !== "sources") notFound();

  const { items } = await db.listPosts({ categorySlug: "sources", perPage: 200 });
  const ordered = [...items].sort(byReadingOrder);
  const index = ordered.findIndex((p) => p.slug === slug);
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

  const { items: everyPost } = await db.listPosts({ perPage: 1000 });
  const routes = buildLegacyRouteMap(everyPost);
  const titleRoutes = titleRoutesFromPosts(everyPost, emetPath);
  const chapterRoutes = chapterRoutesFromCategories(
    await db.listCategories(),
    emetPath,
  );

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: base },
      { "@type": "ListItem", position: 2, name: "מקורות", item: `${base}/emet/sources` },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${base}/emet/sources/${post.slug}`,
      },
    ],
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <nav aria-label="מיקום" className="mb-8 text-sm text-[#9a9a9a]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={emetPath("/")} className="transition-colors hover:text-[#3a3a3a]">
                דף הבית
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={emetPath("/sources")}
                className="transition-colors hover:text-[#3a3a3a]"
              >
                מקורות
              </Link>
            </li>
          </ol>
        </nav>

        <header className="mb-10 border-b border-black/10 pb-8">
          <p className="text-xs tracking-[0.2em] text-emerald-700/80">מקור</p>
          <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-[#1a1a1a] sm:text-3xl">
            {post.title}
          </h1>
        </header>

        <ArticleBody html={post.body ?? ""} routes={routes} titleRoutes={titleRoutes} sourcesRoute={emetPath("/sources")}
              chapterRoutes={chapterRoutes} />

        <nav
          aria-label="ניווט בין מקורות"
          className="mx-auto mt-14 flex max-w-[70ch] flex-col gap-3 border-t border-black/10 pt-8 sm:flex-row sm:justify-between"
        >
          {previous ? (
            <Link
              href={emetPath(`/sources/${previous.slug}`)}
              className="group flex-1 rounded-lg border border-black/10 p-4 transition-colors hover:border-emerald-700/40 hover:bg-black/[0.02]"
            >
              <span className="block text-xs text-[#9a9a9a]">הקודם</span>
              <span className="mt-1 block text-sm text-[#3a3a3a] group-hover:text-[#1a1a1a]">
                {previous.title}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              href={emetPath(`/sources/${next.slug}`)}
              className="group flex-1 rounded-lg border border-black/10 p-4 text-start transition-colors hover:border-emerald-700/40 hover:bg-black/[0.02] sm:text-end"
            >
              <span className="block text-xs text-[#9a9a9a]">הבא</span>
              <span className="mt-1 block text-sm text-[#3a3a3a] group-hover:text-[#1a1a1a]">
                {next.title}
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
