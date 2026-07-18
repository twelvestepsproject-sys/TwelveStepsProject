"use client";

import { useEffect } from "react";

/**
 * Shared in-page modal/lightbox primitive for click-to-play video, factored
 * out of `intro-media-player.tsx` so `video_testimonials` (§5 #9) doesn't
 * duplicate the same dialog chrome (backdrop, Escape-to-close, scroll lock,
 * close button, stopPropagation guard). `intro-media-player.tsx` still owns
 * its own poster/badge affordance and YouTube-id extraction — only the
 * MODAL SHELL itself is shared here.
 *
 * Same explicit decision as `intro_media`: an in-page modal over a
 * high-opacity backdrop, NOT the native Fullscreen API (tried first for
 * intro_media, reverted per feedback — see intro-media-player.tsx's header
 * comment for the full history). Applying the same decision here for
 * consistency, per this task's brief.
 */
export function VideoLightboxModal({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="סגירת הסרטון"
        className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-lg transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:end-8 sm:top-8"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M1 1L17 17M17 1L1 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Stops the backdrop's onClick-to-close from firing when the click
          originates inside the video area itself. */}
      <div
        className="aspect-video w-full max-w-4xl overflow-hidden rounded-lg bg-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/** Extracts an 11-char YouTube video id from common URL shapes. Returns
 * null on anything unrecognized so a malformed `video_url` degrades to
 * "nothing plays" rather than a broken embed src. Shared with
 * intro-media-player.tsx's identical helper (kept here as the one
 * definition; that file re-exports/uses this rather than duplicating it
 * would be the cleaner end state — see final report friction note). */
export function extractYouTubeId(url: string): string | null {
  const pattern =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/|youtube\.com\/embed\/)([\w-]{11})/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}
