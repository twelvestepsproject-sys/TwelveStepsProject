import type { Media } from "@/lib/schemas";

/**
 * Resolve a `Media` row's `storage_path` into a URL any `next/image`
 * consumer can request. This is a pure string helper — it does not read
 * fixtures or touch `db`; components still get the `Media` row itself
 * from `db.getMedia()` (or a nested/resolved field already carrying one),
 * and only pass its `storage_path` through this function to build the src.
 *
 * DATA_SOURCE=mock: `storage_path` is a fixture-relative path
 * ("images/<file>"), served by the `/api/mock-media/[...path]` route
 * handler (see that file for why).
 *
 * DATA_SOURCE=postgres: `storage_path` is relative to the storage root on
 * disk (STORAGE_DIR, default ./storage/media), served by the
 * `/api/media/[...path]` route handler. Same shape as the Supabase bucket
 * path, so the `media` rows did not need rewriting during the migration.
 *
 * DATA_SOURCE=supabase: `storage_path` is a `media`-bucket-relative path
 * (the bucket is public per supabase/migrations/00000000000013_storage.sql),
 * so it resolves to the public Storage URL directly — this is the ONE
 * place that builds it, no component touches this logic directly.
 */
export function mediaUrl(storagePath: string): string {
  if (process.env.DATA_SOURCE === "postgres") {
    return `/api/media/${storagePath}`;
  }
  if (process.env.DATA_SOURCE === "supabase") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
    return `${base}/storage/v1/object/public/media/${storagePath}`;
  }
  return `/api/mock-media/${storagePath.replace(/^images\//, "")}`;
}

/** Convenience overload for callers holding a full `Media` row. */
export function mediaUrlFor(media: Pick<Media, "storage_path">): string {
  return mediaUrl(media.storage_path);
}

/** Width the social-preview image is generated at. 1200 is the size the
 *  major scrapers expect, and it keeps the file small enough for them. */
export const OG_IMAGE_WIDTH = 1200;

/**
 * A share-preview URL for a media row, routed through the image optimizer.
 *
 * Pointing og:image straight at the upload does not work in practice: the
 * site's logo is a 1.27MB PNG, and WhatsApp drops preview images well below
 * that size — the tag resolved and the file fetched fine, but no preview
 * ever appeared. The same image at w=1200 comes back around 101KB.
 *
 * Returns the size actually served alongside the URL, since og:image:width
 * and :height must describe what the scraper receives rather than the
 * source file.
 */
export function ogImageFor(
  media: Pick<Media, "storage_path" | "width" | "height">,
): { url: string; width: number; height: number } {
  const src = mediaUrl(media.storage_path);
  return {
    url: `/_next/image?url=${encodeURIComponent(src)}&w=${OG_IMAGE_WIDTH}&q=75`,
    width: OG_IMAGE_WIDTH,
    height: Math.round((media.height / media.width) * OG_IMAGE_WIDTH),
  };
}
