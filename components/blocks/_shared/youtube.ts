/**
 * Extracts an 11-char YouTube video id from common URL shapes. Returns
 * null on anything unrecognized, so a malformed `video_url` degrades to
 * "nothing plays" rather than a broken embed src.
 *
 * Lives in its own module rather than in video-lightbox-modal.tsx, where
 * it used to sit: that file is `"use client"`, so importing this helper
 * from a Server Component (the podcast block) would pull an entire client
 * component into the server bundle for one pure string function. The
 * lightbox's own comment already flagged the shared definition as the
 * cleaner end state.
 */
export function extractYouTubeId(url: string): string | null {
  const pattern =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/|youtube\.com\/embed\/)([\w-]{11})/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}
