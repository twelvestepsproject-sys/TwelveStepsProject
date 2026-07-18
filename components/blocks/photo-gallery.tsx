import type { z } from "zod";
import type { photoGalleryBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";
import { GalleryLightbox, type GalleryLightboxImage } from "./_shared/gallery-lightbox";

/**
 * §5 block 14 — Photo gallery (masonry + lightbox). Reads
 * `db.getGallery()` by the `gallery_id` on the block's own `data` — the
 * interface's method takes a slug, and `lib/mock/fixtures/galleries.ts`
 * fixture's `slug` is looked up by resolving the gallery once via
 * `db.listGalleries()` and matching by id, since `getGallery(slug)` doesn't
 * offer an id-based lookup on the current `DataSource` interface (a
 * friction point worth flagging — `photoGalleryBlockDataSchema.gallery_id`
 * assumes id-based lookup but the interface is slug-based; see final report).
 *
 * `gallery_images` come back already nested/resolved on the `Gallery`
 * shape — each carries `media_id`, resolved here via `db.getMedia()`
 * exactly like every other image-using block (no join left to this
 * component beyond that one extra lookup per image).
 *
 * This gallery fixture (`lib/mock/fixtures/galleries.ts`) did not exist
 * before this pass — it's a genuine content gap that was filled by
 * downloading 5 openly-licensed Unsplash photos (logged in
 * docs/licenses.md with verified photographer/license) rather than leaving
 * this block unrenderable.
 */
type PhotoGalleryData = z.infer<typeof photoGalleryBlockDataSchema>;

export async function PhotoGallery({ data }: { data: PhotoGalleryData }) {
  const galleries = await db.listGalleries();
  const gallery = galleries.find((g) => g.id === data.gallery_id) ?? null;

  if (!gallery || gallery.images.length === 0) return null;

  const sortedImages = gallery.images.slice().sort((a, b) => a.sort_order - b.sort_order);
  const media = await Promise.all(sortedImages.map((img) => db.getMedia(img.media_id)));

  const images: GalleryLightboxImage[] = sortedImages
    .map((img, i) => {
      const m = media[i];
      if (!m) return null;
      return { src: mediaUrlFor(m), alt: img.alt_he || m.alt_he, width: m.width, height: m.height };
    })
    .filter((img): img is GalleryLightboxImage => img !== null);

  if (images.length === 0) return null;

  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-6xl">
        {data.heading ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}
        <GalleryLightbox images={images} />
      </RevealOnScroll>
    </section>
  );
}

export function PhotoGallerySkeleton() {
  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mx-auto mb-8 h-8 w-48" />
        <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={i % 2 === 0 ? "h-48" : "h-64"} />
          ))}
        </div>
      </div>
    </section>
  );
}
