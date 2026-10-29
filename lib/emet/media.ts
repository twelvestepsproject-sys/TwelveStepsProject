import { db } from "@/lib/queries";
import type { Media } from "@/lib/schemas";

/**
 * Looks the homepage images up by filename.
 *
 * The media table is keyed by uuid, which a page cannot know at build
 * time, and hardcoding ids would break the moment an editor replaces an
 * image through the admin. Filenames are stable and meaningful, so the
 * page asks for "hero-bg.webp" and gets whatever row currently holds it.
 *
 * One query for the whole set rather than one per image: eight sequential
 * round-trips to render a single page is the kind of thing that is cheap
 * locally and slow on a small VPS.
 */
export type MediaByFile = Map<string, Media>;

export async function loadMediaByFilename(filenames: string[]): Promise<MediaByFile> {
  const wanted = new Set(filenames);
  // perPage covers the whole table comfortably; this site has tens of
  // images, not thousands.
  const { items } = await db.listMedia({ perPage: 500 });

  const map: MediaByFile = new Map();
  for (const item of items) {
    const file = item.storage_path.split("/").pop();
    if (file && wanted.has(file)) map.set(file, item);
  }
  return map;
}
