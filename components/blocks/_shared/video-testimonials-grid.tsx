"use client";

import { useState } from "react";
import type { z } from "zod";
import Image from "next/image";
import type { Media, videoTestimonialsBlockDataSchema } from "@/lib/schemas";
import { mediaUrlFor } from "@/lib/media";
import { VideoLightboxModal, extractYouTubeId } from "./video-lightbox-modal";
import { RevealOnScroll } from "./reveal-on-scroll";

type VideoTestimonialsData = z.infer<typeof videoTestimonialsBlockDataSchema>;

/**
 * §5 block 9 — Video testimonials / intro videos. Lightbox cards, the same
 * click-to-play pattern as `intro_media` (§5 #3) but multiple cards in a
 * grid, one shared lightbox tracked by index so only one can be open at a
 * time. Reuses `video-lightbox-modal.tsx` (the modal shell extracted from
 * `intro-media-player.tsx` in this same pass) instead of a second modal
 * implementation.
 *
 * Client component: the "which card is open" state has to live above
 * individual cards. The parent (`components/blocks/video-testimonials.tsx`,
 * an async Server Component) does the `db.getMedia()` thumbnail resolution
 * and passes already-resolved `Media` rows in as a prop — this component
 * itself makes no `db` calls, mirroring the intro_media split
 * (`intro-media.tsx` reads `db`, `intro-media-player.tsx` is pure client).
 */
export function VideoTestimonialsGrid({
  heading,
  videos,
  thumbnails,
}: {
  heading: string | null;
  videos: VideoTestimonialsData["videos"];
  thumbnails: (Media | null)[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openVideo = openIndex !== null ? videos[openIndex] : null;
  const openVideoId = openVideo ? extractYouTubeId(openVideo.video_url) : null;

  return (
    <section className="bg-surface px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-6xl">
        {heading ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {heading}
          </h2>
        ) : null}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video, i) => {
            const thumbnail = thumbnails[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-surface-alt text-start transition-transform duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label={`הפעלת סרטון: ${video.title}`}
              >
                {thumbnail ? (
                  <Image
                    src={mediaUrlFor(thumbnail)}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
                <span className="absolute inset-0 bg-ink/10 transition-colors group-hover:bg-ink/20" />
                <span
                  className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-accent/95 shadow-lg transition-transform duration-300 group-hover:scale-110"
                  aria-hidden="true"
                >
                  <svg width="18" height="22" viewBox="0 0 22 26" fill="none">
                    <path d="M2 2L20 13L2 24V2Z" fill="var(--color-accent-fg)" />
                  </svg>
                </span>
                <span className="absolute bottom-2 start-2 end-2 truncate rounded-md bg-ink/60 px-3 py-1.5 text-sm font-semibold text-primary-fg">
                  {video.title}
                </span>
              </button>
            );
          })}
        </div>
      </RevealOnScroll>

      <VideoLightboxModal
        open={openIndex !== null}
        onClose={() => setOpenIndex(null)}
        label={openVideo?.title ?? ""}
      >
        {openVideoId ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${openVideoId}?autoplay=1`}
            title={openVideo?.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : null}
      </VideoLightboxModal>
    </section>
  );
}
