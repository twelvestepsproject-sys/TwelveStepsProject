"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export interface GalleryLightboxImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * Masonry grid + lightbox for `photo_gallery` (§5 #14). Not a video modal
 * (so it doesn't reuse `video-lightbox-modal.tsx`), but the same
 * interaction shape: click a thumbnail, an in-page overlay opens showing
 * the full image, Escape/backdrop-click/× all close it, body scroll is
 * locked while open. Includes prev/next arrows since a gallery — unlike a
 * single video card — has multiple images to page through without closing.
 *
 * Masonry via CSS columns (`columns-2 sm:columns-3`) rather than a JS
 * masonry library — cheap, no layout-thrash on resize, and every image
 * still has explicit width/height so `next/image` can prevent CLS.
 */
export function GalleryLightbox({ images }: { images: GalleryLightboxImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === "ArrowRight")
        setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, images.length]);

  const open = openIndex !== null ? images[openIndex] : null;

  return (
    <>
      <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="block w-full overflow-hidden rounded-lg transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={img.alt}
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              className="h-auto w-full object-cover"
              sizes="(min-width: 640px) 33vw, 50vw"
            />
          </button>
        ))}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 sm:p-8"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="סגירת התמונה"
            className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-lg transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:end-8 sm:top-8"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M1 1L17 17M17 1L1 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
                }}
                aria-label="התמונה הבאה"
                className="absolute start-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-lg transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:start-8"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M11 2L4 9L11 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
                }}
                aria-label="התמונה הקודמת"
                className="absolute end-4 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-lg transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:end-8 sm:bottom-8 sm:top-1/2 sm:-translate-y-1/2"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M7 2L14 9L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : null}

          <div
            className="flex max-h-[85vh] max-w-4xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={open.src}
              alt={open.alt}
              width={open.width}
              height={open.height}
              className="max-h-[85vh] w-auto rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
