import type { Media } from "@/lib/schemas";

/**
 * Resolve a `Media` row's `storage_path` into a URL any `next/image`
 * consumer can request. This is a pure string helper — it does not read
 * fixtures or touch `db`; components still get the `Media` row itself
 * from `db.getMedia()` (or a nested/resolved field already carrying one),
 * and only pass its `storage_path` through this function to build the src.
 *
 * Mock phase: `storage_path` is a fixture-relative path
 * ("images/<file>"), served by the `/api/mock-media/[...path]` route
 * handler (see that file for why). Phase 5/6 swap: once Supabase Storage
 * is live, `storage_path` becomes a bucket-relative path and this is the
 * ONE place that changes to build the public Storage URL instead — no
 * component touches this logic directly, keeping the seam intact.
 */
export function mediaUrl(storagePath: string): string {
  return `/api/mock-media/${storagePath.replace(/^images\//, "")}`;
}

/** Convenience overload for callers holding a full `Media` row. */
export function mediaUrlFor(media: Pick<Media, "storage_path">): string {
  return mediaUrl(media.storage_path);
}
