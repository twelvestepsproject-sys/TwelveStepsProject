import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { ArticleBody } from "@/components/emet/article-body";
import { emetPath } from "@/lib/emet/routes";
import { titleRoutesFromPosts } from "@/lib/emet/rewrite-absolute";
import { buildLegacyRouteMap } from "@/lib/emet/rewrite-links";
import { byReadingOrder } from "@/lib/emet/chapters";

/**
 * `/en/articles/[slug]` — one English entry.
 *
 * LTR and in English, set on the page rather than in the layout, which
 * stays RTL for the Hebrew the site is primarily written in.
 *
 * `robots` follows the post's own `seo_noindex`. A good part of this
 * archive is quoted dialogue from the film the chapters discuss — source
 * material rather than the author's writing — which is imported so a
 * reader can follow a reference, but is not this site's to put into a
 * search index.
 */
interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const { items } = await db.listPosts({ categorySlug: "english", perPage: 300 });
  return items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.getPost(decodeURIComponent(slug));
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt?.slice(0, 155) || undefined,
    alternates: { canonical: `/emet/en/articles/${post.slug}` },
    robots: post.seo_noindex ? { index: false, follow: true } : undefined,
  };
}

export default async function EnglishArticlePage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const post = await db.getPost(slug);
  if (!post || post.category?.slug !== "english") notFound();

  const { items } = await db.listPosts({ categorySlug: "english", perPage: 300 });
  const ordered = [...items].sort(byReadingOrder);
  const index = ordered.findIndex((p) => p.slug === slug);
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

  const { items: everyPost } = await db.listPosts({ perPage: 1000 });
  const routes = buildLegacyRouteMap(everyPost);
  const titleRoutes = titleRoutesFromPosts(everyPost, emetPath);

  return (
    <div className="bg-white" lang="en" dir="ltr">
      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[#9a9a9a]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={emetPath("/")} className="transition-colors hover:text-[#3a3a3a]">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={emetPath("/en")} className="transition-colors hover:text-[#3a3a3a]">
                English
              </Link>
            </li>
          </ol>
        </nav>

        <header className="mb-10 border-b border-black/10 pb-8">
          <h1 className="font-display text-2xl font-bold leading-tight text-[#1a1a1a] sm:text-3xl">
            {post.title}
          </h1>
        </header>

        <ArticleBody html={post.body ?? ""} lang="en" routes={routes} titleRoutes={titleRoutes} sourcesRoute={emetPath("/sources")} />

        <nav
          aria-label="Article navigation"
          className="mx-auto mt-14 flex max-w-[70ch] flex-col gap-3 border-t border-black/10 pt-8 sm:flex-row sm:justify-between"
        >
          {previous ? (
            <Link
              href={emetPath(`/en/articles/${previous.slug}`)}
              className="group flex-1 rounded-lg border border-black/10 p-4 transition-colors hover:border-emerald-700/40 hover:bg-black/[0.02]"
            >
              <span className="block text-xs text-[#9a9a9a]">Previous</span>
              <span className="mt-1 block text-sm text-[#3a3a3a] group-hover:text-[#1a1a1a]">
                {previous.title}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              href={emetPath(`/en/articles/${next.slug}`)}
              className="group flex-1 rounded-lg border border-black/10 p-4 transition-colors hover:border-emerald-700/40 hover:bg-black/[0.02] sm:text-end"
            >
              <span className="block text-xs text-[#9a9a9a]">Next</span>
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
