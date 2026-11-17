/**
 * Splits the English archive into the three sections Roni asked for:
 * Chapters, Sources and Quotes.
 *
 * Why a classifier and not three categories
 * -----------------------------------------
 * All 146 English posts live in one `english` category, imported that way
 * from WordPress. Re-filing them into three categories by hand is a lot
 * of admin work on content that is already correctly ordered, and the
 * three groups are plainly distinguishable from what the posts already
 * carry. So the split is derived, and the single category stays.
 *
 * The rule, in priority order:
 *
 *   1. `en-source-*`              -> Sources   (24 posts)
 *   2. `en-chapter-*`             -> Chapters  (7)
 *   3. title "Chapter X - ..." or
 *      "Introduction ..."         -> Chapters  (11, slugs en-1107..en-1117)
 *   4. title "Speaker: ..."       -> Quotes    (104)
 *
 * Checked against the live archive: every one of the 146 posts matches
 * exactly one rule, and nothing is left over.
 *
 * Rules 2 and 3 both exist because the chapter translations were imported
 * in two batches under two slug schemes. Classifying on the slug alone
 * would drop eleven chapters into Quotes; classifying on the title alone
 * would miss the seven whose titles were later edited. Both are needed.
 *
 * Rule 4 keys on the "Speaker:" shape rather than a slug range. The
 * numeric ranges looked tidy (en-10xx) but are not: en-1100 to en-1106
 * are quotes too, and `en-10\d\d` silently dropped seven of them into an
 * unclassified bucket. The film dialogue is always attributed, and the
 * chapters and sources never are, so the colon is the real signal.
 *
 * Anything matching no rule is returned in `unclassified` rather than
 * being hidden or forced into a section. Today that list is empty; if an
 * import adds something new, it shows up on the page instead of
 * disappearing, which is how this stays honest as content is added.
 *
 * Known misfiling: `en-source-46` is Roni's author biography, not a
 * source. It sorts into Sources because its slug says so. That is a
 * content fix in the admin, not a special case to hardcode here — a slug
 * exception in this file would outlive the problem and confuse the next
 * reader.
 */

export type EnglishSection = "chapters" | "sources" | "quotes";

/** A post as this module needs it: just a slug and a title. */
interface Classifiable {
  slug: string;
  title: string;
}

/** Titles of the form "Chapter D - ..." or "Introduction - ...". */
const CHAPTER_TITLE = /^(chapter\s|introduction\b)/i;

/**
 * Attributed film dialogue: a short speaker name, then a colon.
 *
 * Bounded at 40 characters so a long title that merely contains a colon
 * ("Sources - Chapter C/4 - Telephone (Tel Peh): The Secret of Prayer")
 * is not read as a speaker. Sources are matched by slug first anyway,
 * so this only has to separate quotes from chapter titles.
 */
const SPEAKER = /^[^:]{1,40}:/;

export function sectionOf(post: Classifiable): EnglishSection | null {
  const slug = post.slug.toLowerCase();
  const title = post.title.trim();

  if (slug.startsWith("en-source-")) return "sources";
  if (slug.startsWith("en-chapter-")) return "chapters";
  if (CHAPTER_TITLE.test(title)) return "chapters";
  if (SPEAKER.test(title)) return "quotes";
  return null;
}

export interface EnglishSections<T> {
  chapters: T[];
  sources: T[];
  quotes: T[];
  unclassified: T[];
}

/**
 * Groups posts into the three sections, preserving the order they arrive
 * in — the caller has already sorted by reading order, and re-sorting
 * here would scatter a sequence the author wrote deliberately.
 */
export function groupEnglish<T extends Classifiable>(posts: T[]): EnglishSections<T> {
  const out: EnglishSections<T> = {
    chapters: [],
    sources: [],
    quotes: [],
    unclassified: [],
  };
  for (const post of posts) {
    const section = sectionOf(post);
    if (section) out[section].push(post);
    else out.unclassified.push(post);
  }
  return out;
}
