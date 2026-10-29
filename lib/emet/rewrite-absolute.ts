/**
 * Rewrites links that point at the old site's own domain.
 *
 * 84 anchors across 41 posts link to https://emetmatrix.com/... — not the
 * `/?p=` query URLs the other rewriter handles, but Joomla-era permalinks
 * from before the site moved to WordPress. Left alone, every "לחצו כאן"
 * that should move a reader to the next subchapter sends them off this
 * site instead, which is what made the next-subchapter link on chapter ג
 * leave the site entirely.
 *
 * They cannot be matched on an id. The numbers in these paths are Joomla
 * article ids, a different numbering from the `?p=` ids the migration is
 * keyed on — 7, 8, 9 here are chapters א, ב, ג, while `?p=7` is a
 * subchapter of chapter ב. Only 16 of 55 even carry one, and only 3 of
 * the 84 anchors have a title attribute to fall back on.
 *
 * What they do carry, nearly always, is the Hebrew title in the path:
 *
 *   /9-פרק-ג'-מהות-עולם-ההעלם.../16-חוקים-חוקיות-ומה-שביניהם-קריעת-ים-הסוף
 *
 * So the match is on the title. The last path segment names the target;
 * normalising both it and the post titles — dropping punctuation,
 * collapsing separators — makes the comparison survive the differences in
 * how the same title was written in a path and in a post.
 *
 * A link that matches nothing keeps its original href. It still points at
 * a live site, which is a better outcome than a guess that silently sends
 * a reader to the wrong article, and the report counts them for review.
 */


/** Hebrew numerals, as used in "פרק יב". Same values the importer reads
 *  chapter numbers with — see scripts/import-emet.mjs. */
const NUMERALS: Record<string, number> = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5,
  "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10,
  "כ": 20, "ל": 30,
};

/** "פרק-ה-שפת-התוכנה" -> 5, "פרק-ט" -> 9. Null when the segment does not
 *  open with a chapter numeral. */
export function chapterNumberFromPath(segment: string): number | null {
  // Strip the Joomla id prefix and the file extension. Without the
  // extension "פרק-ט.html" failed where "פרק-ט" matched, because the
  // numeral was then followed by a dot rather than a separator or the
  // end of the segment.
  const decoded = decodeURIComponent(segment)
    .replace(/^\d+-/, "")
    .replace(/\.html?$/i, "");
  const m = /^פרק[\s_-]+([א-ת]+)(?:[\s_-]|$)/.exec(decoded);
  if (!m) return null;
  let total = 0;
  for (const ch of m[1]) {
    const value = NUMERALS[ch];
    // A letter outside the numeral set means this is a word, not a number.
    if (!value) return null;
    total += value;
  }
  return total > 0 && total <= 40 ? total : null;
}

const OLD_DOMAIN = /^https?:\/\/(?:www\.)?emetmatrix\.com(\/.*)?$/i;

/** Strips what varies between a path segment and a post title so the two
 *  can be compared: the leading Joomla id, the file extension, quotes,
 *  punctuation, and the difference between a hyphen and a space. */
export function normaliseTitle(value: string): string {
  return decodeURIComponent(value)
    .replace(/\.html?$/i, "")
    .replace(/^\d+-/, "")
    // Gershayim, geresh and the typographic quotes the titles mix freely.
    .replace(/[׳״'"‘’“”]/g, "")
    // Dashes, underscores and whitespace all become one separator.
    .replace(/[\s_\-–—]+/g, " ")
    .replace(/[^א-תa-zA-Z0-9 ]+/g, "")
    .trim()
    .toLowerCase();
}

export interface AbsoluteRewriteTarget {
  slug: string;
  title: string;
  route: string;
}

/** Builds a lookup from normalised title to route. */
export function buildTitleRouteMap(targets: AbsoluteRewriteTarget[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const target of targets) {
    const key = normaliseTitle(target.title);
    // First writer wins: a duplicate title would otherwise silently
    // redirect both to whichever was processed last.
    if (key && !map.has(key)) map.set(key, target.route);
  }
  return map;
}

export interface AbsoluteRewriteResult {
  html: string;
  /** Links that matched nothing, for the migration report. */
  unresolved: string[];
}

/**
 * Joomla's `index.php?option=com_content&id=NN` links carry no title, and
 * that id numbering does not match anything the migration kept. 38 of
 * them exist, and their anchor text is unambiguous about the intent:
 * "למקורות דף זה לחצו כאן" — every one points at the sources archive.
 *
 * Matching on that intent is honest where guessing an article would not
 * be: the destination is the archive, which is where the reader was being
 * sent, rather than a specific entry picked from an unusable id.
 */
const SOURCES_INTENT = /מקורות/;

export function rewriteAbsoluteLinks(
  html: string,
  titleRoutes: Map<string, string>,
  sourcesRoute?: string,
  chapterRoutes?: Map<number, string>,
): AbsoluteRewriteResult {
  const unresolved: string[] = [];
  if (!html) return { html: "", unresolved };

  // Anchors whose text names the sources archive, resolved before the
  // per-href pass since the signal is in the text, not the URL.
  let working = html;
  if (sourcesRoute) {
    working = working.replace(
      /<a([^>]*)href="([^"]*com_content[^"]*)"([^>]*)>([\s\S]{0,160}?)<\/a>/gi,
      (match, before: string, _href: string, after: string, text: string) =>
        SOURCES_INTENT.test(text)
          ? `<a${before}href="${sourcesRoute}"${after}>${text}</a>`
          : match,
    );
  }

  const out = working.replace(/href="([^"]+)"/gi, (match, href: string) => {
    const domain = OLD_DOMAIN.exec(href.replace(/&amp;/g, "&"));
    if (!domain) return match;

    const path = domain[1] ?? "/";
    // The site root maps to this site's root.
    if (path === "/" || path === "") return 'href="/"';

    // The last meaningful segment names the target article.
    const segments = path.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const key = normaliseTitle(segments[i]);
      const route = key ? titleRoutes.get(key) : undefined;
      if (route) return `href="${route}"`;
    }

    // A chapter link names the chapter by its Hebrew numeral, and the old
    // URLs abbreviate the title after it — "פרק-ה-שפת-התוכנה" against a
    // category called "פרק ה' | אשר בחר בנו ונתן לנו את שפת התוכנה", and
    // "פרק-ט" with no title at all. The numeral is the reliable part, so
    // it is matched on its own once the title has failed.
    for (let i = segments.length - 1; i >= 0; i--) {
      const number = chapterNumberFromPath(segments[i]);
      const route = number ? chapterRoutes?.get(number) : undefined;
      if (route) return `href="${route}"`;
    }

    unresolved.push(href);
    return match;
  });

  return { html: out, unresolved };
}

/**
 * Builds the title map from the posts in the database.
 *
 * Each page already loads every post to build the legacy-id map, so this
 * reuses that list rather than querying again. A chapter's own post lives
 * at its category's URL, same as in buildLegacyRouteMap.
 */
export function titleRoutesFromPosts(
  posts: { slug: string; title: string; category?: { slug: string } | null }[],
  emetPath: (path: string) => string,
): Map<string, string> {
  return buildTitleRouteMap(
    posts.map((post) => {
      let route: string;
      if (post.slug.startsWith("chapter-")) {
        route = emetPath(`/chapters/${post.category?.slug ?? post.slug}`);
      } else if (post.slug.startsWith("article-")) {
        route = post.category?.slug
          ? emetPath(`/chapters/${post.category.slug}/${post.slug}`)
          : emetPath(`/chapters/${post.slug}`);
      } else if (post.slug.startsWith("source-")) {
        route = emetPath(`/sources/${post.slug}`);
      } else {
        route = emetPath(`/en/articles/${post.slug}`);
      }
      return { slug: post.slug, title: post.title, route };
    }),
  );
}

/**
 * Chapter number -> route, built from the chapter categories.
 *
 * Separate from the title map because the old URLs name a chapter by its
 * numeral and then abbreviate the title, so the titles do not match while
 * the numerals always do.
 */
export function chapterRoutesFromCategories(
  categories: { slug: string }[],
  emetPath: (path: string) => string,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const category of categories) {
    const m = /^chapter-(\d+)$/.exec(category.slug);
    if (m) map.set(Number(m[1]), emetPath(`/chapters/${category.slug}`));
  }
  return map;
}
