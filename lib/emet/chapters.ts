/**
 * Helpers for reading the chapter structure out of the imported data.
 *
 * The migration keys everything on slugs — `chapter-12`, `article-39`,
 * `source-74`, `en-1078` — so these read that convention in one place
 * rather than having each page parse strings its own way.
 *
 * Mirrors the slug scheme in scripts/import-emet.mjs. If one changes the
 * other must, which is why both carry the same note.
 */

/** `chapter-12` -> 12. Null for anything that is not a chapter slug. */
export function chapterNumberOf(slug: string): number | null {
  const m = /^chapter-(\d+)$/.exec(slug);
  return m ? Number(m[1]) : null;
}

/** True for the seventeen chapter categories, false for sources/english.
 *  Also false for the `chapter-x-…` fallback the importer gives a chapter
 *  whose Hebrew numeral could not be read — those are flagged for review
 *  rather than silently sorted into the sequence. */
export function isChapterCategory(slug: string): boolean {
  return chapterNumberOf(slug) !== null;
}

/**
 * Strips the "פרק ג' | " prefix from a category name.
 *
 * The source titles its chapter categories "פרק <numeral>' | <title>",
 * sometimes with a hyphen after פרק and sometimes with different quote
 * characters. Pages that already show the number in its own column would
 * otherwise print it twice.
 *
 * Falls back to the full name when the pattern does not match, so a
 * chapter named some other way still gets a readable heading rather than
 * an empty one.
 */
export function chapterTitleOf(name: string): string {
  const m = /^פרק[\s–-]*[א-ת]+['׳’"״”]*\s*[|׀]\s*(.+)$/.exec(
    name.trim(),
  );
  return (m?.[1] ?? name).trim();
}

/** Which kind of record a post slug names. The import gives each type its
 *  own prefix precisely so this is a lookup and not a guess. */
export type EmetPostKind = "chapter" | "article" | "source" | "english" | "unknown";

export function postKindOf(slug: string): EmetPostKind {
  if (slug.startsWith("chapter-")) return "chapter";
  if (slug.startsWith("article-")) return "article";
  if (slug.startsWith("source-")) return "source";
  if (slug.startsWith("en-")) return "english";
  return "unknown";
}

/** The public route for a post, from its slug alone. Keeps link building
 *  in one place so a route rename does not have to be chased through
 *  every page. */
export function routeForPost(slug: string, chapterSlug?: string): string {
  switch (postKindOf(slug)) {
    case "chapter":
      return `/chapters/${slug}`;
    case "article":
      return chapterSlug ? `/chapters/${chapterSlug}/${slug}` : `/chapters/${slug}`;
    case "source":
      return `/sources/${slug}`;
    case "english":
      return `/en/articles/${slug}`;
    default:
      return `/${slug}`;
  }
}

/**
 * The legacy WordPress id carried in a slug.
 *
 * It is the only reliable reading order the migration preserves. Sorting
 * subchapters by slug sorts them as text, which puts article-10 and
 * article-11 before article-6; sorting by publication date does not help
 * either, because the feed gives many posts the same date. Checked
 * against chapter ב: ids 6..11 run from the opening section to the one
 * titled "summary", which is the order the chapter is written in.
 */
export function legacyIdOf(slug: string): number {
  const m = /(\d+)$/.exec(slug);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/** Sorts posts into reading order. */
export function byReadingOrder<T extends { slug: string }>(a: T, b: T): number {
  return legacyIdOf(a.slug) - legacyIdOf(b.slug);
}
