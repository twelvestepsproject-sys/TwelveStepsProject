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
 * DATA_SOURCE=supabase: `storage_path` is a `media`-bucket-relative path
 * (the bucket is public per supabase/migrations/00000000000013_storage.sql),
 * so it resolves to the public Storage URL directly — this is the ONE
 * place that builds it, no component touches this logic directly.
 */
export function mediaUrl(storagePath: string): string {
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
