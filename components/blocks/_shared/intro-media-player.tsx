"use client";

import { useState } from "react";
import Image from "next/image";
import { VideoLightboxModal } from "./video-lightbox-modal";
import { extractYouTubeId } from "./youtube";

/**
 * Click-to-play video affordance for the `intro_media` block (§5 #3).
 *
 * Deliberately NOT an autoplaying iframe on load:
 * - Renders a static poster image with a play-button badge until clicked.
 * - The `<iframe>` only mounts after a user click, and points at
 *   `youtube-nocookie.com` (the privacy-enhanced embed domain) rather than
 *   `youtube.com` — reduces third-party cookie/tracking surface before
 *   consent, and is the domain §14's CSP allowlist should cover once
 *   security headers are added (no CSP exists yet in this repo — that's a
 *   later phase, not built yet, so nothing to update there today).
 * - No `autoplay=1` other than the ONE we add ourselves at the moment of
 *   the click (autoplay after explicit user interaction is standard and
 *   expected — it's autoplay-on-page-load that's the thing being avoided,
 *   per the "click-to-play affordance, not an autoplaying iframe" brief).
 * - This is the only client component in the intro_media block — kept
 *   small and isolated so the JS boundary is minimal (§3 perf constraint).
 *
 * Click behavior: opens an in-page modal/lightbox — NOT the native
 * Fullscreen API (tried first, reverted per feedback: true OS-level
 * fullscreen felt too aggressive; a large modal over a high-opacity
 * backdrop, closable via an explicit × button or Escape, is what's wanted
 * instead). The modal covers most but not all of the viewport (max-width/
 * max-height with margin, not edge-to-edge) and is built entirely from our
 * own tokens/markup — layout idea only, no copied text, colors, or assets
 * from any reference material.
 *
 * The modal shell itself (backdrop, Escape/scroll-lock, close button) is
 * now factored out to `_shared/video-lightbox-modal.tsx` so the
 * `video_testimonials` block (§5 #9, built in the same pass this comment
 * was added) reuses it instead of a second copy — this component keeps
 * only its own poster/badge affordance.
 *
 * Visual treatment: an original play-button badge (a plain circle + triangle
 * built from CSS/SVG here, our own accent-token color), NOT a copy of the
 * reference screenshots' specific badge graphic — see the block's own
 * comment header and the final report for the explicit reference-usage
 * confirmation.
 */
export function IntroMediaPlayer({
  videoUrl,
  posterSrc,
  posterAlt,
}: {
  videoUrl: string;
  posterSrc: string | null;
  posterAlt: string;
}) {
  const [open, setOpen] = useState(false);
  const videoId = extractYouTubeId(videoUrl);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative aspect-video w-full max-w-2xl overflow-hidden rounded-lg bg-surface-alt transition-transform duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`הפעלת סרטון: ${posterAlt}`}
      >
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <span className="absolute inset-0 bg-ink/10 transition-colors group-hover:bg-ink/20" />
        <span
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent/95 shadow-lg transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        >
          {/* original triangle play glyph — plain SVG, no traced asset */}
          <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
            <path d="M2 2L20 13L2 24V2Z" fill="var(--color-accent-fg)" />
          </svg>
        </span>
      </button>

      {videoId ? (
        <VideoLightboxModal open={open} onClose={() => setOpen(false)} label={posterAlt}>
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title={posterAlt}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </VideoLightboxModal>
      ) : null}
    </>
  );
}
