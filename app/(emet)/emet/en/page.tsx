import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/queries";
import { emetPath } from "@/lib/emet/routes";
import { Reveal } from "@/components/emet/reveal";
import { byReadingOrder } from "@/lib/emet/chapters";

/**
 * `/en` — the English archive.
 *
 * This page is LTR and in English, unlike the rest of the site: `dir` is
 * set here rather than in the layout, which stays `rtl` for the Hebrew
 * that is the site's primary language.
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
    "The English material on EMETMATRIX, including the source passages the Hebrew chapters discuss.",
  alternates: { canonical: "/emet/en" },
};

export const revalidate = 3600;

export default async function EnglishIndexPage() {
  const { items } = await db.listPosts({ categorySlug: "english", perPage: 300 });
  const posts = [...items].sort(byReadingOrder);

  return (
    <div className="bg-white" lang="en" dir="ltr">
      <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[#9a9a9a]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={emetPath("/")} className="transition-colors hover:text-[#3a3a3a]">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-[#6b6b6b]">English</li>
          </ol>
        </nav>

        <header className="mb-10">
          <h1 className="font-display text-3xl font-light text-[#2b2b2b] sm:text-4xl">
            English
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-[#6b6b6b]">
            The English material on this site, including the source passages the
            Hebrew chapters discuss.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#9a9a9a]">
            These are not translations of the Hebrew chapters. For the main work,
            see{" "}
            <Link
              href={emetPath("/chapters")}
              className="text-emerald-800 underline underline-offset-2 transition-colors hover:text-emerald-900"
            >
              the chapters
            </Link>
            .
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-[#6b6b6b]">Nothing to show yet.</p>
        ) : (
          <Reveal>
          <ul className="border-t border-black/10">
            {posts.map((post) => (
              <li key={post.id} className="border-b border-black/10">
                <Link
                  href={emetPath(`/en/articles/${post.slug}`)}
                  className="group flex items-baseline gap-4 py-4 transition-colors hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  <span className="min-w-0 flex-1 text-[#2b2b2b] transition-colors group-hover:text-emerald-800">
                    {post.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[#c9c9c9] transition-all group-hover:translate-x-1 group-hover:text-emerald-700"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          </Reveal>
        )}
      </div>
    </div>
  );
}
