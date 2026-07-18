import type { MetadataRoute } from "next";
import { db } from "@/lib/queries";

/**
 * `/sitemap.xml` (§4, §9) — dynamic, generated from the DB, published
 * only. Next.js's built-in `sitemap.ts` convention (§16 Phase 3 item 16).
 * Covers every public route built this pass: static routes, trainings,
 * posts, categories, and lecturer bio pages (only those with `page_slug`
 * set, matching /odot/[person-slug]'s own visibility gate).
 *
 * Percent-encoded Hebrew slugs: Next.js's sitemap builder URL-encodes path
 * segments in the emitted XML automatically when given a plain unicode
 * string URL — no manual `encodeURIComponent` needed here, but this is
 * exactly the kind of thing §4 says to "verify early" (see final report's
 * verification section for the actual fetch-and-inspect test).
 */
function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/odot",
    "/hachsharot",
    "/tochnit-halimudim",
    "/kehila",
    "/blog",
    "/gallery",
    "/podcast",
    "/tsor-kesher",
    "/accessibility-statement",
  ].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));

  const [trainings, { items: posts }, categories, lecturers] = await Promise.all([
    db.listTrainings(),
    db.listPosts({ perPage: 1000 }),
    db.listCategories(),
    db.listLecturers({ visibleOnly: true }),
  ]);

  const trainingRoutes: MetadataRoute.Sitemap = trainings.map((t) => ({
    url: `${base}/hachsharot/${t.slug}`,
    lastModified: new Date(t.updated_at),
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/blog/category/${c.slug}`,
    lastModified: new Date(c.updated_at),
  }));

  const lecturerRoutes: MetadataRoute.Sitemap = lecturers
    .filter((l) => l.page_slug !== null)
    .map((l) => ({
      url: `${base}/odot/${l.page_slug}`,
      lastModified: new Date(l.updated_at),
    }));

  return [...staticRoutes, ...trainingRoutes, ...postRoutes, ...categoryRoutes, ...lecturerRoutes];
}
