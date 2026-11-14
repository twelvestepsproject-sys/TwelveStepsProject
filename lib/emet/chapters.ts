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

/**
 * The Hebrew numeral for a chapter, as the eyebrow line shows it:
 * `2` -> `ב׳`.
 *
 * Built from the letter table rather than read off the category name,
 * because the names spell the numeral inconsistently (plain apostrophe,
 * geresh, curly quote, sometimes none) and the eyebrow needs one
 * spelling. Uses the geresh U+05F3, which is the correct mark for a
 * Hebrew numeral — not an ASCII apostrophe.
 *
 * Covers 1-17, the chapters that exist. Returns null above that rather
 * than inventing a numeral, so a new chapter shows the Latin label alone
 * instead of something wrong.
 */
const HEBREW_NUMERALS = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט",
  "י", "יא", "יב", "יג", "יד", "טו", "טז", "יז",
];

export function hebrewNumeralOf(n: number): string | null {
  const letter = HEBREW_NUMERALS[n - 1];
  if (!letter) return null;
  // One letter takes a geresh after it (א׳); two or more take a gershayim
  // before the last (י״א). Writing ב׳ as ב' with an ASCII apostrophe, or
  // יא׳ with a trailing geresh, is the usual mistake — both are wrong.
  return letter.length === 1
    ? `${letter}׳`
    : `${letter.slice(0, -1)}״${letter.slice(-1)}`;
}

/**
 * The Latin half of the eyebrow: `2` -> `B`, so the line reads
 * "פרק ב׳ · CHAPTER B".
 *
 * Stops at Z. Past 26 there is no single letter to use and the eyebrow
 * falls back to the number, which is still readable.
 */
export function latinLetterOf(n: number): string {
  return n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : String(n);
}

/**
 * Whether a chapter's excerpt is usable as a hero subtitle.
 *
 * The import carried WordPress's auto-generated excerpts, which are just
 * the first ~55 words of the body. For these chapters that is almost
 * never a standfirst — it is either the subchapter index the body opens
 * with ("תת פרקים: …") or the fallback text inside the old <video> tag
 * ("Your browser doesn't support video. Please download the file…").
 *
 * Showing either under a chapter title would publish scraped noise as
 * though an editor had written it, so both shapes are rejected. A
 * genuinely written excerpt passes through untouched, which is what an
 * editor filling the field in the admin will get.
 *
 * Also rejects an excerpt that merely repeats the chapter heading, and
 * anything long enough to be a paragraph rather than a standfirst.
 */
export function chapterSubtitleOf(excerpt: string | null | undefined): string | null {
  const text = excerpt?.trim();
  if (!text) return null;

  // The <video> fallback, in the two spellings the bodies use (straight
  // and curly apostrophe).
  if (/browser\s+doesn[’']?t\s+support\s+video/i.test(text)) return null;
  if (/please\s+download\s+the\s+file/i.test(text)) return null;

  // The subchapter index, with or without the hyphen.
  if (/^תת[\s-]*פרק(ים)?\s*:/.test(text)) return null;

  // A standfirst is a line, not a page. Past this it is body copy that
  // happened to land in the field.
  if (text.length > 160) return null;

  return text;
}

/**
 * The one-sentence summary shown on a part's card.
 *
 * Rejects the same auto-generated shapes as chapterSubtitleOf(), and
 * additionally strips a leading repeat of the part's own title: the
 * imported excerpts start with the heading before the body text
 * ("מ-א-כ-ל מה / איך / כמה / למה כמה אחד התופעות…"), so printing them
 * raw puts the title twice on the same card.
 *
 * Returns null rather than a guess when nothing usable is left. The card
 * then shows its title alone, which is the honest result for a part
 * whose excerpt has not been written yet.
 */
export function partExcerptOf(
  excerpt: string | null | undefined,
  title: string,
): string | null {
  let text = excerpt?.trim();
  if (!text) return null;

  if (/browser\s+doesn[’']?t\s+support\s+video/i.test(text)) return null;
  if (/please\s+download\s+the\s+file/i.test(text)) return null;
  if (/^תת[\s-]*פרק(ים)?\s*:/.test(text)) return null;

  // Drop a leading copy of the title. Compared on normalised whitespace
  // so the differing spacing in the imported text still matches.
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const t = norm(title);
  if (t && norm(text).startsWith(t)) {
    text = norm(text).slice(t.length).trim();
    // A separator often sits between the repeated title and the body.
    text = text.replace(/^[–—\-|:·,.]+\s*/, "");
  }

  return text.length > 0 ? text : null;
}
