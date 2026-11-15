import { extractYouTubeId } from "@/components/blocks/_shared/youtube";

/**
 * The picture for a chapter part's card, when no cover was chosen.
 *
 * Why this exists
 * ---------------
 * Roni asked for an image beside each part in the "המשך הפרק" list. The
 * card has always been able to show one — but `cover_image_id` was never
 * saved by the admin form, so every card fell back to its numbered tile.
 * Giving her the field back (post-form.tsx) fixes that for new work and
 * leaves 29 existing parts to fill in by hand.
 *
 * They do not need filling in. Almost every part opens with its own
 * YouTube video, and YouTube publishes a still for every video at a
 * fixed address, so the part already carries a topical picture — one
 * whose subject is exactly this part, chosen by whoever made the video.
 * That beats "the first image in the body", which on these pages would
 * have found the same thumbnail by a longer route, and it beats asking an
 * editor to pick 29 stills by hand.
 *
 * Precedence: a chosen cover always wins. This is the fallback, and the
 * numbered tile remains the fallback to the fallback, for a part with
 * neither a cover nor a video.
 *
 * Not written into the database
 * -----------------------------
 * Derived at render rather than stored as a media row. The thumbnail is
 * not ours: it lives on YouTube beside a video that can be re-edited or
 * replaced, and a copy in our media library would quietly go stale. It
 * also means nothing to undo if a part's video changes.
 *
 * Size: `hqdefault` (480x360) is the largest still guaranteed to exist
 * for every video. `maxresdefault` is absent on plenty of them and 404s,
 * which in an <img> is a broken box rather than a fallback.
 */
const THUMB_HOST = "https://i.ytimg.com/vi";

/** First YouTube id in a post body, from either an embed iframe or a
 *  plain watch/short link. Null when the body has no video. */
export function firstVideoIdIn(html: string | null | undefined): string | null {
  if (!html) return null;

  // The sanitizer rewrites every surviving embed to youtube-nocookie.com
  // /embed/<id>, so that shape is checked first and matches the common
  // case. A raw URL in the text is still worth catching: bodies imported
  // from WordPress carry both.
  const embed = html.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/);
  if (embed) return embed[1];

  const link = html.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
  );
  if (link) return link[1];

  return null;
}

/** The thumbnail URL for a video id. */
export function youTubeThumbUrl(videoId: string): string {
  return `${THUMB_HOST}/${videoId}/hqdefault.jpg`;
}

/**
 * The fallback cover for one part, or null if it has no video.
 * `extractYouTubeId` is re-exported through here so a caller that holds a
 * bare URL rather than a body has one import for both.
 */
export function partCoverFallback(body: string | null | undefined): string | null {
  const id = firstVideoIdIn(body);
  return id ? youTubeThumbUrl(id) : null;
}

export { extractYouTubeId };
