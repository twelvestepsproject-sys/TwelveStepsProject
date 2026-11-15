import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { ArticleBody } from "@/components/emet/article-body";
import { ReadingProgress } from "@/components/emet/reading-progress";
import {
  chapterRoutesFromCategories,
  titleRoutesFromPosts,
} from "@/lib/emet/rewrite-absolute";
import {
  buildLegacyRouteMap,
  stripLeadingSubchapterIndex,
} from "@/lib/emet/rewrite-links";
import { emetPath } from "@/lib/emet/routes";
import {
  byReadingOrder,
  chapterNumberOf,
  chapterSubtitleOf,
  chapterTitleOf,
  hebrewNumeralOf,
  isChapterCategory,
  latinLetterOf,
  partExcerptOf,
} from "@/lib/emet/chapters";
import { MatrixRain } from "@/components/emet/matrix-rain";
import { partCoverFallback } from "@/lib/emet/part-cover";
import { mediaUrlFor } from "@/lib/media";

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

export const revalidate = 60;

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

  // The picture for each part card, in three tiers.
  //
  // 1. A cover chosen in the admin. The post form saves one again, so
  //    this is now reachable; it was not before.
  // 2. The part's own video still, derived from the first YouTube id in
  //    its body. This is what gives the 29 existing parts a picture with
  //    no editing work — see lib/emet/part-cover.ts.
  // 3. The numbered tile, for a part with neither.
  //
  // Bodies are fetched here because `listPosts` returns summaries, which
  // carry no body by contract. One query per part, all in flight at once,
  // on a page that rebuilds at most once a minute.
  const [covers, bodies] = await Promise.all([
    Promise.all(
      subchapters.map((p) =>
        p.cover_image_id ? db.getMedia(p.cover_image_id) : Promise.resolve(null),
      ),
    ),
    Promise.all(subchapters.map((p) => db.getPost(p.slug))),
  ]);

  const fallbackCovers = bodies.map((p) => partCoverFallback(p?.body));

  return { category, main, subchapters, covers, fallbackCovers };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadChapter(decodeURIComponent(slug));
  if (!data) return {};

  const number = chapterNumberOf(data.category.slug);
  const title = chapterTitleOf(data.category.name);

  // Filtered, not raw: the imported excerpts are WordPress's
  // auto-generated ones, so an unfiltered description put
  // "תת-פרקים: …" or "Your browser doesn't support video…" in the
  // search snippet and the link preview for most chapters. Falling back
  // to undefined lets the search engine pick a sentence from the page,
  // which beats a wrong one supplied on purpose.
  const description = chapterSubtitleOf(data.main?.excerpt)?.slice(0, 155);

  return {
    title: number ? `פרק ${number} — ${title}` : title,
    description,
    alternates: { canonical: emetPath(`/chapters/${data.category.slug}`) },
    openGraph: {
      type: "article",
      title,
      description,
    },
  };
}

export default async function ChapterPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const data = await loadChapter(slug);
  if (!data) notFound();

  const { category, main, subchapters, covers, fallbackCovers } = data;
  const number = chapterNumberOf(category.slug);
  const title = chapterTitleOf(category.name);

  // "פרק ב׳ · CHAPTER B". Each half is dropped if it cannot be built,
  // rather than printing a stray separator.
  const hebrewNumeral = number ? hebrewNumeralOf(number) : null;
  const eyebrow = number
    ? [hebrewNumeral ? `פרק ${hebrewNumeral}` : null, `CHAPTER ${latinLetterOf(number)}`]
        .filter(Boolean)
        .join(" · ")
    : null;

  // The chapter's own excerpt doubles as the hero subtitle, but only when
  // it is actually a standfirst. Most were auto-generated by WordPress
  // from the start of the body, so they are either the subchapter index
  // ("תת-פרקים: …") or the <video> fallback text ("Your browser doesn't
  // support video…") — printing those under the title would publish
  // scraped noise as if it were a subtitle. Anything matching those
  // shapes is dropped and the hero shows the title alone.
  const subtitle = chapterSubtitleOf(main?.excerpt);

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
  const titleRoutes = titleRoutesFromPosts(everyPost, emetPath);
  const chapterRoutes = chapterRoutesFromCategories(
    await db.listCategories(),
    emetPath,
  );

  // Whether anything survives once the duplicated index is removed.
  // Mirrors what ArticleBody does, so the two cannot disagree about
  // whether this chapter has an introduction.
  const introHtml = stripLeadingSubchapterIndex(main?.body ?? "");
  const hasIntro = introHtml.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim().length > 0;

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
    <div className="bg-white">
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
        <nav aria-label="מיקום" className="mb-8 text-sm text-[#9a9a9a]">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href={emetPath("/")} className="transition-colors hover:text-[#4a4a4a]">דף הבית</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href={emetPath("/chapters")} className="transition-colors hover:text-[#4a4a4a]">הפרקים</Link></li>
          </ol>
        </nav>

        <header className="emet-hero mb-12 -mx-5 px-5">
          <MatrixRain />
          <div className="emet-hero-inner">
            {eyebrow ? <p className="emet-eyebrow">{eyebrow}</p> : null}
            <h1 className="emet-title">{title}</h1>
            {subtitle ? <p className="emet-subtitle">{subtitle}</p> : null}
          </div>
        </header>

        {hasIntro ? (
          /* The chapter renders its own subchapter navigation below, so
             the copy WordPress wrote into the body is dropped here. */
          <ArticleBody html={main?.body ?? ""} routes={routes} titleRoutes={titleRoutes} sourcesRoute={emetPath("/sources")}
              chapterRoutes={chapterRoutes} stripIndex />
        ) : (
          /* Some chapters are only an index: chapter ב's entire body was
             the subchapter list, so once that is stripped nothing is
             left. Say so rather than leaving a blank band above the
             navigation, which reads as a page that failed to load. */
          <p className="mx-auto max-w-[70ch] text-[#6b6b6b]">
            לפרק זה אין טקסט פתיחה נפרד. התוכן מופיע בחלקים שלהלן.
          </p>
        )}

        {subchapters.length > 0 ? (
          <section aria-labelledby="subchapters" className="mx-auto mt-16 max-w-[70ch]">
            <h2
              id="subchapters"
              className="font-display text-xl font-bold text-[#1a1a1a] sm:text-2xl"
            >
              המשך הפרק
            </h2>
            <ol className="emet-parts mt-6">
              {subchapters.map((post, i) => {
                // A chosen cover first, then the part's own video still.
                const cover = covers[i];
                const artUrl = cover ? mediaUrlFor(cover) : fallbackCovers[i];
                const partSentence = partExcerptOf(post.excerpt, post.title);
                return (
                  <li key={post.id}>
                    <Link
                      href={emetPath(`/chapters/${category.slug}/${post.slug}`)}
                      className="emet-part-card"
                    >
                      <div className="emet-part-art">
                        {artUrl ? (
                          /* Plain <img>, not next/image: these are
                             decorative thumbnails in a list, and the
                             optimizer was what made image-heavy pages
                             slow on this VPS (see next.config.ts). A
                             YouTube still is cross-origin besides, and
                             would need the host allowlisted for no gain
                             on a decorative 150px tile. */
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="emet-part-num" aria-hidden="true">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      <div className="emet-part-text">
                        <h3>{post.title}</h3>
                        {/* Same filter as the hero subtitle: a part whose
                            excerpt is still WordPress's auto-generated
                            index or <video> fallback shows no sentence
                            rather than that text. Roni is filling these
                            in by hand, and a real one renders as written. */}
                        {partSentence ? <p>{partSentence}</p> : null}
                        <span className="emet-part-go" aria-hidden="true">
                          להמשך ←
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        <nav
          aria-label="ניווט בין פרקים"
          className="mx-auto mt-16 flex max-w-[70ch] flex-col gap-3 border-t border-black/10 pt-8 sm:flex-row sm:justify-between"
        >
          {previous ? (
            <Link
              href={emetPath(`/chapters/${previous.slug}`)}
              className="group flex-1 rounded-lg border border-black/10 p-4 transition-colors hover:border-emerald-700/40 hover:bg-black/[0.02]"
            >
              <span className="block text-xs text-[#9a9a9a]">הפרק הקודם</span>
              <span className="mt-1 block text-sm text-[#3a3a3a] group-hover:text-[#1a1a1a]">
                {chapterTitleOf(previous.name)}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              href={emetPath(`/chapters/${next.slug}`)}
              className="group flex-1 rounded-lg border border-black/10 p-4 text-start transition-colors hover:border-emerald-700/40 hover:bg-black/[0.02] sm:text-end"
            >
              <span className="block text-xs text-[#9a9a9a]">הפרק הבא</span>
              <span className="mt-1 block text-sm text-[#3a3a3a] group-hover:text-[#1a1a1a]">
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
