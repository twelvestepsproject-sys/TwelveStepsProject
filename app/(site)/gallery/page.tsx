import type { Metadata } from "next";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { GalleryLightbox, type GalleryLightboxImage } from "@/components/blocks/_shared/gallery-lightbox";

/**
 * `/gallery` — Gallery (§4, literal slug per the sitemap). Reads
 * `db.listGalleries()` / resolves each image's `media_id` via
 * `db.getMedia()`, reusing `GalleryLightbox` — the same masonry+lightbox
 * component already built for the homepage's `photo_gallery` block — per
 * the task brief's explicit instruction not to build a second lightbox.
 * Renders every gallery in the collection (not just the one instance the
 * homepage block references), each as its own titled section.
 */
// BUG FIX: was a static `export const metadata` with the org name
// hardcoded — same class of bug as app/layout.tsx's root metadata, fixed
// the same way (generateMetadata + db.getSiteSettings()).
export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.getSiteSettings();
  return {
    title: `גלריה | ${settings.site_name}`,
    description: `רגעים מהתהליך, מהסדנאות, ומהקהילה של ${settings.site_name}.`,
  };
}

export default async function GalleryPage() {
  const galleries = await db.listGalleries();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">גלריה</h1>
        <p className="mt-2 text-ink-muted">רגעים מהתהליך, מהסדנאות, ומהקהילה שלנו.</p>
      </header>

      {galleries.length === 0 ? (
        <p className="text-center text-ink-muted">אין כרגע תמונות להצגה.</p>
      ) : (
        <div className="flex flex-col gap-16">
          {await Promise.all(
            galleries.map(async (gallery) => {
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
                <section key={gallery.id}>
                  <h2 className="mb-6 font-display text-xl font-bold text-ink">{gallery.title}</h2>
                  <GalleryLightbox images={images} />
                </section>
              );
            }),
          )}
        </div>
      )}
    </main>
  );
}
