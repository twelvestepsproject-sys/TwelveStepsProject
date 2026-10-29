/**
 * Rewrites the legacy links inside an imported article body.
 *
 * The source's internal links are WordPress query URLs — `/?p=8`,
 * `?page_id=1300` — which resolve to nothing on this site. Left alone,
 * every cross-reference in the migrated text is a dead end, and search
 * engines follow them into redirects rather than straight to the article.
 *
 * The map is built from the posts already in the database, so it is
 * always the real set of destinations rather than a hardcoded table that
 * drifts. A legacy id with no matching post keeps its original href: a
 * broken link is honest, and silently pointing it at the homepage would
 * hide missing content the migration report is meant to surface.
 */

/** `?p=8` or `?page_id=1300`, with or without a leading path. */
const LEGACY_LINK = /href="(?:https?:\/\/[^"/]*)?\/?\?(?:p|page_id)=(\d+)[^"]*"/gi;

export type LegacyRouteMap = Map<string, string>;

/** Builds legacy-id -> route from post slugs, which carry the id. */
export function buildLegacyRouteMap(
  posts: { slug: string; category?: { slug: string } | null }[],
): LegacyRouteMap {
  const map: LegacyRouteMap = new Map();
  for (const post of posts) {
    const id = /(\d+)$/.exec(post.slug)?.[1];
    if (!id) continue;

    if (post.slug.startsWith("chapter-")) {
      // The chapter's own post lives at its category's URL.
      map.set(id, `/chapters/${post.category?.slug ?? post.slug}`);
    } else if (post.slug.startsWith("article-")) {
      const chapter = post.category?.slug;
      map.set(id, chapter ? `/chapters/${chapter}/${post.slug}` : `/chapters/${post.slug}`);
    } else if (post.slug.startsWith("source-")) {
      map.set(id, `/sources/${post.slug}`);
    } else if (post.slug.startsWith("en-")) {
      map.set(id, `/en/articles/${post.slug}`);
    }
  }
  return map;
}

export function rewriteLegacyLinks(html: string, routes: LegacyRouteMap): string {
  if (!html) return "";
  return html.replace(LEGACY_LINK, (match, id: string) => {
    const route = routes.get(id);
    return route ? `href="${route}"` : match;
  });
}

/**
 * Removes the "תת-פרקים:" block some bodies begin with.
 *
 * WordPress wrote a list of a chapter's parts into the top of the chapter
 * post *and* into each of its subchapters — seven posts carry an
 * identical copy. The page already renders that navigation properly, from
 * the database, with the current part marked, so showing the stale copy
 * above every article repeats it twice on the same screen and sends the
 * reader through links that need rewriting to work.
 *
 * Only the leading block is touched, and only when it is a heading
 * immediately followed by a list: a mid-article list of the same shape is
 * the author's own writing and stays. The database keeps every body as
 * imported, so this is presentation, not deletion.
 */
const LEADING_INDEX =
  /^\s*<p>\s*(?:<strong>)?\s*תת-?פרקים\s*:?\s*(?:<\/strong>)?\s*<\/p>\s*<ul>[\s\S]*?<\/ul>/i;

export function stripLeadingSubchapterIndex(html: string): string {
  return html.replace(LEADING_INDEX, "").trimStart();
}
