import type { z } from "zod";
import type { videoTestimonialsBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { Skeleton } from "./skeleton";
import { VideoTestimonialsGrid } from "./_shared/video-testimonials-grid";

/**
 * §5 block 9 — Video testimonials / intro videos. Server Component: the
 * only `db` read is resolving each video's `thumbnail_media_id` via
 * `db.getMedia()` (same pipeline as every other image-using block, never a
 * hotlinked YouTube thumbnail host). The actual click-to-play grid + shared
 * lightbox is `_shared/video-testimonials-grid.tsx` (a client component),
 * mirroring the existing `intro-media.tsx` / `intro-media-player.tsx` split.
 *
 * No real video testimonials exist yet for this fictional org — an empty
 * `videos` array renders nothing (no fabricated placeholder cards), and any
 * fixture entry with a real-looking `video_url` must be flagged as
 * dev/test-only content per docs/content-needed.md, exactly like
 * `intro_media`'s existing flagged entry.
 */
type VideoTestimonialsData = z.infer<typeof videoTestimonialsBlockDataSchema>;

export async function VideoTestimonials({ data }: { data: VideoTestimonialsData }) {
  if (data.videos.length === 0) return null;

  const thumbnails = await Promise.all(
    data.videos.map((v) =>
      v.thumbnail_media_id ? db.getMedia(v.thumbnail_media_id) : Promise.resolve(null),
    ),
  );

  return (
    <VideoTestimonialsGrid heading={data.heading} videos={data.videos} thumbnails={thumbnails} />
  );
}

export function VideoTestimonialsSkeleton() {
  return (
    <section className="bg-surface px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mx-auto mb-8 h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      </div>
    </section>
  );
}
