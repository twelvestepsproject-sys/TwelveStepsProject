import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/queries";

/**
 * `/search` — Search results (§4). Reads `db.search(q)` — matching/
 * filtering happens inside the mock data source, never in this component
 * (§5.5 rule 3). `q` comes from the URL search param, since the header's
 * search form (site-header.tsx) submits a plain GET to `/search?q=...`
 * rather than live-as-you-type results (that piece is explicitly deferred —
 * see site-header.tsx's own header comment).
 *
 * `SearchResult.type` is one of "post" | "training" | "page" — each needs
 * a different URL prefix to link out correctly, since `SearchResult` only
 * carries a bare `slug`, not a full href.
 */
export const metadata: Metadata = {
  title: "חיפוש | מכללת אשד",
  robots: { index: false, follow: true },
};

function hrefForResult(type: "post" | "training" | "page", slug: string): string {
  switch (type) {
    case "post":
      return `/blog/${slug}`;
    case "training":
      return `/hachsharot/${slug}`;
    case "page":
      return slug === "home" ? "/" : `/${slug}`;
  }
}

function labelForType(type: "post" | "training" | "page"): string {
  switch (type) {
    case "post":
      return "מאמר";
    case "training":
      return "הכשרה";
    case "page":
      return "עמוד";
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await db.search(query) : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">חיפוש באתר</h1>

      <form action="/search" className="mt-6 flex gap-2" role="search">
        <label htmlFor="search-q" className="sr-only">
          חיפוש
        </label>
        <input
          id="search-q"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="מה תרצו לחפש?"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-ink transition-colors placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <button
          type="submit"
          className="rounded-full bg-accent px-6 py-2.5 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
        >
          חיפוש
        </button>
      </form>

      {query ? (
        <p className="mt-6 text-sm text-ink-muted">
          {results.length > 0 ? `${results.length} תוצאות עבור "${query}"` : `אין תוצאות עבור "${query}"`}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-4">
          {results.map((r, i) => (
            <li key={`${r.type}-${r.slug}-${i}`} className="rounded-lg border border-border bg-surface p-4">
              <span className="mb-1 inline-block rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-ink-muted">
                {labelForType(r.type)}
              </span>
              <Link
                href={hrefForResult(r.type, r.slug)}
                className="block font-display font-bold text-ink hover:text-primary hover:underline"
              >
                {r.title}
              </Link>
              {r.excerpt ? <p className="mt-1 text-sm text-ink-muted">{r.excerpt}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
