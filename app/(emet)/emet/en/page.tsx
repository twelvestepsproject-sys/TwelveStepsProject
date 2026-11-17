import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/queries";
import { emetPath } from "@/lib/emet/routes";
import { Reveal } from "@/components/emet/reveal";
import { byReadingOrder } from "@/lib/emet/chapters";
import { groupEnglish } from "@/lib/emet/english-sections";

/**
 * `/en` — the English archive, in three sections.
 *
 * This page is LTR and in English, unlike the rest of the site: `dir` is
 * set here rather than in the layout, which stays `rtl` for the Hebrew
 * that is the site's primary language.
 *
 * Chapters first, then Sources, then Quotes — the order Roni asked for,
 * and the right one: the chapters are the work, the sources are what it
 * cites, and the quotes are the film dialogue it reads against. One flat
 * list of 146 entries buried the eighteen chapters among a hundred lines
 * of film dialogue, which is what this fixes.
 *
 * The grouping is derived from the posts themselves rather than from
 * three categories — see lib/emet/english-sections.ts for the rule and
 * why it is a classifier and not a data migration.
 *
 * No language switcher pairs these with Hebrew articles. They are not
 * translations of each other — the English material is largely quoted
 * source text the Hebrew chapters discuss — and offering a switch
 * between unrelated articles tells the reader something untrue.
 *
 * Entries excluded from search indexing are still listed: a reader who
 * arrives here should see everything the archive holds. `noindex` governs
 * what search engines store, not what a person is allowed to read.
 */
export const metadata: Metadata = {
  title: "English",
  description:
    "The English material on EMETMATRIX: the chapters, the source passages they cite, and the film dialogue they read against.",
  alternates: { canonical: emetPath("/en") },
};

export const revalidate = 60;

/** The three sections, in reading order, with the copy for each. */
const SECTIONS = [
  {
    key: "chapters" as const,
    id: "chapters",
    title: "Chapters",
    blurb: "The main work, translated into English.",
  },
  {
    key: "sources" as const,
    id: "sources",
    title: "Sources",
    blurb: "The passages the chapters cite and discuss.",
  },
  {
    key: "quotes" as const,
    id: "quotes",
    title: "Quotes",
    blurb: "Dialogue from the film the chapters read against.",
  },
];

export default async function EnglishIndexPage() {
  const { items } = await db.listPosts({ categorySlug: "english", perPage: 300 });
  const posts = [...items].sort(byReadingOrder);
  const grouped = groupEnglish(posts);

  // Shown rather than swallowed. Every one of the 146 current posts
  // matches a rule, so this renders nothing today — but a later import
  // that fits none of them would otherwise vanish from the page with no
  // sign, and a missing chapter is worse than an untidy heading.
  const sections = [
    ...SECTIONS.map((s) => ({ ...s, posts: grouped[s.key] })),
    ...(grouped.unclassified.length
      ? [
          {
            key: "unclassified" as const,
            id: "other",
            title: "Other",
            blurb: "Entries that do not yet fit a section.",
            posts: grouped.unclassified,
          },
        ]
      : []),
  ].filter((s) => s.posts.length > 0);

  return (
    <div className="bg-white" lang="en" dir="ltr">
      <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <nav aria-label="Breadcrumb" className="emet-en-crumb mb-8 text-sm">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={emetPath("/")} className="transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>English</li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="emet-eyebrow">ENGLISH</p>
          <h1 className="emet-title" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>
            English
          </h1>
          <p className="emet-en-intro mt-4 max-w-xl leading-relaxed">
            The English material on this site: the chapters, the source passages
            they cite, and the film dialogue they read against.
          </p>
        </header>

        {sections.length === 0 ? (
          <p className="emet-en-intro">Nothing to show yet.</p>
        ) : (
          <>
            {/* A short jump list: the quotes run to over a hundred
                entries, so without it the sections below the first are a
                long scroll away on a phone. */}
            {sections.length > 1 ? (
              <nav aria-label="Sections" className="mb-12 flex flex-wrap gap-2">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="emet-en-jump rounded-full px-4 py-1.5 text-sm"
                  >
                    {s.title}
                    <span className="emet-en-count ms-1.5">
                      {s.posts.length}
                    </span>
                  </a>
                ))}
              </nav>
            ) : null}

            <div className="flex flex-col gap-14">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-heading`}
                >
                  <header className="mb-5">
                    <h2
                      id={`${section.id}-heading`}
                      className="emet-en-h2 text-2xl font-semibold"
                    >
                      {section.title}
                      <span className="emet-en-count ms-2 align-middle text-sm font-normal">
                        {section.posts.length}
                      </span>
                    </h2>
                    <p className="emet-en-blurb mt-1.5 text-sm leading-relaxed">
                      {section.blurb}
                    </p>
                  </header>

                  <Reveal>
                    <ul className="emet-en-list">
                      {section.posts.map((post) => (
                        <li key={post.id}>
                          <Link
                            href={emetPath(`/en/articles/${post.slug}`)}
                            className="emet-en-row"
                          >
                            <span className="emet-en-row-title">
                              {post.title}
                            </span>
                            <span
                              aria-hidden="true"
                              className="emet-en-arrow"
                            >
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

        <p className="emet-en-foot mt-16 pt-8 text-sm leading-relaxed">
          For the Hebrew original, see{" "}
          <Link
            href={emetPath("/chapters")}
            
          >
            the chapters
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
