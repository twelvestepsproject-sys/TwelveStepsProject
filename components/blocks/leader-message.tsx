import type { z } from "zod";
import Image from "next/image";
import type { leaderMessageBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 6 — Leader message (repeatable). One `page_blocks` row per
 * principal — rendered once per instance in the page's block list, ordered
 * by sort_order like any other block.
 *
 * Portrait: `portrait_media_id` resolved via `db.getMedia()` — this is the
 * one `db` read this block makes. `video_url` (an embeddable URL, not a
 * `Media` row) is intentionally NOT rendered here — an embed player is
 * `intro_media`-block territory (§5 #3), out of scope for this pass; both
 * homepage instances currently have `portrait_media_id: null` in the
 * fixtures (a real content gap, not a rendering bug), so no portrait
 * appears live yet even though the resolution path is now wired.
 */
type LeaderMessageData = z.infer<typeof leaderMessageBlockDataSchema>;

export async function LeaderMessage({ data }: { data: LeaderMessageData }) {
  const portrait = data.portrait_media_id ? await db.getMedia(data.portrait_media_id) : null;

  return (
    <section className="bg-surface px-6 py-16">
      <RevealOnScroll className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        {portrait ? (
          // Circular photo-frame-with-ring motif (§ reference-images plan):
          // an original decorative ring built from a padded border in our
          // own primary/accent tokens (no gold token, per approved
          // decision — this uses only primary/accent/surface), not a
          // traced copy of the reference site's ring graphic.
          <div className="rounded-full bg-gradient-to-br from-primary/25 via-accent/20 to-primary/10 p-1.5">
            <div className="rounded-full bg-surface p-1">
              <Image
                src={mediaUrlFor(portrait)}
                alt={portrait.alt_he}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
              />
            </div>
          </div>
        ) : null}
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {data.heading}
        </h2>
        <p className="text-ink-muted">{data.body}</p>
        {data.link ? (
          <a
            href={data.link.href}
            target={data.link.open_in_new_tab ? "_blank" : undefined}
            rel={data.link.open_in_new_tab ? "noreferrer" : undefined}
            className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {data.link.label}
          </a>
        ) : null}
      </RevealOnScroll>
    </section>
  );
}

export function LeaderMessageSkeleton() {
  return (
    <section className="bg-surface px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
      </div>
    </section>
  );
}
