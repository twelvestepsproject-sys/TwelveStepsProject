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
import {
  categorySlugForSegment,
  languageMetaFor,
  languageSegment,
} from "@/lib/emet/languages";

/**
 * `/[lang]/articles/[slug]` — one article in a translated language.
 *
 * The counterpart to app/(emet)/emet/[lang]/page.tsx: one route for every
 * language the client adds, taking its content from the category he
 * creates in the admin.
 *
 * An article reached under the wrong language is a 404 rather than a
 * redirect, the same rule the chapter parts follow: two addresses for one
 * article would split its ranking, and a canonical link cannot fix a
 * path a crawler was handed directly.
 */
interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const categories = await db.listCategories();
  const params: { lang: string; slug: string }[] = [];

  for (const category of categories) {
    const segment = languageSegment(category.slug);
    // English has its own folder under /en.
    if (segment === "en") continue;
    if (!categorySlugForSegment(segment)) continue;

    const { items } = await db.listPosts({ categorySlug: category.slug, perPage: 300 });
    for (const post of items) params.push({ lang: segment, slug: post.slug });
  }
  return params;
}

async function loadArticle(segment: string, slug: string) {
  const categorySlug = categorySlugForSegment(segment);
  if (!categorySlug || categorySlug === "english") return null;

  const post = await db.getPost(slug);
  // The article must actually belong to this language.
  if (!post || post.category?.slug?.toLowerCase() !== categorySlug) return null;

  const { items } = await db.listPosts({ categorySlug, perPage: 300 });
  const ordered = [...items].sort(byReadingOrder);
  const index = ordered.findIndex((p) => p.slug === slug);

  return {
    post,
    meta: languageMetaFor(categorySlug, post.category?.name),
    previous: index > 0 ? ordered[index - 1] : null,
    next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const data = await loadArticle(decodeURIComponent(lang), decodeURIComponent(slug));
  if (!data) return {};

  return {
    title: data.post.title,
    description: data.post.excerpt?.slice(0, 155) || undefined,
    alternates: {
      canonical: emetPath(`/${decodeURIComponent(lang)}/articles/${data.post.slug}`),
    },
    robots: data.post.seo_noindex ? { index: false, follow: true } : undefined,
  };
}

export default async function LanguageArticlePage({ params }: PageProps) {
  const { lang: rawLang, slug: rawSlug } = await params;
  const segment = decodeURIComponent(rawLang);
  const data = await loadArticle(segment, decodeURIComponent(rawSlug));
  if (!data) notFound();

  const { post, meta, previous, next } = data;

  const { items: everyPost } = await db.listPosts({ perPage: 1000 });
  const routes = buildLegacyRouteMap(everyPost);
  const titleRoutes = titleRoutesFromPosts(everyPost, emetPath);
  const chapterRoutes = chapterRoutesFromCategories(await db.listCategories(), emetPath);

  return (
    <div className="bg-white" lang={meta.code} dir={meta.dir}>
      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="emet-en-crumb mb-8 text-sm">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={emetPath("/")} className="transition-colors">
                עברית
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={emetPath(`/${segment}`)} className="transition-colors">
                {meta.endonym}
              </Link>
            </li>
          </ol>
        </nav>

        <header className="mb-10 pb-8" style={{ borderBottom: "1px solid var(--emet-line)" }}>
          <h1 className="emet-title" style={{ fontSize: "clamp(28px, 5vw, 46px)" }}>
            {post.title}
          </h1>
        </header>

        {/* `lang` is passed through so the body's own typography and
            hyphenation follow the article's language, not the site's. */}
        <ArticleBody
          html={post.body ?? ""}
          lang={meta.code}
          dir={meta.dir}
          routes={routes}
          titleRoutes={titleRoutes}
          sourcesRoute={emetPath("/sources")}
          chapterRoutes={chapterRoutes}
        />

        <nav
          aria-label="Article navigation"
          className="mx-auto mt-14 flex max-w-[70ch] flex-col gap-3 border-t border-black/10 pt-8 sm:flex-row sm:justify-between"
        >
          {previous ? (
            <Link
              href={emetPath(`/${segment}/articles/${previous.slug}`)}
              className="group flex-1 rounded-lg border border-black/10 p-4 transition-colors hover:border-emerald-700/40 hover:bg-black/[0.02]"
            >
              <span className="emet-en-blurb block text-xs">Previous</span>
              <span className="mt-1 block text-sm">{previous.title}</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              href={emetPath(`/${segment}/articles/${next.slug}`)}
              className="group flex-1 rounded-lg border border-black/10 p-4 transition-colors hover:border-emerald-700/40 hover:bg-black/[0.02] sm:text-end"
            >
              <span className="emet-en-blurb block text-xs">Next</span>
              <span className="mt-1 block text-sm">{next.title}</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>
      </article>
    </div>
  );
}
