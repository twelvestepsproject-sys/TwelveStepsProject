import type { z } from "zod";
import Image from "next/image";
import type { introMediaBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { IntroMediaPlayer } from "./_shared/intro-media-player";

/**
 * §5 block 3 — Intro media (heading + embedded video).
 *
 * Was already a real schema entry (`introMediaBlockDataSchema` /
 * `"intro_media"` in the block-type enum) with no component built yet —
 * confirmed before starting this pass, per the approved plan. Schema
 * change made as part of this task (approved): `video_url` is now
 * nullable, and `thumbnail_media_id` was added, so a genuine
 * "no real video yet" placeholder state is representable in the type
 * system instead of an empty-string sentinel.
 *
 * There is no real YouTube video for this fictional org yet — this is a
 * content gap, flagged in docs/content-needed.md, not filled with an
 * invented video ID (per §3/§5.5's "never fabricate content" rule).
 *
 * States:
 * - `video_url: null` -> placeholder state. Renders the heading and an
 *   inert, visibly-non-interactive poster card (no click affordance,
 *   since there's nothing to play) with a small note. No fake iframe.
 * - `video_url: string` -> has-video state. Renders the poster (resolved
 *   via `db.getMedia()`, same pipeline as the other 4 image-using blocks —
 *   never a hotlinked `i.ytimg.com` thumbnail) with a click-to-play badge.
 *   Client-side click swaps in the real `<iframe>` (privacy-enhanced
 *   `youtube-nocookie.com` domain, no autoplay-on-load) — see
 *   `_shared/intro-media-player.tsx` for that interactive piece, kept as
 *   the only client component in this block for a minimal JS boundary.
 *
 * The circular-ring-with-play-badge visual idea is inspired structurally
 * by the reference screenshots' "play button on a photo" affordance, but
 * executed with this project's own token colors and an original badge
 * shape (no traced graphic, no reference-site colors) — see final report
 * for the explicit confirmation of this usage.
 */
type IntroMediaData = z.infer<typeof introMediaBlockDataSchema>;

export async function IntroMedia({ data }: { data: IntroMediaData }) {
  const thumbnail = data.thumbnail_media_id ? await db.getMedia(data.thumbnail_media_id) : null;

  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{data.heading}</h2>

        {data.video_url ? (
          <IntroMediaPlayer
            videoUrl={data.video_url}
            posterSrc={thumbnail ? mediaUrlFor(thumbnail) : null}
            posterAlt={thumbnail?.alt_he ?? data.heading}
          />
        ) : (
          <div className="flex w-full max-w-2xl flex-col items-center gap-3">
            <div
              className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt"
              role="img"
              aria-label="ממתין לסרטון היכרות"
            >
              <p className="px-6 text-sm text-ink-muted">
                סרטון ההיכרות עדיין לא זמין — התוכן יתווסף בהמשך.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function IntroMediaSkeleton() {
  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="aspect-video w-full max-w-2xl" />
      </div>
    </section>
  );
}
