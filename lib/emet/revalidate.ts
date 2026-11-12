import { revalidatePath } from "next/cache";
import { emetPath } from "./routes";

/**
 * Revalidates the EMETMATRIX pages a post appears on.
 *
 * Saving a post in the admin revalidated /blog, /blog/[slug] and /rss.xml
 * — the הנני side only. Every (emet) route sets `revalidate = 3600`, so an
 * edit to a chapter or an English article stayed invisible for up to an
 * hour, and a NEWLY created post 404'd until the next deploy: its route
 * had never been generated, and nothing told Next to try.
 *
 * That is why 17 retranslated chapters and 21 new source pages looked
 * unchanged after being saved. The content was in the database the whole
 * time; the public pages were served from the cache.
 *
 * Paths are derived from the post's category rather than revalidating the
 * whole site, so saving one chapter does not discard the cache for 300
 * other pages. The category also decides which section listing changes:
 *
 *   english    -> /en and /en/articles/<slug>
 *   sources    -> /sources and /sources/<slug>
 *   chapter-NN -> /chapters, /chapters/chapter-NN and the article page
 *
 * Everything runs through emetPath(), so this keeps working when
 * EMET_BASE_PATH is emptied for the site's own domain.
 */
export function revalidateEmetForPost(post: {
  slug: string;
  category?: { slug?: string | null } | null;
}): void {
  const category = post.category?.slug ?? null;

  // The home page carries the latest-content lists, so it changes whatever
  // the category is.
  revalidatePath(emetPath("/"));

  if (!category) return;

  if (category === "english") {
    revalidatePath(emetPath("/en"));
    revalidatePath(emetPath(`/en/articles/${post.slug}`));
    return;
  }

  if (category === "sources") {
    revalidatePath(emetPath("/sources"));
    revalidatePath(emetPath(`/sources/${post.slug}`));
    return;
  }

  // Chapters are one category per chapter — "chapter-1" ... "chapter-17" —
  // and an article lives under its own chapter's slug.
  if (/^chapter-\d+$/.test(category)) {
    revalidatePath(emetPath("/chapters"));
    revalidatePath(emetPath(`/chapters/${category}`));

    // A post whose slug starts with "chapter-" IS the chapter's own page
    // and lives at the chapter URL, not under it — the same rule the
    // [article] route's generateStaticParams applies when it skips those
    // posts. Revalidating a /chapters/x/chapter-y path would be a route
    // that does not exist.
    if (!post.slug.startsWith("chapter-")) {
      revalidatePath(emetPath(`/chapters/${category}/${post.slug}`));
    }
  }
}
