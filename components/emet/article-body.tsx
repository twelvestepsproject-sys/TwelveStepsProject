import { sanitizeArticleHtml } from "@/lib/emet/sanitize-html";
import { rewriteAbsoluteLinks } from "@/lib/emet/rewrite-absolute";
import {
  dropUnresolvableImages,
  rewriteLegacyLinks,
  stripLeadingSubchapterIndex,
  type LegacyRouteMap,
} from "@/lib/emet/rewrite-links";

/**
 * Renders a migrated article body.
 *
 * The content arrives as the HTML WordPress stored, which is why this
 * renders markup rather than plain text: dropping the tags would lose the
 * paragraph breaks, headings and blockquotes the articles are built from,
 * and the brief is explicit that migrated text must not be reshaped.
 *
 * It is passed through `sanitizeArticleHtml` first. The source is a site
 * nobody here controls and the bodies predate it — treating them as
 * trusted markup would mean any script left in twenty years of imports
 * executes on this domain.
 *
 * Typography is set here rather than per page so every article — chapter,
 * subchapter, source, English — reads the same. The measure is capped at
 * ~70 characters, which is where Hebrew prose stays comfortable over the
 * long articles this site is made of.
 */
export function ArticleBody({
  html,
  lang,
  routes,
  titleRoutes,
  sourcesRoute,
  chapterRoutes,
  stripIndex = false,
}: {
  html: string;
  lang?: "he" | "en";
  /** Legacy id -> route, so `/?p=8` links resolve. Omitted on pages
   *  that have no cross-references to fix. */
  routes?: LegacyRouteMap;
  /** Normalised title -> route, for the Joomla-era permalinks that point
   *  at the old domain by title rather than by id. */
  titleRoutes?: Map<string, string>;
  /** Where "למקורות … לחצו כאן" should land. Those anchors point at
   *  Joomla ids that resolve to nothing, but their text is unambiguous. */
  sourcesRoute?: string;
  /** Chapter number -> route, for old URLs that name a chapter by its
   *  Hebrew numeral and abbreviate the title after it. */
  chapterRoutes?: Map<number, string>;
  /** Drops the duplicated "תת-פרקים" list where the page renders that
   *  navigation itself. */
  stripIndex?: boolean;
}) {
  let source = html;
  if (stripIndex) source = stripLeadingSubchapterIndex(source);
  // Always: a relative src is a 404 on every page, not just the ones
  // whose index gets stripped.
  source = dropUnresolvableImages(source);
  if (routes) source = rewriteLegacyLinks(source, routes);
  // Absolute links to the old domain would take the reader off this site
  // entirely — including the "לחצו כאן" that should move them to the
  // next subchapter.
  if (titleRoutes) {
    source = rewriteAbsoluteLinks(source, titleRoutes, sourcesRoute, chapterRoutes).html;
  }
  const clean = sanitizeArticleHtml(source);
  const english = lang === "en";

  return (
    <div
      lang={english ? "en" : "he"}
      dir={english ? "ltr" : "rtl"}
      className={[
        "emet-prose mx-auto max-w-[70ch]",
        "text-[1.0625rem] leading-[1.9] text-[#333] sm:text-[1.125rem]",
        english ? "text-left" : "text-right",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
