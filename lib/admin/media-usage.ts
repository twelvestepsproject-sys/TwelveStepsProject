import "server-only";
import { db } from "@/lib/queries";

/**
 * §8 Media Library: "usage list ('used on 3 pages'), safe delete with
 * in-use warning." Best-effort scan across fixtures/mock-store data for
 * references to a given `media.id` — not exhaustively perfect (per task
 * brief), but catches the obvious/common reference fields: trainings'
 * cover_image_id, lecturers' photo_id, testimonials' photo_id, posts'
 * cover_image_id, podcast cover_image_id, site_settings' logo/favicon/OG
 * fields, gallery images, and every `*_media_id`/`*_image_id` field nested
 * inside pages.blocks[].data.
 */
export interface MediaUsageRef {
  label: string;
  href: string;
}

function scanBlockData(data: unknown, mediaId: string): boolean {
  if (data == null) return false;
  if (typeof data === "string") return data === mediaId;
  if (Array.isArray(data)) return data.some((v) => scanBlockData(v, mediaId));
  if (typeof data === "object") {
    return Object.values(data as Record<string, unknown>).some((v) => scanBlockData(v, mediaId));
  }
  return false;
}

export async function findMediaUsage(mediaId: string): Promise<MediaUsageRef[]> {
  const refs: MediaUsageRef[] = [];

  const [trainings, lecturers, testimonials, posts, podcast, galleries, pages, siteSettings] =
    await Promise.all([
      db.listTrainingsAdmin({ perPage: 500 }),
      db.listLecturersAdmin({ perPage: 500 }),
      db.listTestimonialsAdmin({ perPage: 500 }),
      db.listPosts({ perPage: 500, includeDrafts: true }),
      db.listPodcastEpisodes(),
      db.listGalleries(),
      db.listPages({ perPage: 500, includeDrafts: true }),
      db.getSiteSettings(),
    ]);

  for (const t of trainings.items) {
    if (t.cover_image_id === mediaId) {
      refs.push({ label: `הכשרה: ${t.title}`, href: `/admin/trainings/${t.id}` });
    }
  }
  for (const l of lecturers.items) {
    if (l.photo_id === mediaId) {
      refs.push({ label: `מרצה: ${l.name}`, href: `/admin/lecturers/${l.id}` });
    }
  }
  for (const te of testimonials.items) {
    if (te.photo_id === mediaId) {
      refs.push({ label: `המלצה: ${te.author_name}`, href: `/admin/testimonials/${te.id}` });
    }
  }
  for (const p of posts.items) {
    if (p.cover_image_id === mediaId) {
      refs.push({ label: `מאמר: ${p.title}`, href: `/admin/posts/${p.id}` });
    }
  }
  for (const ep of podcast) {
    if (ep.cover_image_id === mediaId) {
      refs.push({ label: `פרק פודקאסט: ${ep.title}`, href: `/admin/podcast/${ep.id}` });
    }
  }
  for (const g of galleries) {
    if (g.images.some((img) => img.media_id === mediaId)) {
      refs.push({ label: `גלריה: ${g.title}`, href: `/admin/galleries/${g.id}` });
    }
  }
  for (const page of pages.items) {
    const usedInBlock = page.blocks.some((b) => scanBlockData(b.data, mediaId));
    if (usedInBlock) {
      refs.push({ label: `עמוד: ${page.title}`, href: `/admin/pages/${page.id}` });
    }
  }
  if (
    siteSettings.logo_id === mediaId ||
    siteSettings.logo_dark_id === mediaId ||
    siteSettings.favicon_id === mediaId ||
    siteSettings.og_default_image_id === mediaId
  ) {
    refs.push({ label: "הגדרות מיתוג (לוגו / favicon / תמונת שיתוף)", href: "/admin/branding" });
  }

  return refs;
}
