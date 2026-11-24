import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { emetPath } from "@/lib/emet/routes";
import { Reveal } from "@/components/emet/reveal";
import { byReadingOrder } from "@/lib/emet/chapters";
import { groupEnglish } from "@/lib/emet/english-sections";
import {
  categorySlugForSegment,
  languageMetaFor,
  languageSegment,
} from "@/lib/emet/languages";

/**
 * `/[lang]` — the index of one translated language.
 *
 * The client asked for French, Spanish and Russian "like the English",
 * and for infrastructure he can extend himself. This is that: one route
 * serving every language, which gets its content from a category the
 * client creates in the admin. Adding a language is creating a category
 * and filing posts under it — no deploy.
 *
 * Why this can sit at the top level
 * ---------------------------------
 * Next.js matches a static segment before a dynamic one, so `/chapters`,
 * `/sources`, `/search` and `/en` all still reach their own folders and
 * only an unclaimed segment arrives here. That is what lets the URLs read
 * `/fr/...` as asked, rather than `/lang/fr/...`.
 *
 * Because this route sees every unclaimed path, a segment that is not a
 * known language is a 404 — not an empty page. Without that, `/foo`
 * would render a blank language index and search engines would index it.
 *
 * `/en` keeps its own folder rather than being folded in here. Its 146
 * posts, its three-section split and the redirects pointing at it all
 * work; rewriting a working section to prove a point is how a migration
 * breaks something. This route is for the languages being added, and it
 * uses the same section grouping, so they read as one site.
 */
interface PageProps {
  params: Promise<{ lang: string }>;
}

export const revalidate = 60;

/**
 * Only the languages that actually have a category are built.
 *
 * Derived from the database rather than from a list in the code, which is
 * the whole point: the client adds a category, and the next revalidation
 * builds its page.
 */
export async function generateStaticParams() {
  const categories = await db.listCategories();
  const params: { lang: string }[] = [];
  for (const category of categories) {
    const segment = languageSegment(category.slug);
    // `/en` has its own folder; a param for it here would collide.
    if (segment === "en") continue;
    if (categorySlugForSegment(segment)) params.push({ lang: segment });
  }
  return params;
}

/** Resolves a URL segment to its category and the posts filed under it. */
async function loadLanguage(segment: string) {
  const categorySlug = categorySlugForSegment(segment);
  if (!categorySlug) return null;
  // English is served by app/(emet)/emet/en, so this route does not also
  // answer for it — two pages for one language would split its ranking.
  if (categorySlug === "english") return null;

  const category = await db.getCategory(categorySlug);
  if (!category) return null;

  const { items } = await db.listPosts({ categorySlug, perPage: 300 });
  const posts = [...items].sort(byReadingOrder);
  const meta = languageMetaFor(category.slug, category.name);

  return { category, posts, meta };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const data = await loadLanguage(decodeURIComponent(lang));
  if (!data) return {};

  return {
    title: data.meta.endonym,
    description: data.category.description?.trim() || undefined,
    alternates: { canonical: emetPath(`/${languageSegment(data.category.slug)}`) },
  };
}

export default async function LanguageIndexPage({ params }: PageProps) {
  const { lang: rawLang } = await params;
  const data = await loadLanguage(decodeURIComponent(rawLang));
  if (!data) notFound();

  const { category, posts, meta } = data;
  const segment = languageSegment(category.slug);
  const grouped = groupEnglish(posts);

  // The same three sections as /en, so a reader moving between languages
  // meets the same shape. A section with nothing in it is left out
  // rather than rendered empty, which matters most here: a language the
  // client has just created has no posts at all, and its page should say
  // so once rather than show three empty headings.
  const sections = [
    { id: "chapters", title: "Chapters", posts: grouped.chapters },
    { id: "sources", title: "Sources", posts: grouped.sources },
    { id: "quotes", title: "Quotes", posts: grouped.quotes },
    { id: "other", title: "Other", posts: grouped.unclassified },
  ].filter((s) => s.posts.length > 0);

  return (
    <div className="bg-white" lang={meta.code} dir={meta.dir}>
      <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <nav aria-label="Breadcrumb" className="emet-en-crumb mb-8 text-sm">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={emetPath("/")} className="transition-colors">
                {/* The site's own name for its home, not a translation:
                    the homepage is in Hebrew, and labelling the link in
                    the reader's language would promise otherwise. */}
                עברית
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>{meta.endonym}</li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="emet-eyebrow">{meta.endonym.toUpperCase()}</p>
          <h1 className="emet-title" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>
            {meta.endonym}
          </h1>
          {category.description?.trim() ? (
            <p className="emet-en-intro mt-4 max-w-xl leading-relaxed">
              {category.description}
            </p>
          ) : null}
        </header>

        {posts.length === 0 ? (
          /* A language whose category exists but holds nothing yet. Said
             plainly, because this is the state the client will see the
             moment he creates the category and before he translates
             anything — it should look deliberate, not broken. */
          <p className="emet-en-intro">
            Nothing has been published in this language yet.
          </p>
        ) : (
          <>
            {sections.length > 1 ? (
              <nav aria-label="Sections" className="mb-12 flex flex-wrap gap-2">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="emet-en-jump rounded-full px-4 py-1.5 text-sm">
                    {s.title}
                    <span className="emet-en-count ms-1.5">{s.posts.length}</span>
                  </a>
                ))}
              </nav>
            ) : null}

            <div className="flex flex-col gap-14">
              {sections.map((section) => (
                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
                  <header className="mb-5">
                    <h2 id={`${section.id}-heading`} className="emet-en-h2 text-2xl font-semibold">
                      {section.title}
                      <span className="emet-en-count ms-2 align-middle text-sm font-normal">
                        {section.posts.length}
                      </span>
                    </h2>
                  </header>

                  <Reveal>
                    <ul className="emet-en-list">
                      {section.posts.map((post) => (
                        <li key={post.id}>
                          <Link
                            href={emetPath(`/${segment}/articles/${post.slug}`)}
                            className="emet-en-row"
                          >
                            <span className="emet-en-row-title">{post.title}</span>
                            <span aria-hidden="true" className="emet-en-arrow">
                              →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
